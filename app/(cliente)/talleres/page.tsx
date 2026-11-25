"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch, ApiException } from "@/lib/api";
import type { Tallere, Tela } from "@/types";

export default function TalleresPage() {
  const [talleres, setTalleres] = useState<Tallere[]>([]);
  const [telas, setTelas] = useState<Tela[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTela, setFiltroTela] = useState<string>("todas");

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true);
      setError(null);
      try {
        const [talleresRes, telasRes] = await Promise.all([
          apiFetch<Tallere[]>("/api/Talleres"),
          apiFetch<Tela[]>("/api/telas?pageNumber=1&pageSize=50"),
        ]);
        setTalleres(Array.isArray(talleresRes) ? talleresRes : []);
        setTelas(Array.isArray(telasRes) ? telasRes : []);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(err.message);
        } else {
          setError("No se pudieron cargar los talleres. Revisa la conexión con el servidor.");
        }
      } finally {
        setCargando(false);
      }
    }

    cargarDatos();
  }, []);

  const talleresFiltrados = talleres.filter((t) => {
    const coincideTexto =
      (t.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (t.direccion ?? "").toLowerCase().includes(busqueda.toLowerCase());

    const coincideTela =
      filtroTela === "todas" ||
      t.tallerTelas?.some((tt) =>
        (tt.tela?.nombre ?? "").toLowerCase().includes(filtroTela.toLowerCase())
      );

    return coincideTexto && coincideTela;
  });

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-marron">Talleres de Confección</h1>
          <p className="text-marron-claro text-sm mt-1">
            Encuentra talleres verificados, compara sus telas disponibles y precios por metro.
          </p>
        </div>
        <Link
          href="/disenar"
          className="inline-flex items-center justify-center bg-terracota hover:bg-marron text-crema font-semibold px-5 py-2.5 rounded-xl shadow-xs transition"
        >
          Crear Nuevo Diseño
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-crema-oscuro p-4 rounded-2xl flex flex-col sm:flex-row gap-3 border border-marron-claro/20 shadow-xs">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre de taller o ubicación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron placeholder:text-marron-claro/60 focus:outline-none focus:ring-2 focus:ring-terracota"
          />
        </div>
        <div className="sm:w-64">
          <select
            value={filtroTela}
            onChange={(e) => setFiltroTela(e.target.value)}
            className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
          >
            <option value="todas">Todas las telas</option>
            {telas.map((tela) => (
              <option key={tela.id} value={tela.nombre}>
                {tela.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estado de Carga */}
      {cargando && (
        <div className="text-center py-12 bg-crema-oscuro rounded-2xl border border-marron-claro/20">
          <p className="text-marron-claro text-sm animate-pulse font-medium">
            Cargando directorio de talleres desde el servidor…
          </p>
        </div>
      )}

      {/* Estado de Error */}
      {error && !cargando && (
        <div className="bg-rose-100 border border-rose-300 text-rose-900 px-5 py-4 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Grid de Talleres */}
      {!cargando && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {talleresFiltrados.map((taller) => (
            <div
              key={taller.id}
              className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-xl font-bold text-marron">{taller.nombre}</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                    Verificado
                  </span>
                </div>

                <p className="text-xs text-marron-claro flex items-center gap-1.5 mb-2">
                  Dirección: {taller.direccion || "No especificada"}
                </p>
                <p className="text-xs text-marron-claro flex items-center gap-1.5 mb-4">
                  Teléfono: {taller.telefono || "No registrado"}
                </p>

                <div className="border-t border-marron-claro/15 pt-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-marron mb-2">
                    Telas con las que trabaja y precios:
                  </h4>
                  <div className="space-y-1.5">
                    {taller.tallerTelas && taller.tallerTelas.length > 0 ? (
                      taller.tallerTelas.map((tt) => (
                        <div
                          key={tt.telaId}
                          className="flex items-center justify-between text-xs bg-crema px-3 py-1.5 rounded-lg border border-marron-claro/10"
                        >
                          <span className="font-medium text-marron">
                            {tt.tela?.nombre ?? `Tela #${tt.telaId}`}
                          </span>
                          <span className="font-bold text-terracota">
                            S/ {tt.precioPorMetro.toFixed(2)} /m
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-marron-claro italic">No ha registrado telas aún.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-marron-claro/15 flex items-center gap-2">
                <Link
                  href={`/solicitar-cotizacion?tallerId=${taller.id}`}
                  className="w-full text-center bg-terracota hover:bg-marron text-crema text-sm font-semibold py-2 rounded-xl transition"
                >
                  Solicitar Cotización
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {!cargando && !error && talleresFiltrados.length === 0 && (
        <div className="text-center py-12 bg-crema-oscuro rounded-2xl border border-marron-claro/20">
          <p className="text-marron text-lg font-medium">No se encontraron talleres con esos filtros.</p>
          <button
            onClick={() => {
              setBusqueda("");
              setFiltroTela("todas");
            }}
            className="mt-3 text-sm text-terracota underline font-medium"
          >
            Restablecer búsqueda
          </button>
        </div>
      )}
    </div>
  );
}
