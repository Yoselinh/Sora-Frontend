"use client";

import { useState, useEffect } from "react";
import { apiFetch, ApiException } from "@/lib/api";
import type { PrendaBase, CreatePrendaBaseRequestDto } from "@/types";

interface Paginado<T> {
  items?: T[];
  data?: T[];
}

export default function AdminPrendasPage() {
  const [prendas, setPrendas] = useState<PrendaBase[]>([]);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("Polos & Tops");
  const [descripcion, setDescripcion] = useState("");
  const [modelo3dUrl, setModelo3dUrl] = useState("/models/nuevo.glb");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  async function cargarPrendas() {
    try {
      const res = await apiFetch<Paginado<PrendaBase> | PrendaBase[]>("/api/prendas-base?pageNumber=1&pageSize=50");
      const lista = Array.isArray(res)
        ? res
        : ((res as Paginado<PrendaBase>).items ?? (res as Paginado<PrendaBase>).data ?? []);
      setPrendas(lista);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Error al cargar prendas base.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarPrendas();
  }, []);

  async function handleCrearPrenda(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;

    setGuardando(true);
    try {
      const body: CreatePrendaBaseRequestDto = {
        nombre: nombre.trim(),
        categoria,
        descripcion: descripcion.trim() || undefined,
        modelo3dUrl: modelo3dUrl.trim() || undefined,
      };

      await apiFetch("/api/prendas-base", {
        method: "POST",
        body,
      });

      setMostrarModal(false);
      setNombre("");
      setDescripcion("");
      await cargarPrendas();
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "No se pudo registrar la prenda base.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(id: number) {
    if (!confirm("¿Estás seguro de eliminar esta prenda base?")) return;

    try {
      await apiFetch(`/api/prendas-base/${id}`, { method: "DELETE" });
      setPrendas((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "No se pudo eliminar la prenda base.");
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando prendas base...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-terracota">Aviso</p>
        <p className="text-marron font-semibold">No se pudieron cargar las prendas base</p>
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
          <h1 className="text-3xl font-bold text-marron">Prendas Base del Sistema</h1>
          <p className="text-marron-claro text-sm mt-1">
            Modelos tridimensionales maestros sobre los cuales los clientes diseñan sus colecciones.
          </p>
        </div>
        <button
          onClick={() => setMostrarModal(true)}
          className="inline-flex items-center justify-center bg-terracota hover:bg-marron text-crema font-semibold px-5 py-2.5 rounded-xl shadow-xs transition"
        >
          + Agregar Prenda Base
        </button>
      </div>

      {prendas.length === 0 ? (
        <div className="text-center py-16 bg-crema-oscuro rounded-2xl border border-marron-claro/20">
          <p className="text-marron font-semibold text-lg">No hay prendas base registradas</p>
          <p className="text-marron-claro text-sm mt-1">Agrega una nueva prenda base usando el botón superior.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prendas.map((pb) => (
            <div
              key={pb.id}
              className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-5 flex flex-col justify-between shadow-xs"
            >
              <div>
                <h3 className="text-lg font-bold text-marron">{pb.nombre}</h3>
                <span className="inline-block text-[11px] font-bold text-terracota bg-terracota/10 px-2 py-0.5 rounded-md my-1.5 border border-terracota/20">
                  {pb.categoria ?? "General"}
                </span>
                <p className="text-xs text-marron-claro mt-1">{pb.descripcion ?? "Sin descripción"}</p>
                <p className="text-[10px] font-mono text-marron-claro/70 mt-2 truncate">
                  Asset 3D: {pb.modelo3dUrl ?? "—"}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-marron-claro/15 flex justify-end">
                <button
                  onClick={() => handleEliminar(pb.id)}
                  className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                >
                  Eliminar Prenda
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Prenda Base */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-marron">Añadir Prenda Base</h3>
              <button onClick={() => setMostrarModal(false)} className="text-marron-claro font-bold text-lg">
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCrearPrenda} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
                  Nombre de la Prenda
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Chaqueta Bomber Varsity"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
                  Categoría
                </label>
                <input
                  type="text"
                  list="categorias-list"
                  required
                  placeholder="Ej: Polos & Tops, Camisas, Ropa Deportiva..."
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
                />
                <datalist id="categorias-list">
                  <option value="Polos & Tops" />
                  <option value="Poleras & Abrigos" />
                  <option value="Camisas" />
                  <option value="Pantalones" />
                  <option value="Ropa Deportiva" />
                  <option value="Vestidos & Faldas" />
                  <option value="Ropa de Trabajo" />
                  <option value="Otros" />
                </datalist>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
                  Descripción Técnica del Corte
                </label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Corte holgado con elásticos acanalados..."
                  className="w-full bg-crema border border-marron-claro/30 rounded-xl p-2.5 text-xs text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
                  Ruta del Archivo 3D (.glb / .gltf)
                </label>
                <input
                  type="text"
                  value={modelo3dUrl}
                  onChange={(e) => setModelo3dUrl(e.target.value)}
                  className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-xs font-mono text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
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
                  {guardando ? "Registrando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
