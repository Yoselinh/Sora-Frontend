"use client";

import { useState, useEffect } from "react";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch, ApiException } from "@/lib/api";
import { asList } from "@/lib/apiData";
import { obtenerSesion } from "@/lib/auth";
import type {
  SolicitudCotizacion,
  SolicitudTalla,
  DisenoTela,
  CreateCotizacionRequestDto,
  Tallere,
  Cotizacione,
  Diseno,
  Tela,
  PrendasBase,
} from "@/types";

interface Paginado<T> {
  items?: T[];
  data?: T[];
}

export default function SolicitudesTallerPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCotizacion[]>([]);
  const [taller, setTaller] = useState<Tallere | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudCotizacion | null>(null);

  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario de cotización
  const [precioUnitario, setPrecioUnitario] = useState<number>(30);
  const [plazoDias, setPlazoDias] = useState<number>(15);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const sesion = obtenerSesion();
        const usuarioId = sesion?.usuarioId;

        const [resSols, resTalleres, resDisenos, resDisenoTelas, resTelas, resPrendas, resCotizaciones] = await Promise.all([
          apiFetch<Paginado<SolicitudCotizacion> | SolicitudCotizacion[]>(
            "/api/SolicitudesCotizacion"
          ).catch((err) => {
            // Si el backend responde 404 porque aún no existen solicitudes en la base de datos
            if (err instanceof ApiException && err.status === 404) return [];
            throw err;
          }),
          apiFetch<Paginado<Tallere> | Tallere[]>("/api/Talleres").catch((err) => {
            if (err instanceof ApiException && err.status === 404) return [];
            throw err;
          }),
          apiFetch<Paginado<Diseno> | Diseno[]>("/api/Disenos").catch(() => []),
          apiFetch<Paginado<DisenoTela> | DisenoTela[]>("/api/DisenoTelas").catch(() => []),
          apiFetch<Paginado<Tela> | Tela[]>("/api/telas?pageNumber=1&pageSize=100").catch(() => []),
          apiFetch<Paginado<PrendasBase> | PrendasBase[]>("/api/prendas-base?pageNumber=1&pageSize=100").catch(() => []),
          apiFetch<Paginado<Cotizacione> | Cotizacione[]>("/api/cotizaciones?pageNumber=1&pageSize=100").catch(() => []),
        ]);

        const listaSols = asList(resSols);
        const listaTalleres = asList(resTalleres);
        const disenos = asList(resDisenos);
        const relaciones = asList(resDisenoTelas);
        const telasPorId = new Map(asList(resTelas).map((tela) => [tela.id, tela]));
        const prendasPorId = new Map(asList(resPrendas).map((prenda) => [prenda.id, prenda]));
        const miTaller = usuarioId ? listaTalleres.find((t) => t.usuarioId === usuarioId) : null;
        const solicitudesCotizadas = new Set(
          asList(resCotizaciones)
            .filter((cotizacion) => cotizacion.tallerId === miTaller?.id)
            .map((cotizacion) => cotizacion.solicitudId)
        );

        const solicitudesCompletas = await Promise.all(listaSols.map(async (solicitud) => {
          const resTallas = await apiFetch<Paginado<SolicitudTalla> | SolicitudTalla[]>(
            `/api/SolicitudTallas/solicitud/${solicitud.id}`
          ).catch(() => solicitud.solicitudTallas ?? []);
          const disenoBase = solicitud.diseno ?? disenos.find((diseno) => diseno.id === solicitud.disenoId);
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

          return {
            ...solicitud,
            estado: solicitudesCotizadas.has(solicitud.id) ? "Cotizado" : solicitud.estado,
            diseno,
            solicitudTallas: asList(resTallas),
          };
        }));

        setSolicitudes(solicitudesCompletas);

        if (miTaller) setTaller(miTaller);
      } catch (err) {
        setError(err instanceof ApiException ? err.message : "Error al cargar solicitudes.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  const solicitudesFiltradas = solicitudes.filter((s) => {
    if (filtroEstado === "todos") return true;
    return (s.estado ?? "").toLowerCase() === filtroEstado.toLowerCase();
  });

  const totalPrendasSeleccionadas =
    solicitudSeleccionada?.solicitudTallas?.reduce(
      (a: number, b: SolicitudTalla) => a + (b.cantidad ?? 0),
      0
    ) ?? 0;
  const totalCalculado = totalPrendasSeleccionadas * (precioUnitario || 0);

  async function handleEnviarCotizacion(e: React.FormEvent) {
    e.preventDefault();
    if (!solicitudSeleccionada) return;

    if (!taller) {
      alert("No se encontró el taller asociado a tu cuenta. Revisa tu perfil.");
      return;
    }

    setEnviando(true);
    try {
      const bodyCotizacion: CreateCotizacionRequestDto = {
        solicitudId: solicitudSeleccionada.id,
        tallerId: taller.id,
        precioUnitario,
        total: totalCalculado,
        plazoDias,
        estado: "Pendiente",
      };

      await apiFetch("/api/cotizaciones", {
        method: "POST",
        body: bodyCotizacion,
      });

      setMensajeExito(
        `¡Cotización enviada para la solicitud SOL-${solicitudSeleccionada.id}! Total presupuestado: S/ ${totalCalculado.toFixed(
          2
        )}`
      );

      // Actualizar estado local
      setSolicitudes((prev) =>
        prev.map((s) => (s.id === solicitudSeleccionada.id ? { ...s, estado: "Cotizado" } : s))
      );
      setSolicitudSeleccionada(null);
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "No se pudo enviar la cotización.");
    } finally {
      setEnviando(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-marron">Bandeja de Solicitudes Recibidas</h1>
          <p className="text-marron-claro text-sm mt-1">
            Revisa las especificaciones de los clientes, evalúa la curva de tallas y envía tu presupuesto.
          </p>
        </div>

        {/* Filtros de estado */}
        <div className="flex items-center gap-2">
          {["todos", "Pendiente", "Cotizado", "En confección"].map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                filtroEstado === estado
                  ? "bg-terracota text-crema shadow-xs"
                  : "bg-crema-oscuro text-marron hover:bg-crema border border-marron-claro/20"
              }`}
            >
              {estado}
            </button>
          ))}
        </div>
      </div>

      {mensajeExito && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-sm font-medium">
          {mensajeExito}
        </div>
      )}

      {solicitudesFiltradas.length === 0 ? (
        <div className="text-center py-16 bg-crema-oscuro rounded-2xl border border-marron-claro/20">
          <p className="text-marron font-semibold text-lg">No hay solicitudes en esta sección</p>
          <p className="text-marron-claro text-sm mt-1">
            Las nuevas solicitudes de confección aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solicitudesFiltradas.map((sol) => {
            const totalPrendas =
              sol.solicitudTallas?.reduce((a: number, b: SolicitudTalla) => a + (b.cantidad ?? 0), 0) ?? 0;

            return (
              <div
                key={sol.id}
                className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-marron-claro">SOL-{sol.id}</span>
                    <StatusBadge status={sol.estado} />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-marron">{sol.diseno?.nombre ?? "Diseño"}</h3>
                    <p className="text-xs text-marron-claro">
                      Cliente: <span className="font-semibold text-marron">{sol.cliente?.nombre ?? "Cliente"}</span>
                    </p>
                    <p className="text-xs text-marron-claro">
                      Prenda Base: {sol.diseno?.prendaBase?.nombre ?? "Prenda base"}
                    </p>
                  </div>

                  {/* Telas requeridas */}
                  <div className="bg-crema p-3 rounded-xl border border-marron-claro/15 text-xs">
                    <span className="font-bold text-marron block mb-1 uppercase tracking-wider text-[10px]">
                      Telas solicitadas en el diseño:
                    </span>
                    {sol.diseno?.disenoTelas && sol.diseno.disenoTelas.length > 0 ? (
                      sol.diseno.disenoTelas.map((dt: DisenoTela) => (
                        <div key={dt.id} className="flex justify-between text-marron-claro text-[11px]">
                          <span>{dt.parte}:</span>
                          <span className="font-semibold text-marron">{dt.tela?.nombre ?? "Tela"}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[11px] text-marron-claro italic">No especificadas</span>
                    )}
                  </div>

                  {/* Curva de tallas */}
                  <div className="border-t border-marron-claro/15 pt-2">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-marron uppercase text-[10px]">Curva de Tallas:</span>
                      <span className="font-bold text-terracota">{totalPrendas} prendas en total</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sol.solicitudTallas?.length ? sol.solicitudTallas.map((st: SolicitudTalla) => (
                        <span
                          key={st.talla}
                          className="text-[11px] bg-crema px-2 py-0.5 rounded border border-marron-claro/20 text-marron"
                        >
                          {st.talla}: <strong className="text-terracota">{st.cantidad}</strong>
                        </span>
                      )) : <span className="text-[11px] text-marron-claro italic">No se registraron tallas.</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-marron-claro/15">
                  <button
                    onClick={() => setSolicitudSeleccionada(sol)}
                    className="w-full bg-terracota hover:bg-marron text-crema text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Elaborar Cotización
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Formulario de Elaboración de Cotización */}
      {solicitudSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-marron-claro">
                  SOL-{solicitudSeleccionada.id}
                </span>
                <h2 className="text-xl font-bold text-marron">
                  Cotizar: {solicitudSeleccionada.diseno?.nombre}
                </h2>
                <p className="text-xs text-marron-claro">
                  Volumen total: <strong>{totalPrendasSeleccionadas} prendas</strong>
                </p>
              </div>
              <button
                onClick={() => setSolicitudSeleccionada(null)}
                className="text-marron-claro hover:text-marron font-bold text-xl px-2"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleEnviarCotizacion} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
                  Precio Unitario por Prenda (S/)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(parseFloat(e.target.value) || 0)}
                  className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron font-bold focus:outline-none focus:ring-2 focus:ring-terracota"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
                  Plazo Estimado de Entrega (Días hábiles)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={plazoDias}
                  onChange={(e) => setPlazoDias(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron font-bold focus:outline-none focus:ring-2 focus:ring-terracota"
                />
              </div>

              {/* Resumen Calculado */}
              <div className="bg-crema p-4 rounded-xl border border-marron-claro/20 space-y-1">
                <div className="flex justify-between text-xs text-marron-claro">
                  <span>Prendas solicitadas:</span>
                  <span>{totalPrendasSeleccionadas} unidades</span>
                </div>
                <div className="flex justify-between text-xs text-marron-claro">
                  <span>Precio unitario:</span>
                  <span>S/ {precioUnitario.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-terracota pt-2 border-t border-marron-claro/15">
                  <span>Total Cotización:</span>
                  <span>S/ {totalCalculado.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSolicitudSeleccionada(null)}
                  className="px-4 py-2 rounded-xl border border-marron-claro/30 text-xs font-semibold text-marron hover:bg-crema transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="bg-terracota hover:bg-marron text-crema text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {enviando ? "Enviando..." : "Confirmar y Enviar al Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
