"use client";

import { useState, useEffect } from "react";
import { apiFetch, ApiException } from "@/lib/api";
import { asList } from "@/lib/apiData";
import type { Taller, TallerTela } from "@/types";

interface Paginado<T> {
  items?: T[];
  data?: T[];
}

interface TallerTelaCount {
  tallerId: number;
  count: number;
}

export default function AdminTalleresPage() {
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [telasCount, setTelasCount] = useState<TallerTelaCount[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargarTalleres() {
    try {
      const res = await apiFetch<Paginado<Taller> | Taller[]>("/api/Talleres");
      const lista = Array.isArray(res)
        ? res
        : ((res as Paginado<Taller>).items ?? (res as Paginado<Taller>).data ?? []);
      setTalleres(lista);

      // Cargar conteo real de telas por cada taller desde /api/TallerTelas/taller/{id}
      const conteos = await Promise.all(
        lista.map(async (t) => {
          try {
            const tt = await apiFetch<Paginado<TallerTela> | TallerTela[]>(`/api/TallerTelas/taller/${t.id}`);
            const arr = asList(tt);
            return { tallerId: t.id, count: arr.length };
          } catch {
            return { tallerId: t.id, count: t.tallerTelas?.length ?? 0 };
          }
        })
      );
      setTelasCount(conteos);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Error al cargar talleres.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTalleres();
  }, []);

  async function handleEliminar(id: number) {
    if (!confirm("¿Estás seguro de dar de baja este taller?")) return;

    try {
      await apiFetch(`/api/Talleres/${id}`, { method: "DELETE" });
      setTalleres((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "No se pudo dar de baja el taller.");
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando talleres textiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-terracota">Aviso</p>
        <p className="text-marron font-semibold">No se pudieron cargar los talleres</p>
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
        <h1 className="text-3xl font-bold text-marron">Directorio de Talleres Textiles</h1>
        <p className="text-marron-claro text-sm mt-1">
          Supervisión de talleres de confección asociados a la plataforma y catálogo de telas registrado.
        </p>
      </div>

      {talleres.length === 0 ? (
        <div className="text-center py-16 bg-crema-oscuro rounded-2xl border border-marron-claro/20">
          <p className="text-marron font-semibold text-lg">No hay talleres registrados</p>
          <p className="text-marron-claro text-sm mt-1">Los nuevos talleres se registrarán mediante el portal de registro.</p>
        </div>
      ) : (
        <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-crema border-b border-marron-claro/20 text-marron font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Nombre Comercial</th>
                  <th className="p-4">Dirección</th>
                  <th className="p-4">Teléfono</th>
                  <th className="p-4">Telas Asociadas</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marron-claro/15">
                {talleres.map((t) => (
                  <tr key={t.id} className="hover:bg-crema/60 transition">
                    <td className="p-4 font-mono font-bold text-marron-claro">{t.id}</td>
                    <td className="p-4 font-bold text-marron">{t.nombre}</td>
                    <td className="p-4 text-marron-claro">{t.direccion ?? "Sin dirección registrada"}</td>
                    <td className="p-4 text-marron">{t.telefono ?? "—"}</td>
                    <td className="p-4 font-bold text-terracota">
                      {(telasCount.find((item) => item.tallerId === t.id)?.count ?? t.tallerTelas?.length ?? 0)} telas en catálogo
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Verificado
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleEliminar(t.id)}
                        className="text-rose-700 hover:text-rose-900 font-bold cursor-pointer"
                      >
                        Dar de baja
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
