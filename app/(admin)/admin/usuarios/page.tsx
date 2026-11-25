"use client";

import { useState, useEffect } from "react";
import { apiFetch, ApiException } from "@/lib/api";
import type { Usuario } from "@/types";

interface Paginado<T> {
  items?: T[];
  data?: T[];
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroRol, setFiltroRol] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargarUsuarios() {
    try {
      const res = await apiFetch<Paginado<Usuario> | Usuario[]>("/api/Usuarios");
      const lista = Array.isArray(res)
        ? res
        : ((res as Paginado<Usuario>).items ?? (res as Paginado<Usuario>).data ?? []);
      setUsuarios(lista);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Error al cargar usuarios.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const usuariosFiltrados = usuarios.filter((u) => {
    const rolStr = (typeof u.rol === "object" ? u.rol?.nombre : u.rol) ?? "cliente";
    const coincideRol = filtroRol === "todos" || rolStr.toLowerCase() === filtroRol.toLowerCase();
    const coincideTexto =
      (u.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(busqueda.toLowerCase());
    return coincideRol && coincideTexto;
  });

  async function handleEliminar(id: number) {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;

    try {
      await apiFetch(`/api/Usuarios/${id}`, { method: "DELETE" });
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "No se pudo eliminar el usuario.");
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-terracota">Aviso</p>
        <p className="text-marron font-semibold">No se pudieron cargar los usuarios</p>
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
          <h1 className="text-3xl font-bold text-marron">Gestión de Usuarios</h1>
          <p className="text-marron-claro text-sm mt-1">
            Control de cuentas, asignación de roles y estados de verificación.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-crema-oscuro p-4 rounded-2xl border border-marron-claro/20 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o correo electrónico..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
        />
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="sm:w-48 bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
        >
          <option value="todos">Todos los roles</option>
          <option value="cliente">Clientes</option>
          <option value="taller">Talleres</option>
          <option value="admin">Administradores</option>
        </select>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-crema border-b border-marron-claro/20 text-marron font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Email</th>
                <th className="p-4">Rol Asignado</th>
                <th className="p-4">Fecha de Alta</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-marron-claro/15">
              {usuariosFiltrados.map((u) => {
                const rolStr = typeof u.rol === "object" ? u.rol?.nombre ?? "cliente" : u.rol ?? "cliente";
                return (
                  <tr key={u.id} className="hover:bg-crema/60 transition">
                    <td className="p-4 font-mono font-bold text-marron-claro">{u.id}</td>
                    <td className="p-4 font-bold text-marron">{u.nombre}</td>
                    <td className="p-4 text-marron">{u.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-[10px] border ${
                          rolStr === "admin"
                            ? "bg-purple-100 text-purple-950 border-purple-300"
                            : rolStr === "taller"
                            ? "bg-amber-100 text-amber-950 border-amber-300"
                            : "bg-terracota/15 text-terracota border-terracota/30"
                        }`}
                      >
                        {rolStr}
                      </span>
                    </td>
                    <td className="p-4 text-marron-claro">
                      {u.fechaCreacion ? new Date(u.fechaCreacion).toLocaleDateString() : "Reciente"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleEliminar(u.id)}
                        className="text-rose-700 hover:text-rose-900 font-bold cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
