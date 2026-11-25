"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch, ApiException } from "@/lib/api";
import { asList } from "@/lib/apiData";
import { obtenerSesion } from "@/lib/auth";
import type { SolicitudesCotizacion, SolicitudTalla, Diseno, DisenoTela, Tela, PrendasBase, Cotizacione, Tallere } from "@/types";

interface Paginado<T> { items?: T[]; data?: T[] }

function ofertaDisponible(estado?: string | null) {
  const valor = (estado ?? "").toLowerCase();
  return !["aceptada", "rechazada", "cancelada", "entregada", "finalizada"].some((estadoCerrado) =>
    valor.includes(estadoCerrado)
  );
}

export default function CotizacionesClientePage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudesCotizacion[]>([]);
  const [solicitudActiva, setSolicitudActiva] = useState<SolicitudesCotizacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [aceptando, setAceptando] = useState(false);

  useEffect(() => {
    async function cargar() {
      try {
        const sesion = obtenerSesion();
        const clienteId = sesion?.usuarioId;
        if (!clienteId) throw new Error("No hay sesión activa.");

        const [resSolicitudes, resDisenos, resDisenoTelas, resTelas, resPrendas, resCotizaciones, resTalleres] = await Promise.all([
          apiFetch<Paginado<SolicitudesCotizacion> | SolicitudesCotizacion[]>(`/api/SolicitudesCotizacion/cliente/${clienteId}`),
          apiFetch<Paginado<Diseno> | Diseno[]>("/api/Disenos").catch(() => []),
          apiFetch<Paginado<DisenoTela> | DisenoTela[]>("/api/DisenoTelas").catch(() => []),
          apiFetch<Paginado<Tela> | Tela[]>("/api/telas?pageNumber=1&pageSize=100").catch(() => []),
          apiFetch<Paginado<PrendasBase> | PrendasBase[]>("/api/prendas-base?pageNumber=1&pageSize=100").catch(() => []),
          apiFetch<Paginado<Cotizacione> | Cotizacione[]>("/api/cotizaciones?pageNumber=1&pageSize=100").catch(() => []),
          apiFetch<Paginado<Tallere> | Tallere[]>("/api/Talleres").catch(() => []),
        ]);

        const disenos = asList(resDisenos);
        const relaciones = asList(resDisenoTelas);
        const telasPorId = new Map(asList(resTelas).map((tela) => [tela.id, tela]));
        const prendasPorId = new Map(asList(resPrendas).map((prenda) => [prenda.id, prenda]));
        const talleresPorId = new Map(asList(resTalleres).map((taller) => [taller.id, taller]));
        const ofertasPorSolicitud = new Map<number, Cotizacione[]>();
        for (const cotizacion of asList(resCotizaciones)) {
          const ofertas = ofertasPorSolicitud.get(cotizacion.solicitudId) ?? [];
          ofertas.push({ ...cotizacion, taller: cotizacion.taller ?? talleresPorId.get(cotizacion.tallerId) });
          ofertasPorSolicitud.set(cotizacion.solicitudId, ofertas);
        }

        const lista = await Promise.all(asList(resSolicitudes).map(async (solicitud) => {
          const detalleSolicitud = await apiFetch<SolicitudesCotizacion>(
            `/api/SolicitudesCotizacion/${solicitud.id}`
          ).catch(() => solicitud);
          const solicitudCompleta = { ...solicitud, ...detalleSolicitud };
          const resTallas = await apiFetch<Paginado<SolicitudTalla> | SolicitudTalla[]>(
            `/api/SolicitudTallas/solicitud/${solicitud.id}`
          ).catch(() => solicitudCompleta.solicitudTallas ?? []);
          const disenoBase = solicitudCompleta.diseno ?? disenos.find((diseno) => diseno.id === solicitud.disenoId);
          const relacionesDiseno = disenoBase?.disenoTelas?.length
            ? disenoBase.disenoTelas
            : relaciones.filter((relacion) => relacion.disenoId === solicitud.disenoId);
          const diseno = disenoBase ? {
            ...disenoBase,
            prendaBase: disenoBase.prendaBase ?? prendasPorId.get(disenoBase.prendaBaseId),
            disenoTelas: relacionesDiseno.map((relacion) => ({
              ...relacion,
              tela: relacion.tela ?? telasPorId.get(relacion.telaId),
            })),
          } : undefined;
          const cotizacionesPorId = new Map<number, Cotizacione>();
          for (const oferta of solicitudCompleta.cotizaciones ?? []) {
            cotizacionesPorId.set(oferta.id, {
              ...oferta,
              taller: oferta.taller ?? talleresPorId.get(oferta.tallerId),
            });
          }
          for (const oferta of ofertasPorSolicitud.get(solicitud.id) ?? []) {
            cotizacionesPorId.set(oferta.id, {
              ...cotizacionesPorId.get(oferta.id),
              ...oferta,
              taller: oferta.taller ?? cotizacionesPorId.get(oferta.id)?.taller ?? talleresPorId.get(oferta.tallerId),
            });
          }
          const cotizaciones = [...cotizacionesPorId.values()];
          const hayOfertaAceptada = cotizaciones.some((oferta) => oferta.estado?.toLowerCase() === "aceptada");
          const hayOfertaPendiente = cotizaciones.some((oferta) => ofertaDisponible(oferta.estado));
          const estadoActual = solicitudCompleta.estado ?? "";
          const estaEnSeguimiento = ["confec", "listo", "entreg"].some((parte) =>
            estadoActual.toLowerCase().includes(parte)
          );
          const estado = estaEnSeguimiento
            ? estadoActual
            : hayOfertaAceptada
              ? "En confección"
              : hayOfertaPendiente
                ? "Cotizado"
                : cotizaciones.length > 0
                  ? "Pendiente"
                  : solicitudCompleta.estado;

          return {
            ...solicitudCompleta,
            estado,
            diseno,
            solicitudTallas: asList(resTallas),
            cotizaciones,
          };
        }));

        setSolicitudes(lista);
        if (lista.length > 0) setSolicitudActiva(lista[0]);
      } catch (err) {
        setError(err instanceof ApiException ? err.message : "Error al cargar solicitudes.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  async function handleAceptarCotizacion(solicitudId: number, cotizacionId: number) {
    setAceptando(true);
    setErrorAccion(null);
    try {
      const solicitudActual = solicitudes.find((solicitud) => solicitud.id === solicitudId);
      const cotizacion = solicitudActual?.cotizaciones?.find((oferta) => oferta.id === cotizacionId);
      if (!cotizacion) throw new Error("No se encontró la cotización seleccionada.");

      await apiFetch(`/api/cotizaciones/${cotizacion.id}/accept`, { method: "PUT" });

      // Actualizar estado local
      setSolicitudes((prev) =>
        prev.map((sol) => {
          if (sol.id !== solicitudId) return sol;
          return {
            ...sol,
            estado: "En confección",
            cotizaciones: sol.cotizaciones?.map((cot) =>
              cot.id === cotizacionId ? { ...cot, estado: "Aceptada" } : cot
            ),
          };
        })
      );
      setSolicitudActiva((prev) => {
        if (!prev || prev.id !== solicitudId) return prev;
        return {
          ...prev,
          estado: "En confección",
          cotizaciones: prev.cotizaciones?.map((cot) =>
            cot.id === cotizacionId ? { ...cot, estado: "Aceptada" } : cot
          ),
        };
      });
      setMensajeExito("¡Cotización aprobada! El taller ha recibido la orden y tu pedido pasa a estado 'En confección'.");
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err) {
      setErrorAccion(err instanceof ApiException && err.status === 403
        ? "El servidor rechazó la aceptación (403). Tu sesión no tiene permiso para actualizar esta cotización; el backend debe habilitar esta acción para el rol cliente."
        : err instanceof ApiException ? err.message : err instanceof Error ? err.message : "No se pudo aceptar la cotización.");
    } finally {
      setAceptando(false);
    }
  }

  async function handleRechazarCotizacion(solicitudId: number, cotizacionId: number) {
    setAceptando(true);
    setErrorAccion(null);
    try {
      const solicitud = solicitudes.find((item) => item.id === solicitudId);
      const oferta = solicitud?.cotizaciones?.find((item) => item.id === cotizacionId);
      if (!oferta) throw new Error("No se encontró la cotización seleccionada.");

      await apiFetch(`/api/cotizaciones/${oferta.id}/reject`, { method: "PUT" });

      const cotizaciones = solicitud?.cotizaciones?.map((item) =>
        item.id === cotizacionId ? { ...item, estado: "Rechazada" } : item
      ) ?? [];
      const quedanOfertasActivas = cotizaciones.some((item) => ofertaDisponible(item.estado));
      const actualizarSolicitud = (item: SolicitudesCotizacion): SolicitudesCotizacion => ({
        ...item,
        estado: quedanOfertasActivas ? "Cotizado" : "Pendiente",
        cotizaciones,
      });
      setSolicitudes((prev) => prev.map((item) => item.id === solicitudId ? actualizarSolicitud(item) : item));
      setSolicitudActiva((prev) => prev?.id === solicitudId ? actualizarSolicitud(prev) : prev);
      setMensajeExito("La oferta fue rechazada. Puedes revisar otras ofertas o esperar una nueva.");
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err) {
      setErrorAccion(err instanceof ApiException && err.status === 403
        ? "El servidor rechazó esta acción (403). Tu sesión no tiene permiso para actualizar esta cotización; el backend debe habilitar esta acción para el rol cliente."
        : err instanceof ApiException ? err.message : err instanceof Error ? err.message : "No se pudo rechazar la cotización.");
    } finally {
      setAceptando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando solicitudes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-terracota">Aviso</p>
        <p className="text-marron font-semibold">No se pudieron cargar las solicitudes</p>
        <p className="text-marron-claro text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-2 bg-terracota hover:bg-marron text-crema font-semibold px-5 py-2 rounded-xl transition">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-marron">Mis Solicitudes y Cotizaciones</h1>
          <p className="text-marron-claro text-sm mt-1">
            Compara ofertas de talleres textiles, revisa precios unitarios y aprueba órdenes.
          </p>
        </div>
        <Link
          href="/solicitar-cotizacion"
          className="inline-flex items-center justify-center bg-terracota hover:bg-marron text-crema font-semibold px-5 py-2.5 rounded-xl shadow-xs transition"
        >
          + Nueva Solicitud
        </Link>
      </div>

      {mensajeExito && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-sm font-medium">
          {mensajeExito}
        </div>
      )}

      {errorAccion && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm font-medium">
          {errorAccion}
        </div>
      )}

      {solicitudes.length === 0 ? (
        <div className="text-center py-16 bg-crema-oscuro rounded-2xl border border-marron-claro/20">
          <p className="text-marron font-semibold text-lg">Aún no tienes solicitudes</p>
          <Link href="/solicitar-cotizacion" className="mt-3 inline-block text-sm text-terracota underline font-medium">
            Solicitar cotización
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lista de Solicitudes */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-marron mb-2">
              Solicitudes Realizadas ({solicitudes.length})
            </h2>
            {solicitudes.map((sol) => {
              const esActiva = solicitudActiva?.id === sol.id;
              const totalPrendas = sol.solicitudTallas?.reduce((a, b) => a + b.cantidad, 0) ?? 0;
              const numOfertas = sol.cotizaciones?.length ?? 0;
              return (
                <div
                  key={sol.id}
                  onClick={() => setSolicitudActiva(sol)}
                  className={`p-5 rounded-2xl border cursor-pointer transition ${
                    esActiva
                      ? "bg-crema-oscuro border-terracota shadow-xs ring-2 ring-terracota/20"
                      : "bg-crema-oscuro/60 border-marron-claro/20 hover:bg-crema-oscuro"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-marron-claro">SOL-{sol.id}</span>
                    <StatusBadge status={sol.estado} />
                  </div>
                  <h3 className="text-base font-bold text-marron">{sol.diseno?.nombre ?? "—"}</h3>
                  <p className="text-xs text-marron-claro mt-1">
                    Cantidad: <span className="font-semibold text-marron">{totalPrendas} prendas</span> • {numOfertas} ofertas
                  </p>
                  <p className="text-[11px] text-marron-claro/80 mt-2">
                    Fecha: {sol.fecha ? new Date(sol.fecha).toLocaleDateString() : "Reciente"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detalle y Ofertas */}
          <div className="lg:col-span-7 bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-6 space-y-6 shadow-xs">
            {solicitudActiva ? (
              <>
                <div className="border-b border-marron-claro/15 pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-marron">{solicitudActiva.diseno?.nombre ?? "—"}</h2>
                    <StatusBadge status={solicitudActiva.estado} />
                  </div>
                  <p className="text-xs text-marron-claro mt-1">
                    Prenda Base: {solicitudActiva.diseno?.prendaBase?.nombre ?? "—"}
                  </p>
                  <div className="mt-4 bg-crema p-3 rounded-xl border border-marron-claro/15">
                    <span className="text-xs font-bold text-marron block mb-1.5 uppercase">Curva de tallas requerida:</span>
                    <div className="flex flex-wrap gap-2">
                      {solicitudActiva.solicitudTallas?.length ? solicitudActiva.solicitudTallas.map((st) => (
                        <span key={st.talla} className="text-xs bg-crema-oscuro px-2.5 py-1 rounded-lg border border-marron-claro/20 text-marron font-medium">
                          Talla <span className="font-bold">{st.talla}</span>: {st.cantidad} uds
                        </span>
                      )) : <span className="text-xs text-marron-claro italic">No se registraron tallas.</span>}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-marron mb-3">
                    Cotizaciones Recibidas ({solicitudActiva.cotizaciones?.length ?? 0})
                  </h3>
                  {solicitudActiva.cotizaciones && solicitudActiva.cotizaciones.length > 0 ? (
                    <div className="space-y-4">
                      {solicitudActiva.cotizaciones.map((cot) => (
                        <div key={cot.id} className="bg-crema rounded-xl border border-marron-claro/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm text-marron">{cot.taller?.nombre ?? "Taller"}</span>
                              <StatusBadge status={cot.estado} />
                            </div>
                            <p className="text-xs text-marron-claro">Dirección: {cot.taller?.direccion ?? "—"}</p>
                            <div className="mt-3 flex items-center gap-4 text-xs">
                              <div>
                                <span className="text-marron-claro block">Precio Unitario</span>
                                <span className="font-bold text-marron text-sm">S/ {(cot.precioUnitario ?? 0).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-marron-claro block">Plazo de Entrega</span>
                                <span className="font-bold text-marron text-sm">{cot.plazoDias ?? "—"} días</span>
                              </div>
                              <div>
                                <span className="text-marron-claro block">Total Presupuestado</span>
                                <span className="font-black text-terracota text-base">S/ {(cot.total ?? 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          {!solicitudActiva.cotizaciones?.some((oferta) => (oferta.estado ?? "").toLowerCase() === "aceptada") &&
                            ofertaDisponible(cot.estado) && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAceptarCotizacion(solicitudActiva.id, cot.id)}
                                disabled={aceptando}
                                className="bg-terracota hover:bg-marron text-crema text-xs font-bold px-4 py-2.5 rounded-xl transition whitespace-nowrap disabled:opacity-50"
                              >
                                Aceptar Oferta
                              </button>
                              <button
                                onClick={() => handleRechazarCotizacion(solicitudActiva.id, cot.id)}
                                disabled={aceptando}
                                className="border border-red-300 text-red-800 hover:bg-red-50 text-xs font-bold px-4 py-2.5 rounded-xl transition whitespace-nowrap disabled:opacity-50"
                              >
                                Rechazar
                              </button>
                            </div>
                          )}
                          {(cot.estado ?? "").toLowerCase() === "aceptada" && (
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-300">
                              Oferta Seleccionada
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-marron-claro italic bg-crema rounded-xl border border-marron-claro/15">
                      Esperando respuestas de los talleres textiles...
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-marron-claro italic text-center py-10">
                Selecciona una solicitud para revisar sus ofertas.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
