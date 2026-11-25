"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch, ApiException } from "@/lib/api";
import { asList } from "@/lib/apiData";
import { obtenerSesion } from "@/lib/auth";
import type { SolicitudesCotizacion, SolicitudTalla, Cotizacione, Tallere, Diseno } from "@/types";

interface Paginado<T> { items?: T[]; data?: T[] }

export default function PedidosClientePage() {
  const [pedidos, setPedidos] = useState<SolicitudesCotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const sesion = obtenerSesion();
        const clienteId = sesion?.usuarioId;
        if (!clienteId) throw new Error("No hay sesión activa.");

        const [resSolicitudes, resCotizaciones, resTalleres, resDisenos] = await Promise.all([
          apiFetch<Paginado<SolicitudesCotizacion> | SolicitudesCotizacion[]>(`/api/SolicitudesCotizacion/cliente/${clienteId}`),
          apiFetch<Paginado<Cotizacione> | Cotizacione[]>("/api/cotizaciones?pageNumber=1&pageSize=100").catch(() => []),
          apiFetch<Paginado<Tallere> | Tallere[]>("/api/Talleres").catch(() => []),
          apiFetch<Paginado<Diseno> | Diseno[]>("/api/Disenos").catch(() => []),
        ]);
        const talleresPorId = new Map(asList(resTalleres).map((taller) => [taller.id, taller]));
        const disenos = asList(resDisenos);
        const ofertasPorSolicitud = new Map<number, Cotizacione[]>();
        for (const oferta of asList(resCotizaciones)) {
          const ofertas = ofertasPorSolicitud.get(oferta.solicitudId) ?? [];
          ofertas.push({ ...oferta, taller: oferta.taller ?? talleresPorId.get(oferta.tallerId) });
          ofertasPorSolicitud.set(oferta.solicitudId, ofertas);
        }

        const completas = await Promise.all(asList(resSolicitudes).map(async (solicitud) => {
          const detalle = await apiFetch<SolicitudesCotizacion>(`/api/SolicitudesCotizacion/${solicitud.id}`).catch(() => solicitud);
          const solicitudCompleta = { ...solicitud, ...detalle };
          const [resTallas] = await Promise.all([
            apiFetch<Paginado<SolicitudTalla> | SolicitudTalla[]>(`/api/SolicitudTallas/solicitud/${solicitud.id}`)
              .catch(() => solicitudCompleta.solicitudTallas ?? []),
          ]);
          const ofertas = new Map<number, Cotizacione>();
          for (const oferta of solicitudCompleta.cotizaciones ?? []) {
            ofertas.set(oferta.id, { ...oferta, taller: oferta.taller ?? talleresPorId.get(oferta.tallerId) });
          }
          for (const oferta of ofertasPorSolicitud.get(solicitud.id) ?? []) {
            ofertas.set(oferta.id, {
              ...ofertas.get(oferta.id),
              ...oferta,
              taller: oferta.taller ?? ofertas.get(oferta.id)?.taller ?? talleresPorId.get(oferta.tallerId),
            });
          }
          const diseno = solicitudCompleta.diseno ?? disenos.find((item) => item.id === solicitudCompleta.disenoId);
          const cotizaciones = [...ofertas.values()];
          const estado = solicitudCompleta.estado ?? "";
          const enSeguimiento = ["confec", "listo", "entreg"].some((parte) => estado.toLowerCase().includes(parte));
          return {
            ...solicitudCompleta,
            diseno,
            cotizaciones,
            solicitudTallas: asList(resTallas),
            estado: enSeguimiento
              ? estado
              : cotizaciones.some((oferta) => oferta.estado?.toLowerCase() === "aceptada")
                ? "En confección"
                : estado,
          };
        }));

        setPedidos(completas.filter((solicitud) =>
          ["confec", "listo", "entreg"].some((parte) => (solicitud.estado ?? "").toLowerCase().includes(parte))
        ));
      } catch (err) {
        setError(err instanceof ApiException ? err.message : "Error al cargar pedidos.");
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
        <p className="text-marron-claro text-sm">Cargando pedidos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-terracota">Aviso</p>
        <p className="text-marron font-semibold">No se pudieron cargar los pedidos</p>
        <p className="text-marron-claro text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-2 bg-terracota hover:bg-marron text-crema font-semibold px-5 py-2 rounded-xl transition">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-marron">Seguimiento de Pedidos</h1>
        <p className="text-marron-claro text-sm mt-1">
          Monitorea en tiempo real la producción y entrega de tus prendas confeccionadas.
        </p>
      </div>

      <div className="space-y-4">
        {pedidos.map((pedido) => {
          const totalPrendas = pedido.solicitudTallas?.reduce((a, b) => a + b.cantidad, 0) ?? 0;
          const cotAceptada =
            pedido.cotizaciones?.find((c) => (c.estado ?? "").toLowerCase() === "aceptada") ??
            pedido.cotizaciones?.[0];
          const estadoNormalizado = (pedido.estado ?? "").toLowerCase();
          const etapaActual = estadoNormalizado.includes("entreg")
            ? 2
            : estadoNormalizado.includes("listo")
              ? 1
              : 0;

          return (
            <div key={pedido.id} className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-marron-claro/15 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-marron-claro">ORD-{pedido.id}</span>
                    <StatusBadge status={pedido.estado} />
                  </div>
                  <h3 className="text-xl font-bold text-marron mt-1">{pedido.diseno?.nombre ?? "—"}</h3>
                  <p className="text-xs text-marron-claro">
                    Taller confeccionista:{" "}
                    <span className="font-semibold text-marron">{cotAceptada?.taller?.nombre ?? "—"}</span>
                  </p>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-xs text-marron-claro block">Monto total</span>
                  <span className="text-xl font-black text-terracota">
                    S/ {cotAceptada ? (cotAceptada.total ?? 0).toFixed(2) : "0.00"}
                  </span>
                  <span className="text-[11px] text-marron-claro block">{totalPrendas} unidades</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-marron mb-3">
                  Seguimiento del pedido
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {["En confección", "Listo para entrega", "Entregado"].map((etapa, index) => {
                    const completada = index < etapaActual;
                    const actual = index === etapaActual;
                    return (
                      <div
                        key={etapa}
                        className={`p-3 rounded-xl text-xs border ${
                          completada
                            ? "bg-emerald-100 border-emerald-300"
                            : actual
                              ? "bg-purple-100 border-purple-300"
                              : "bg-crema border-marron-claro/20 opacity-70"
                        }`}
                      >
                        <span className="font-bold text-marron block">{etapa}</span>
                        <span className="text-[11px] text-marron-claro">
                          {actual ? "Estado actual" : completada ? "Completado" : "Pendiente"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Contacto taller */}
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-marron-claro bg-crema p-3 rounded-xl border border-marron-claro/15 gap-2">
                <span>Dirección de retiro: {cotAceptada?.taller?.direccion ?? "—"}</span>
                <span className="font-semibold text-marron">Contacto: {cotAceptada?.taller?.telefono ?? "—"}</span>
              </div>
            </div>
          );
        })}

        {pedidos.length === 0 && (
          <div className="text-center py-12 bg-crema-oscuro rounded-2xl border border-marron-claro/20">
            <p className="text-marron font-medium">Aún no tienes pedidos en confección.</p>
            <Link href="/talleres" className="mt-3 inline-block text-sm text-terracota underline font-medium">
              Explorar talleres y solicitar cotización
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
