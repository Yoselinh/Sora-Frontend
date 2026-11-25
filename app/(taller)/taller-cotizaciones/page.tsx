"use client";

import { useState, useEffect } from "react";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch, ApiException } from "@/lib/api";
import { asList } from "@/lib/apiData";
import { obtenerSesion } from "@/lib/auth";
import type { Cotizacione, Tallere, SolicitudCotizacion, SolicitudTalla, Diseno, PrendasBase } from "@/types";

interface Paginado<T> {
  items?: T[];
  data?: T[];
}

export default function CotizacionesTallerPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacione[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const sesion = obtenerSesion();
        const usuarioId = sesion?.usuarioId;

        const [resTalleres, resCotizaciones, resPrendas] = await Promise.all([
          apiFetch<Paginado<Tallere> | Tallere[]>("/api/Talleres"),
          apiFetch<Paginado<Cotizacione> | Cotizacione[]>("/api/cotizaciones?pageNumber=1&pageSize=100"),
          apiFetch<Paginado<PrendasBase> | PrendasBase[]>("/api/prendas-base?pageNumber=1&pageSize=100").catch(() => []),
        ]);

        const listaTalleres = asList(resTalleres);
        const listaCotizaciones = asList(resCotizaciones);
        const prendasPorId = new Map(asList(resPrendas).map((prenda) => [prenda.id, prenda]));

        const miTaller = usuarioId ? listaTalleres.find((t) => t.usuarioId === usuarioId) : null;
        const propias = miTaller ? listaCotizaciones.filter((c) => c.tallerId === miTaller.id) : [];
        const completas = await Promise.all(propias.map(async (cotizacion) => {
          const solicitud = cotizacion.solicitud ?? await apiFetch<SolicitudCotizacion>(
            `/api/SolicitudesCotizacion/${cotizacion.solicitudId}`
          ).catch(() => undefined);
          if (!solicitud) return cotizacion;

          const [resTallas, resDiseno] = await Promise.all([
            apiFetch<Paginado<SolicitudTalla> | SolicitudTalla[]>(`/api/SolicitudTallas/solicitud/${solicitud.id}`)
              .catch(() => solicitud.solicitudTallas ?? []),
            solicitud.diseno
              ? Promise.resolve(solicitud.diseno)
              : apiFetch<Diseno>(`/api/Disenos/${solicitud.disenoId}`).catch(() => undefined),
          ]);
          const diseno = resDiseno ? {
            ...resDiseno,
            prendaBase: resDiseno.prendaBase ?? prendasPorId.get(resDiseno.prendaBaseId),
          } : undefined;

          return {
            ...cotizacion,
            solicitud: {
              ...solicitud,
              diseno,
              solicitudTallas: asList(resTallas),
            },
          };
        }));
        setCotizaciones(completas);
      } catch (err) {
        setError(err instanceof ApiException ? err.message : "Error al cargar cotizaciones.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando cotizaciones emitidas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-terracota">Aviso</p>
        <p className="text-marron font-semibold">No se pudieron cargar las cotizaciones</p>
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
      <div>
        <h1 className="text-3xl font-bold text-marron">Cotizaciones Emitidas por tu Taller</h1>
        <p className="text-marron-claro text-sm mt-1">
          Historial de presupuestos enviados a clientes, plazos pactados y estado de aceptación.
        </p>
      </div>

      {cotizaciones.length === 0 ? (
        <div className="text-center py-16 bg-crema-oscuro rounded-2xl border border-marron-claro/20">
          <p className="text-marron font-semibold text-lg">Aún no has emitido cotizaciones</p>
          <p className="text-marron-claro text-sm mt-1">
            Revisa la bandeja de solicitudes para enviar presupuestos a clientes.
          </p>
        </div>
      ) : (
        <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-crema border-b border-marron-claro/20 text-marron font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Solicitud / Diseño</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Volumen</th>
                  <th className="p-4">P. Unitario</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Plazo</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marron-claro/15">
                {cotizaciones.map((cot) => {
                  const totalPrendas =
                    cot.solicitud?.solicitudTallas?.reduce((a, b) => a + (b.cantidad ?? 0), 0) ?? 0;

                  return (
                    <tr key={cot.id} className="hover:bg-crema/60 transition">
                      <td className="p-4 font-bold text-marron">
                        <div>{cot.solicitud?.diseno?.nombre ?? `Solicitud #${cot.solicitudId}`}</div>
                        <div className="text-[11px] text-marron-claro font-normal">
                          Prenda: {cot.solicitud?.diseno?.prendaBase?.nombre ?? "—"}
                        </div>
                      </td>
                      <td className="p-4 text-marron">{cot.solicitud?.cliente?.nombre ?? "Cliente"}</td>
                      <td className="p-4 font-semibold text-marron">
                        {totalPrendas > 0 ? `${totalPrendas} prendas` : "—"}
                      </td>
                      <td className="p-4 text-marron font-medium">S/ {(cot.precioUnitario ?? 0).toFixed(2)}</td>
                      <td className="p-4 font-bold text-terracota text-sm">
                        S/ {(cot.total ?? 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-marron font-medium">{cot.plazoDias} días</td>
                      <td className="p-4">
                        <StatusBadge status={cot.estado} />
                      </td>
                      <td className="p-4 text-marron-claro">
                        {cot.fecha ? new Date(cot.fecha).toLocaleDateString() : "Reciente"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
