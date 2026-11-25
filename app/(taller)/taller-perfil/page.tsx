"use client";

import { useState, useEffect } from "react";
import { apiFetch, ApiException } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import type { Tallere, UpdateTallerCommand } from "@/types";

interface Paginado<T> {
  items?: T[];
  data?: T[];
}

export default function PerfilTallerPage() {
  const [taller, setTaller] = useState<Tallere | null>(null);

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const sesion = obtenerSesion();
        const usuarioId = sesion?.usuarioId;

        const res = await apiFetch<Paginado<Tallere> | Tallere[]>("/api/Talleres");
        const lista = Array.isArray(res)
          ? res
          : ((res as Paginado<Tallere>).items ?? (res as Paginado<Tallere>).data ?? []);

        const miTaller = usuarioId ? lista.find((t) => t.usuarioId === usuarioId) : lista[0];

        if (miTaller) {
          setTaller(miTaller);
          setNombre(miTaller.nombre || "");
          setDireccion(miTaller.direccion || "");
          setTelefono(miTaller.telefono || "");
        }
      } catch (err) {
        setError(err instanceof ApiException ? err.message : "Error al cargar perfil del taller.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taller) return;

    setGuardando(true);
    setError(null);

    try {
      const bodyUpdate: UpdateTallerCommand = {
        id: taller.id,
        nombre: nombre.trim(),
        direccion: direccion.trim() || undefined,
        telefono: telefono.trim() || undefined,
      };

      await apiFetch(`/api/Talleres/${taller.id}`, {
        method: "PUT",
        body: bodyUpdate,
      });

      setGuardado(true);
      setTimeout(() => setGuardado(false), 3500);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "No se pudo actualizar el perfil.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando perfil del taller...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-marron">Perfil de tu Taller</h1>
        <p className="text-marron-claro text-sm mt-1">
          Información comercial visible para clientes al momento de solicitar cotizaciones.
        </p>
      </div>

      {guardado && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-sm font-medium">
          ¡Datos del taller actualizados correctamente!
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-6 sm:p-8 space-y-5 shadow-xs">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
            Razón Social / Nombre Comercial
          </label>
          <input
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2.5 text-sm text-marron font-semibold focus:outline-none focus:ring-2 focus:ring-terracota"
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
              Teléfono / WhatsApp de Contacto
            </label>
            <input
              type="text"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
            />
          </div>

  
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
            Dirección Física de la Planta / Taller
          </label>
          <input
            type="text"
            required
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
          />
        </div>



        <div className="pt-4 border-t border-marron-claro/15 flex justify-end">
          <button
            type="submit"
            disabled={guardando || !taller}
            className="bg-terracota hover:bg-marron text-crema font-bold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
