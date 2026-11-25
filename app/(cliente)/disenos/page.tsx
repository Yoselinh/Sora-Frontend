"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch, ApiException } from "@/lib/api";
import { asList } from "@/lib/apiData";
import { obtenerSesion } from "@/lib/auth";
import type { Diseno, DisenoTela, PrendasBase, Tela } from "@/types";

export default function DisenosPage() {
  const [disenos, setDisenos] = useState<Diseno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const sesion = obtenerSesion();
        const clienteId = sesion?.usuarioId;

        const [resDisenos, resRelaciones, resTelas, resPrendas] = await Promise.all([
          apiFetch<Diseno[] | { items?: Diseno[]; data?: Diseno[] }>("/api/Disenos"),
          apiFetch<DisenoTela[] | { items?: DisenoTela[]; data?: DisenoTela[] }>("/api/DisenoTelas").catch(() => []),
          apiFetch<Tela[] | { items?: Tela[]; data?: Tela[] }>("/api/telas?pageNumber=1&pageSize=100").catch(() => []),
          apiFetch<PrendasBase[] | { items?: PrendasBase[]; data?: PrendasBase[] }>("/api/prendas-base?pageNumber=1&pageSize=100").catch(() => []),
        ]);

        const lista = asList(resDisenos);
        const relaciones = asList(resRelaciones);
        const telas = asList(resTelas);
        const prendas = asList(resPrendas);
        const telasPorId = new Map(telas.map((tela) => [tela.id, tela]));
        const prendasPorId = new Map(prendas.map((prenda) => [prenda.id, prenda]));

        // Filtra solo los diseños del cliente actual
        const propios = clienteId
          ? lista.filter((d) => d.clienteId === clienteId)
          : lista;

        setDisenos(propios.map((diseno) => {
          const relacionesExistentes = diseno.disenoTelas?.length
            ? diseno.disenoTelas
            : relaciones.filter((relacion) => relacion.disenoId === diseno.id);

          return {
            ...diseno,
            prendaBase: diseno.prendaBase ?? prendasPorId.get(diseno.prendaBaseId),
            disenoTelas: relacionesExistentes.map((relacion) => ({
              ...relacion,
              tela: relacion.tela ?? telasPorId.get(relacion.telaId),
            })),
          };
        }));
      } catch (err) {
        setError(err instanceof ApiException ? err.message : "Error al cargar diseños.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  async function handleEliminar(diseno: Diseno) {
    if (!window.confirm(`¿Eliminar el diseño "${diseno.nombre}"? Esta acción no se puede deshacer.`)) return;

    setEliminandoId(diseno.id);
    setErrorEliminar(null);
    try {
      await apiFetch(`/api/Disenos/${diseno.id}`, { method: "DELETE" });
      setDisenos((actuales) => actuales.filter((actual) => actual.id !== diseno.id));
    } catch (err) {
      setErrorEliminar(err instanceof ApiException ? err.message : "No se pudo eliminar el diseño.");
    } finally {
      setEliminandoId(null);
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando tus diseños...</p>
      </div>

    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-terracota">Aviso</p>
        <p className="text-marron font-semibold">No se pudieron cargar los diseños</p>
        <p className="text-marron-claro text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 bg-terracota hover:bg-marron text-crema font-semibold px-5 py-2 rounded-xl transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorEliminar && (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorEliminar}
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-marron">Mis Diseños</h1>
          <p className="text-marron-claro text-sm mt-1">
            Gestiona tus prendas personalizadas y envíalas a confección con un clic.
          </p>
        </div>
        <Link
          href="/disenar"
          className="inline-flex items-center justify-center bg-terracota hover:bg-marron text-crema font-semibold px-5 py-2.5 rounded-xl shadow-xs transition"
        >
          + Diseñar Otra Prenda
        </Link>
      </div>

      {disenos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <p className="text-marron font-semibold text-lg">Aún no tienes diseños</p>
          <p className="text-marron-claro text-sm">Crea tu primera prenda personalizada.</p>
          <Link
            href="/disenar"
            className="mt-2 bg-terracota hover:bg-marron text-crema font-semibold px-6 py-2.5 rounded-xl transition"
          >
            Crear mi primer diseño
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {disenos.map((diseno) => {
            let config: { colorCuerpo?: string; colorMangas?: string; colorCuello?: string } = {};
            try {
              if (diseno.configuracionVisor) config = JSON.parse(diseno.configuracionVisor);
            } catch {
              // ignore
            }

            return (
              <div
                key={diseno.id}
                className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition"
              >
                <div>
                  <div className="bg-crema rounded-xl p-4 flex items-center justify-center h-48 border border-marron-claro/10 mb-4">
                    <svg viewBox="0 0 300 320" className="h-full w-auto">
                      <path d="M 60 70 L 10 140 L 45 165 L 85 105 Z" fill={config.colorMangas ?? "#c2603f"} stroke="#4a2f21" strokeWidth="2.5" />
                      <path d="M 240 70 L 290 140 L 255 165 L 215 105 Z" fill={config.colorMangas ?? "#c2603f"} stroke="#4a2f21" strokeWidth="2.5" />
                      <path d="M 85 70 L 215 70 L 225 280 L 75 280 Z" fill={config.colorCuerpo ?? "#e9dcc4"} stroke="#4a2f21" strokeWidth="2.5" />
                      <path d="M 115 70 C 115 95, 185 95, 185 70 Z" fill={config.colorCuello ?? "#4a2f21"} stroke="#4a2f21" strokeWidth="2.5" />
                    </svg>
                  </div>

                  <h3 className="text-lg font-bold text-marron">{diseno.nombre}</h3>
                  <p className="text-xs text-marron-claro mb-3">
                    Prenda Base: {diseno.prendaBase?.nombre ?? "—"}
                  </p>

                  <div className="space-y-1 border-t border-marron-claro/15 pt-3">
                    <h4 className="text-[11px] font-bold text-marron uppercase tracking-wider">
                      Telas Seleccionadas:
                    </h4>
                    {diseno.disenoTelas && diseno.disenoTelas.length > 0 ? (
                      diseno.disenoTelas.map((dt) => (
                        <div key={dt.id} className="text-xs flex justify-between text-marron-claro">
                          <span>• {dt.parte}:</span>
                          <span className="font-medium text-marron">{dt.tela?.nombre ?? "—"}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-marron-claro italic">Sin telas asignadas</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-marron-claro/15 flex items-center gap-2">
                  <Link
                    href={`/solicitar-cotizacion?disenoId=${diseno.id}`}
                    className="flex-1 text-center bg-terracota hover:bg-marron text-crema text-xs font-semibold py-2.5 rounded-xl transition"
                  >
                    Cotizar Producción
                  </Link>
                  <Link
                    href={`/disenar?disenoId=${diseno.id}`}
                    className="px-3 py-2.5 text-xs font-medium text-marron border border-marron-claro/30 rounded-xl hover:bg-crema transition"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleEliminar(diseno)}
                    disabled={eliminandoId === diseno.id}
                    className="px-3 py-2.5 text-xs font-semibold text-red-800 border border-red-300 rounded-xl hover:bg-red-50 transition disabled:opacity-50"
                  >
                    {eliminandoId === diseno.id ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
