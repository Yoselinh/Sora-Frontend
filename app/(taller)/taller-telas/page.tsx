"use client";

import { useState, useEffect } from "react";
import { apiFetch, ApiException } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import type { TallerTela, Tela, Tallere, AddTallerTelaCommand, UpdateTallerTelaCommand, CreateTelaRequestDto } from "@/types";

interface Paginado<T> {
  items?: T[];
  data?: T[];
}

export default function GestionTelasTallerPage() {
  const [taller, setTaller] = useState<Tallere | null>(null);
  const [tallerTelas, setTallerTelas] = useState<TallerTela[]>([]);
  const [catalogoTelas, setCatalogoTelas] = useState<Tela[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para seleccionar tela existente
  const [telaSeleccionadaId, setTelaSeleccionadaId] = useState<number>(0);
  const [precioMetroSeleccionada, setPrecioMetroSeleccionada] = useState<number>(25.0);

  // Estados para añadir tela NUEVA
  const [mostrarModalNueva, setMostrarModalNueva] = useState(false);
  const [nuevoNombreTela, setNuevoNombreTela] = useState("");
  const [nuevaComposicion, setNuevaComposicion] = useState("");
  const [nuevoPrecioMetro, setNuevoPrecioMetro] = useState<number>(20.0);

  const [mensaje, setMensaje] = useState<string | null>(null);

  async function cargarDatos() {
    try {
      const sesion = obtenerSesion();
      const usuarioId = sesion?.usuarioId;

      const [resTalleres, resTelas] = await Promise.all([
        apiFetch<Paginado<Tallere> | Tallere[]>("/api/Talleres"),
        apiFetch<Paginado<Tela> | Tela[]>("/api/telas?pageNumber=1&pageSize=100"),
      ]);

      const listaTalleres = Array.isArray(resTalleres)
        ? resTalleres
        : ((resTalleres as Paginado<Tallere>).items ?? (resTalleres as Paginado<Tallere>).data ?? []);

      const listaTelas = Array.isArray(resTelas)
        ? resTelas
        : ((resTelas as Paginado<Tela>).items ?? (resTelas as Paginado<Tela>).data ?? []);

      setCatalogoTelas(listaTelas);
      if (listaTelas.length > 0) {
        setTelaSeleccionadaId(listaTelas[0].id);
      }

      let miTaller = usuarioId ? listaTalleres.find((t) => t.usuarioId === usuarioId) : null;
      if (!miTaller && listaTalleres.length > 0) {
        miTaller = listaTalleres.find((t) => t.usuario?.email === sesion?.email) ?? listaTalleres[0];
      }

      if (miTaller) {
        setTaller(miTaller);
        // Cargar las telas específicas de este taller (protegiendo contra 404 si aún no tiene telas)
        const resTallerTelas = await apiFetch<Paginado<TallerTela> | TallerTela[]>(
          `/api/TallerTelas/taller/${miTaller.id}`
        ).catch((err) => {
          if (err instanceof ApiException && err.status === 404) return [];
          return [];
        });
        const listaTallerTelas = Array.isArray(resTallerTelas)
          ? resTallerTelas
          : ((resTallerTelas as Paginado<TallerTela>).items ?? (resTallerTelas as Paginado<TallerTela>).data ?? []);
        setTallerTelas(listaTallerTelas);
      }
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Error al cargar información de telas.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function mostrarAlerta(texto: string) {
    setMensaje(texto);
    setTimeout(() => setMensaje(null), 3500);
  }

  // Añadir o actualizar tela existente del catálogo general en el taller
  async function handleAsociarTelaExistente(e: React.FormEvent) {
    e.preventDefault();
    if (!taller) {
      alert("No se encontró el taller asociado.");
      return;
    }

    setGuardando(true);
    try {
      const yaExiste = tallerTelas.some((tt) => tt.telaId === telaSeleccionadaId);

      if (yaExiste) {
        const bodyUpdate: UpdateTallerTelaCommand = {
          tallerId: taller.id,
          telaId: telaSeleccionadaId,
          precioPorMetro: precioMetroSeleccionada,
        };
        await apiFetch(`/api/TallerTelas/${taller.id}/${telaSeleccionadaId}`, {
          method: "PUT",
          body: bodyUpdate,
        });
        mostrarAlerta("Precio por metro actualizado correctamente.");
      } else {
        const bodyAdd: AddTallerTelaCommand = {
          tallerId: taller.id,
          telaId: telaSeleccionadaId,
          precioPorMetro: precioMetroSeleccionada,
        };
        await apiFetch("/api/TallerTelas", {
          method: "POST",
          body: bodyAdd,
        });
        mostrarAlerta("Tela asociada a tu taller exitosamente.");
      }

      // Recargar telas del taller
      const resTallerTelas = await apiFetch<Paginado<TallerTela> | TallerTela[]>(
        `/api/TallerTelas/taller/${taller.id}`
      ).catch((err) => {
        if (err instanceof ApiException && err.status === 404) return [];
        return [];
      });
      const listaTallerTelas = Array.isArray(resTallerTelas)
        ? resTallerTelas
        : ((resTallerTelas as Paginado<TallerTela>).items ?? (resTallerTelas as Paginado<TallerTela>).data ?? []);
      setTallerTelas(listaTallerTelas);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "No se pudo actualizar la tela.");
    } finally {
      setGuardando(false);
    }
  }

  // Registrar tela completamente nueva creada por el taller
  async function handleCrearNuevaTela(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombreTela.trim() || !taller) return;

    setGuardando(true);
    try {
      // 1. Crear la tela en el catálogo general
      const bodyTela: CreateTelaRequestDto = {
        nombre: nuevoNombreTela.trim(),
        composicion: nuevaComposicion.trim() || undefined,
      };
      const nuevaTela = await apiFetch<unknown>("/api/telas", {
        method: "POST",
        body: bodyTela,
      });

      // Extraer el ID de forma robusta (puede venir como número directo, objeto { id }, etc.)
      let nuevaTelaId: number | undefined;
      if (typeof nuevaTela === "number") {
        nuevaTelaId = nuevaTela;
      } else if (typeof nuevaTela === "string" && !isNaN(Number(nuevaTela))) {
        nuevaTelaId = Number(nuevaTela);
      } else if (typeof nuevaTela === "object" && nuevaTela !== null) {
        const obj = nuevaTela as Record<string, unknown>;
        nuevaTelaId = (obj.id ?? obj.telaId ?? (obj.data as Record<string, unknown>)?.id) as number | undefined;
      }

      // Si el backend respondió 200 sin cuerpo con ID, lo buscamos en el catálogo recién actualizado
      if (!nuevaTelaId) {
        const resCat = await apiFetch<Paginado<Tela> | Tela[]>("/api/telas?pageNumber=1&pageSize=100");
        const lista = Array.isArray(resCat) ? resCat : (resCat.items ?? resCat.data ?? []);
        const encontrada = lista.find(
          (t) => t.nombre?.trim().toLowerCase() === nuevoNombreTela.trim().toLowerCase()
        );
        if (encontrada) {
          nuevaTelaId = encontrada.id;
        }
      }

      if (nuevaTelaId) {
        // 2. Asociarla al taller
        const bodyAdd: AddTallerTelaCommand = {
          tallerId: taller.id,
          telaId: nuevaTelaId,
          precioPorMetro: nuevoPrecioMetro,
        };
        await apiFetch("/api/TallerTelas", {
          method: "POST",
          body: bodyAdd,
        });
      }

      setMostrarModalNueva(false);
      setNuevoNombreTela("");
      setNuevaComposicion("");
      setNuevoPrecioMetro(20.0);
      mostrarAlerta(`¡Nueva tela "${nuevoNombreTela}" registrada y añadida a tu catálogo con éxito!`);

      // Recargar catálogo y telas
      await cargarDatos();
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Error al registrar nueva tela.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminarTela(telaId: number) {
    if (!taller) return;
    if (!confirm("¿Deseas retirar esta tela de tu catálogo de confección?")) return;

    try {
      await apiFetch(`/api/TallerTelas/${taller.id}/${telaId}`, {
        method: "DELETE",
      });
      setTallerTelas((prev) => prev.filter((tt) => tt.telaId !== telaId));
      mostrarAlerta("Tela retirada de tu catálogo de confección.");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "No se pudo retirar la tela.");
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando telas del taller...</p>
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
          <h1 className="text-3xl font-bold text-marron">Gestión de Telas de tu Taller</h1>
          <p className="text-marron-claro text-sm mt-1">
            Configura con qué telas confecciona tu taller y tus tarifas por metro para presupuestos automáticos.
          </p>
        </div>
        <button
          onClick={() => setMostrarModalNueva(true)}
          className="inline-flex items-center justify-center bg-terracota hover:bg-marron text-crema font-semibold px-5 py-2.5 rounded-xl shadow-xs transition"
        >
          + Registrar Nueva Tela Propia
        </button>
      </div>

      {mensaje && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-sm font-medium">
          {mensaje}
        </div>
      )}

      {/* Tarjeta para Asociar Tela del Catálogo General */}
      <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-6 shadow-xs">
        <h2 className="text-base font-bold text-marron mb-4 uppercase tracking-wider text-xs">
          Seleccionar tela disponible en el sistema
        </h2>
        <form onSubmit={handleAsociarTelaExistente} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label className="text-xs font-medium text-marron block mb-1">
              Tipo de Tela
            </label>
            <select
              value={telaSeleccionadaId}
              onChange={(e) => setTelaSeleccionadaId(Number(e.target.value))}
              className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
            >
              {catalogoTelas.map((tela) => (
                <option key={tela.id} value={tela.id}>
                  {tela.nombre} {tela.composicion ? `(${tela.composicion})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="text-xs font-medium text-marron block mb-1">
              Tu Precio por Metro (S/)
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={precioMetroSeleccionada}
              onChange={(e) => setPrecioMetroSeleccionada(parseFloat(e.target.value) || 0)}
              className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron font-bold focus:outline-none focus:ring-2 focus:ring-terracota"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={guardando || catalogoTelas.length === 0}
              className="w-full bg-marron hover:bg-terracota text-crema font-bold py-2 rounded-xl text-sm transition disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Agregar / Actualizar"}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Telas con las que Trabaja el Taller */}
      <div>
        <h3 className="text-base font-bold text-marron mb-3">
          Telas con las que trabaja tu taller ({tallerTelas.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tallerTelas.map((tt) => {
            const telaInfo = tt.tela ?? catalogoTelas.find((c) => c.id === tt.telaId);
            return (
              <div
                key={tt.telaId}
                className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-base text-marron">{telaInfo?.nombre ?? "Tela"}</h4>
                    <span className="text-xs font-bold text-terracota bg-terracota/10 px-2.5 py-1 rounded-full border border-terracota/20">
                      S/ {(tt.precioPorMetro ?? 0).toFixed(2)} /m
                    </span>
                  </div>
                  <p className="text-xs text-marron-claro mb-3">
                    Composición: {telaInfo?.composicion || "Fibras textiles"}
                  </p>
                </div>

                <div className="pt-3 border-t border-marron-claro/15 flex items-center justify-between text-xs">
                  <span className="text-emerald-800 font-semibold flex items-center gap-1">
                    ● En stock / disponible
                  </span>
                  <button
                    onClick={() => handleEliminarTela(tt.telaId)}
                    className="text-rose-700 hover:text-rose-900 font-semibold cursor-pointer"
                  >
                    Quitar tela
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {tallerTelas.length === 0 && (
          <div className="text-center py-10 bg-crema-oscuro rounded-2xl border border-marron-claro/20">
            <p className="text-marron text-sm">Aún no has agregado telas con las que confeccionas.</p>
          </div>
        )}
      </div>

      {/* Modal para Crear Nueva Tela */}
      {mostrarModalNueva && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-marron">Registrar Nueva Tela de tu Taller</h3>
              <button
                onClick={() => setMostrarModalNueva(false)}
                className="text-marron-claro hover:text-marron font-bold text-lg"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCrearNuevaTela} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
                  Nombre de la Tela
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Franela Reactiva 30/1 Peinada"
                  value={nuevoNombreTela}
                  onChange={(e) => setNuevoNombreTela(e.target.value)}
                  className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
                  Composición Técnica
                </label>
                <input
                  type="text"
                  placeholder="Ej: 90% Algodón, 10% Poliéster"
                  value={nuevaComposicion}
                  onChange={(e) => setNuevaComposicion(e.target.value)}
                  className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron focus:outline-none focus:ring-2 focus:ring-terracota"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
                  Precio por Metro (S/)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={nuevoPrecioMetro}
                  onChange={(e) => setNuevoPrecioMetro(parseFloat(e.target.value) || 0)}
                  className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron font-bold focus:outline-none focus:ring-2 focus:ring-terracota"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setMostrarModalNueva(false)}
                  className="px-4 py-2 rounded-xl border border-marron-claro/30 text-xs font-semibold text-marron hover:bg-crema"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-terracota hover:bg-marron text-crema text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar Tela"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
