"use client";

import { useState, useEffect } from "react";
import { apiFetch, ApiException } from "@/lib/api";
import type { Tela, CreateTelaRequestDto } from "@/types";

interface Paginado<T> {
  items?: T[];
  data?: T[];
}

export default function AdminTelasPage() {
  const [telas, setTelas] = useState<Tela[]>([]);
  const [nombre, setNombre] = useState("");
  const [composicion, setComposicion] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  async function cargarTelas() {
    try {
      const res = await apiFetch<Paginado<Tela> | Tela[]>("/api/telas?pageNumber=1&pageSize=100");
      const lista = Array.isArray(res)
        ? res
        : ((res as Paginado<Tela>).items ?? (res as Paginado<Tela>).data ?? []);
      setTelas(lista);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Error al cargar catálogo de telas.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTelas();
  }, []);

  async function handleCrearTela(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;

    setGuardando(true);
    try {
      const body: CreateTelaRequestDto = {
        nombre: nombre.trim(),
        composicion: composicion.trim() || undefined,
      };

      await apiFetch("/api/telas", {
        method: "POST",
        body,
      });

      setMostrarModal(false);
      setNombre("");
      setComposicion("");
      await cargarTelas();
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "No se pudo registrar la tela.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(id: number) {
    if (!confirm("¿Estás seguro de eliminar esta tela del catálogo maestro?")) return;

    try {
      await apiFetch(`/api/telas/${id}`, { method: "DELETE" });
      setTelas((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "No se pudo eliminar la tela.");
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando catálogo maestro de telas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-terracota">Aviso</p>
        <p className="text-marron font-semibold">No se pudieron cargar las telas</p>
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
          <h1 className="text-3xl font-bold text-marron">Catálogo Maestro de Telas</h1>
          <p className="text-marron-claro text-sm mt-1">
            Tipos de textiles disponibles a nivel global para que los clientes diseñen y los talleres coticen.
          </p>
        </div>
        <button
          onClick={() => setMostrarModal(true)}
          className="inline-flex items-center justify-center bg-terracota hover:bg-marron text-crema font-semibold px-5 py-2.5 rounded-xl shadow-xs transition"
        >
          + Agregar Tela al Maestro
        </button>
      </div>

      {telas.length === 0 ? (
        <div className="text-center py-16 bg-crema-oscuro rounded-2xl border border-marron-claro/20">
          <p className="text-marron font-semibold text-lg">No hay telas registradas</p>
          <p className="text-marron-claro text-sm mt-1">Agrega una nueva tela usando el botón superior.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {telas.map((tela) => (
            <div
              key={tela.id}
              className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-5 flex flex-col justify-between shadow-xs"
            >
              <div>
                <h3 className="text-base font-bold text-marron">{tela.nombre}</h3>
                <p className="text-xs text-marron-claro mt-1">
                  Composición: <span className="font-medium text-marron">{tela.composicion || "Estándar"}</span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-marron-claro/15 flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono text-marron-claro">ID: {tela.id}</span>
                <button
                  onClick={() => handleEliminar(tela.id)}
                  className="font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Tela Global */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-marron">Nueva Tela en Maestro</h3>
              <button onClick={() => setMostrarModal(false)} className="text-marron-claro font-bold text-lg">
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCrearTela} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
                  Nombre Comercial de la Tela
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Algodón Tangüis 30/1"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
                  Composición Textil
                </label>
                <input
                  type="text"
                  placeholder="Ej: 100% Algodón Peruano"
                  value={composicion}
                  onChange={(e) => setComposicion(e.target.value)}
                  className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="px-4 py-2 rounded-xl border border-marron-claro/30 text-xs font-semibold text-marron hover:bg-crema"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-terracota hover:bg-marron text-crema text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {guardando ? "Registrando..." : "Registrar Tela"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
