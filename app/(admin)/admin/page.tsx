"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { Usuario, Tallere, SolicitudesCotizacion, PrendasBase, Tela } from "@/types";

interface Paginado<T> {
  items?: T[];
  data?: T[];
}

function obtenerLista<T>(res: Paginado<T> | T[] | undefined): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  return res.items ?? res.data ?? [];
}

export default function AdminDashboardPage() {
  const [cargando, setCargando] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [talleres, setTalleres] = useState<Tallere[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudesCotizacion[]>([]);
  const [prendas, setPrendas] = useState<PrendasBase[]>([]);
  const [telas, setTelas] = useState<Tela[]>([]);

  useEffect(() => {
    async function cargar() {
      try {
        const [resUsers, resTalls, resSols, resPrendas, resTelas] = await Promise.all([
          apiFetch<Paginado<Usuario> | Usuario[]>("/api/Usuarios").catch(() => []),
          apiFetch<Paginado<Tallere> | Tallere[]>("/api/Talleres").catch(() => []),
          apiFetch<Paginado<SolicitudesCotizacion> | SolicitudesCotizacion[]>(
            "/api/SolicitudesCotizacion"
          ).catch(() => []),
          apiFetch<Paginado<PrendasBase> | PrendasBase[]>(
            "/api/prendas-base?pageNumber=1&pageSize=50"
          ).catch(() => []),
          apiFetch<Paginado<Tela> | Tela[]>("/api/telas?pageNumber=1&pageSize=50").catch(() => []),
        ]);

        setUsuarios(obtenerLista(resUsers));
        setTalleres(obtenerLista(resTalls));
        setSolicitudes(obtenerLista(resSols));
        setPrendas(obtenerLista(resPrendas));
        setTelas(obtenerLista(resTelas));
      } catch {
        // Fallback silencioso si falla alguna carga secundaria
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  const clientesCount = usuarios.filter((u) => {
    const r = typeof u.rol === "object" ? u.rol?.nombre : u.rol;
    return (r ?? "").toLowerCase() === "cliente";
  }).length;
  const talleresUserCount = usuarios.filter((u) => {
    const r = typeof u.rol === "object" ? u.rol?.nombre : u.rol;
    return (r ?? "").toLowerCase() === "taller";
  }).length;

  const metricas = [
    {
      label: "Usuarios Registrados",
      valor: usuarios.length,
      detalle: `${clientesCount} clientes, ${talleresUserCount} talleres`,
      icon: "US",
      link: "/admin/usuarios",
    },
    {
      label: "Talleres Activos",
      valor: talleres.length,
      detalle: "Verificados en plataforma",
      icon: "TA",
      link: "/admin/talleres",
    },
    {
      label: "Solicitudes de Producción",
      valor: solicitudes.length,
      detalle: "Órdenes y cotizaciones",
      icon: "SO",
      link: "/admin/usuarios",
    },
    {
      label: "Prendas Base en Catálogo",
      valor: prendas.length,
      detalle: "Modelos 3D maestros",
      icon: "PB",
      link: "/admin/prendas",
    },
    {
      label: "Telas en Maestro Global",
      valor: telas.length,
      detalle: "Textiles registrados",
      icon: "TE",
      link: "/admin/telas",
    },
  ];

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando panel de administración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-marron">Panel de Administración Global</h1>
        <p className="text-marron-claro text-sm mt-1">
          Supervisión de métricas, catálogos maestros y usuarios de la plataforma SORA.
        </p>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {metricas.map((m) => (
          <Link
            key={m.label}
            href={m.link}
            className="bg-crema-oscuro p-6 rounded-2xl border border-marron-claro/20 shadow-xs hover:shadow-md transition block group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-terracota/15 bg-terracota/10 text-xs font-bold tracking-wide text-terracota">{m.icon}</span>
              <span className="text-2xl font-black text-terracota group-hover:scale-105 transition">
                {m.valor}
              </span>
            </div>
            <h3 className="font-bold text-sm text-marron">{m.label}</h3>
            <p className="text-xs text-marron-claro mt-1">{m.detalle}</p>
          </Link>
        ))}
      </div>

      {/* Sección de Actividad Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solicitudes de Cotización Recientes */}
        <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-6 shadow-xs">
          <h3 className="text-base font-bold text-marron mb-4 uppercase tracking-wider text-xs">
            Últimas Solicitudes en Plataforma
          </h3>
          {solicitudes.length === 0 ? (
            <p className="text-xs text-marron-claro py-4 italic text-center">No hay solicitudes recientes</p>
          ) : (
            <div className="space-y-3">
              {solicitudes.slice(0, 5).map((sol) => (
                <div
                  key={sol.id}
                  className="bg-crema p-3.5 rounded-xl border border-marron-claro/15 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-sm text-marron block">
                      {sol.diseno?.nombre ?? `Solicitud #${sol.id}`}
                    </span>
                    <span className="text-xs text-marron-claro">
                      Cliente: {sol.cliente?.nombre ?? "Cliente"} • {sol.diseno?.prendaBase?.nombre ?? "Prenda base"}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                    {sol.estado ?? "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Talleres Registrados */}
        <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-6 shadow-xs">
          <h3 className="text-base font-bold text-marron mb-4 uppercase tracking-wider text-xs">
            Talleres Registrados
          </h3>
          {talleres.length === 0 ? (
            <p className="text-xs text-marron-claro py-4 italic text-center">No hay talleres registrados</p>
          ) : (
            <div className="space-y-3">
              {talleres.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="bg-crema p-3.5 rounded-xl border border-marron-claro/15 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-sm text-marron block">{t.nombre}</span>
                    <span className="text-xs text-marron-claro">Dirección: {t.direccion ?? "Sin dirección"}</span>
                  </div>
                  <span className="text-xs font-bold text-terracota">
                    {t.tallerTelas?.length ?? 0} telas ofrecidas
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
