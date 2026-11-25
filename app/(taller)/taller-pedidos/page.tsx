"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch, ApiException } from "@/lib/api";
import { asList } from "@/lib/apiData";
import { obtenerSesion } from "@/lib/auth";
import type { Cotizacione, SolicitudCotizacion, SolicitudTalla, Tallere, Usuario } from "@/types";

interface Paginado<T> { items?: T[]; data?: T[] }
interface PedidoTaller {
  solicitud: SolicitudCotizacion;
  cotizacion: Cotizacione;
}

export default function PedidosTallerPage() {
  const [pedidos, setPedidos] = useState<PedidoTaller[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const usuarioId = obtenerSesion()?.usuarioId;
        if (!usuarioId) throw new Error("No hay sesión activa.");

        const [resTalleres, resSolicitudes, resCotizaciones] = await Promise.all([
          apiFetch<Paginado<Tallere> | Tallere[]>("/api/Talleres"),
          apiFetch<Paginado<SolicitudCotizacion> | SolicitudCotizacion[]>("/api/SolicitudesCotizacion"),
          apiFetch<Paginado<Cotizacione> | Cotizacione[]>("/api/cotizaciones?pageNumber=1&pageSize=100"),
        ]);
        const miTaller = asList(resTalleres).find((taller) => taller.usuarioId === usuarioId);
        if (!miTaller) throw new Error("No se encontró el taller asociado a esta cuenta.");

        const solicitudesPorId = new Map(asList(resSolicitudes).map((solicitud) => [solicitud.id, solicitud]));
        const ofertasAceptadas = asList(resCotizaciones).filter((cotizacion) =>
          cotizacion.tallerId === miTaller.id && cotizacion.estado?.toLowerCase() === "aceptada"
        );
        const pedidosCargados = await Promise.all(ofertasAceptadas.map(async (cotizacion) => {
          const solicitud = solicitudesPorId.get(cotizacion.solicitudId) ?? await apiFetch<SolicitudCotizacion>(
            `/api/SolicitudesCotizacion/${cotizacion.solicitudId}`
          );
          const [resTallas, cliente] = await Promise.all([
            apiFetch<Paginado<SolicitudTalla> | SolicitudTalla[]>(
              `/api/SolicitudTallas/solicitud/${solicitud.id}`
            ).catch(() => solicitud.solicitudTallas ?? []),
            solicitud.cliente?.email
              ? Promise.resolve(solicitud.cliente)
              : apiFetch<Usuario>(`/api/Usuarios/${solicitud.clienteId}`).catch(() => solicitud.cliente ?? null),
          ]);
          return {
            solicitud: {
              ...solicitud,
              cliente,
              solicitudTallas: asList(resTallas),
              estado: cotizacion.estado ?? solicitud.estado,
            },
            cotizacion,
          };
        }));

        setPedidos(pedidosCargados);
      } catch (err) {
        setError(err instanceof ApiException ? err.message : "No se pudieron cargar los pedidos del taller.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  if (cargando) return <p className="py-16 text-center text-sm text-marron-claro">Cargando pedidos aceptados...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-marron">Pedidos Aceptados</h1>
        <p className="mt-1 text-sm text-marron-claro">Consulta las cotizaciones aceptadas por tus clientes.</p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {pedidos.length === 0 ? (
        <div className="rounded-2xl border border-marron-claro/20 bg-crema-oscuro py-16 text-center">
          <p className="font-semibold text-marron">Aún no tienes pedidos aceptados.</p>
          <p className="mt-1 text-sm text-marron-claro">Cuando un cliente acepte una de tus cotizaciones, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map(({ solicitud, cotizacion }) => {
            const total = solicitud.solicitudTallas?.reduce((suma, talla) => suma + talla.cantidad, 0) ?? 0;
            return (
              <article key={solicitud.id} className="space-y-4 rounded-2xl border border-marron-claro/20 bg-crema-oscuro p-5 shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-marron-claro">SOL-{solicitud.id}</span>
                      <StatusBadge status={solicitud.estado} />
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-marron">{solicitud.diseno?.nombre ?? `Diseño #${solicitud.disenoId}`}</h2>
                    <p className="text-xs text-marron-claro">Cliente: {solicitud.cliente?.nombre ?? `Cliente #${solicitud.clienteId}`}</p>
                    <p className="text-xs text-marron-claro">
                      Correo: {solicitud.cliente?.email ? (
                        <a className="font-medium text-terracota underline" href={`mailto:${solicitud.cliente.email}`}>
                          {solicitud.cliente.email}
                        </a>
                      ) : "No disponible"}
                    </p>
                    <p className="text-xs text-marron-claro">Prenda: {solicitud.diseno?.prendaBase?.nombre ?? "—"}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-marron-claro">{total} prendas · entrega en {cotizacion.plazoDias} días</p>
                    <p className="text-lg font-black text-terracota">S/ {cotizacion.total.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {solicitud.solicitudTallas?.map((talla) => (
                    <span key={`${solicitud.id}-${talla.id}`} className="rounded-lg border border-marron-claro/20 bg-crema px-2.5 py-1 text-xs text-marron">
                      {talla.talla}: <strong>{talla.cantidad}</strong>
                    </span>
                  ))}
                </div>

              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
