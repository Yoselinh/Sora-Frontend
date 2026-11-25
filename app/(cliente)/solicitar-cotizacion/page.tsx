"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiException } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import type { Diseno, AddSolicitudCotizacionCommand, AddSolicitudTallaCommand } from "@/types";

interface Paginado<T> { items?: T[]; data?: T[] }

const TALLAS_DEFAULT: Record<string, number> = { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 };

export default function SolicitarCotizacionPage() {
  return (
    <Suspense fallback={<p className="text-marron-claro text-sm">Cargando solicitud de cotización...</p>}>
      <SolicitarCotizacionForm />
    </Suspense>
  );
}

function SolicitarCotizacionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const disenoParam = searchParams.get("disenoId");

  // ─── Datos del backend ───────────────────────────────────────────────────
  const [disenos, setDisenos] = useState<Diseno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // ─── Formulario ──────────────────────────────────────────────────────────
  const [disenoSeleccionado, setDisenoSeleccionado] = useState<number | null>(
    disenoParam ? Number(disenoParam) : null
  );
  const [tallas, setTallas] = useState<Record<string, number>>(TALLAS_DEFAULT);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const totalPrendas = Object.values(tallas).reduce((acc, v) => acc + (Number(v) || 0), 0);

  // ─── Carga mis diseños ───────────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      try {
        const sesion = obtenerSesion();
        const clienteId = sesion?.usuarioId;

        const res = await apiFetch<Paginado<Diseno> | Diseno[]>(
          "/api/Disenos"
        );
        const lista: Diseno[] = Array.isArray(res)
          ? res
          : ((res as Paginado<Diseno>).items ?? (res as Paginado<Diseno>).data ?? []);

        const propios = clienteId ? lista.filter((d) => d.clienteId === clienteId) : lista;
        setDisenos(propios);

        // Si vino disenoId por URL y existe en los propios, seleccionarlo; si no, el primero
        if (disenoParam && propios.find((d) => d.id === Number(disenoParam))) {
          setDisenoSeleccionado(Number(disenoParam));
        } else if (propios.length > 0 && !disenoSeleccionado) {
          setDisenoSeleccionado(propios[0].id);
        }
      } catch (err) {
        setErrorCarga(err instanceof ApiException ? err.message : "Error al cargar diseños.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCantidadChange(talla: string, valor: string) {
    const num = Math.max(0, parseInt(valor, 10) || 0);
    setTallas((prev) => ({ ...prev, [talla]: num }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (totalPrendas <= 0) {
      setErrorEnvio("Por favor ingresa al menos una prenda en la curva de tallas.");
      return;
    }
    if (!disenoSeleccionado) {
      setErrorEnvio("Selecciona un diseño.");
      return;
    }

    const sesion = obtenerSesion();
    if (!sesion) return;

    setEnviando(true);
    setErrorEnvio(null);

    try {
      // 1. Crear solicitud de cotización
      const bodySolicitud: AddSolicitudCotizacionCommand = {
        clienteId: sesion.usuarioId ?? 0,
        disenoId: disenoSeleccionado,
      };
      const solicitud = await apiFetch<{ id: number }>("/api/SolicitudesCotizacion", {
        method: "POST",
        body: bodySolicitud,
      });

      const solicitudId = solicitud?.id;
      if (!solicitudId) throw new Error("El servidor no devolvió el ID de la solicitud.");

      // 2. Crear solicitud-tallas para cada talla con cantidad > 0
      const entradas = Object.entries(tallas).filter(([, cant]) => cant > 0);
      await Promise.all(
        entradas.map(([talla, cantidad]) => {
          const bodyTalla: AddSolicitudTallaCommand = { solicitudId, talla, cantidad };
          return apiFetch("/api/SolicitudTallas", { method: "POST", body: bodyTalla });
        })
      );

      setEnviado(true);
      setTimeout(() => router.push("/cotizaciones"), 1200);
    } catch (err) {
      setErrorEnvio(err instanceof ApiException ? err.message : "No se pudo enviar la solicitud.");
    } finally {
      setEnviando(false);
    }
  }

  // ─── Render: cargando ────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando tus diseños...</p>
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-terracota">Aviso</p>
        <p className="text-marron font-semibold">No se pudieron cargar los diseños</p>
        <p className="text-marron-claro text-sm">{errorCarga}</p>
        <button onClick={() => window.location.reload()} className="mt-2 bg-terracota hover:bg-marron text-crema font-semibold px-5 py-2 rounded-xl transition">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-marron">Solicitar Cotización de Confección</h1>
          <p className="text-marron-claro text-sm mt-1">
            Indica las cantidades deseadas por talla para que los talleres calculen su presupuesto.
          </p>
        </div>
        <Link href="/cotizaciones" className="text-xs text-marron font-medium underline">
          Ver mis cotizaciones
        </Link>
      </div>

      {enviado && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-sm font-medium">
          ¡Solicitud enviada a los talleres textiles con éxito! Redirigiendo...
        </div>
      )}

      {errorEnvio && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl text-sm font-medium">
          {errorEnvio}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Paso 1: Elegir Diseño */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-2">
            1. Selecciona el Diseño a Confeccionar
          </label>
          {disenos.length === 0 ? (
            <div className="text-sm text-marron-claro py-4 text-center">
              No tienes diseños aún.{" "}
              <Link href="/disenar" className="text-terracota font-semibold underline">
                Crea uno aquí
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {disenos.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setDisenoSeleccionado(d.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    disenoSeleccionado === d.id
                      ? "border-terracota bg-crema ring-2 ring-terracota/30"
                      : "border-marron-claro/20 bg-crema/60 hover:bg-crema"
                  }`}
                >
                  <div className="font-bold text-sm text-marron">{d.nombre}</div>
                  <div className="text-xs text-marron-claro mt-0.5">
                    Prenda: {d.prendaBase?.nombre ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paso 2: Curva de Tallas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-marron">
              2. Curva de Tallas y Cantidades
            </label>
            <span className="text-xs font-bold text-terracota bg-terracota/10 px-3 py-1 rounded-full border border-terracota/20">
              Total: {totalPrendas} prendas
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Object.entries(tallas).map(([talla, cantidad]) => (
              <div key={talla} className="bg-crema p-3 rounded-xl border border-marron-claro/20 text-center">
                <span className="block text-xs font-black text-marron mb-1">{talla}</span>
                <input
                  type="number"
                  min="0"
                  value={cantidad}
                  onChange={(e) => handleCantidadChange(talla, e.target.value)}
                  className="w-full bg-crema-oscuro border border-marron-claro/30 rounded-lg text-center py-1.5 text-sm font-bold text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Botón de Envío */}
        <div className="pt-4 border-t border-marron-claro/15 flex items-center justify-end gap-3">
          <Link
            href="/disenos"
            className="px-5 py-2.5 rounded-xl border border-marron-claro/30 text-sm font-semibold text-marron hover:bg-crema transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={enviando || totalPrendas === 0 || disenos.length === 0}
            className="bg-terracota hover:bg-marron text-crema font-bold px-7 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {enviando ? "Enviando Solicitud..." : "Enviar a Cotizar"}
          </button>
        </div>
      </form>
    </div>
  );
}
