"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiException } from "@/lib/api";
import { asList } from "@/lib/apiData";
import { obtenerSesion } from "@/lib/auth";
import type { PrendasBase, Tela, AddDisenoCommand, AddDisenoTelaCommand, UpdateDisenoCommand, UpdateDisenoTelaCommand, Diseno, DisenoTela } from "@/types";

// ─── Tipos de respuesta paginada ───────────────────────────────────────────
interface Paginado<T> {
  items?: T[];
  data?: T[];
}

export default function DisenarPage() {
  return (
    <Suspense fallback={<p className="text-marron-claro text-sm">Cargando estudio de diseño...</p>}>
      <DisenarEditor />
    </Suspense>
  );
}

function DisenarEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const disenoParam = searchParams.get("disenoId");
  const disenoId = disenoParam && Number.isInteger(Number(disenoParam)) && Number(disenoParam) > 0
    ? Number(disenoParam)
    : null;

  // ─── Datos del backend ───────────────────────────────────────────────────
  const [prendasBase, setPrendasBase] = useState<PrendasBase[]>([]);
  const [telas, setTelas] = useState<Tela[]>([]);
  const [relacionesDiseno, setRelacionesDiseno] = useState<DisenoTela[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // ─── Selecciones ────────────────────────────────────────────────────────
  const [prendaSeleccionada, setPrendaSeleccionada] = useState<PrendasBase | null>(null);
  const [nombreDiseno, setNombreDiseno] = useState("Mi Diseño Personalizado");

  // Colores por parte
  const [colorCuerpo, setColorCuerpo] = useState("#e9dcc4");
  const [colorMangas, setColorMangas] = useState("#c2603f");
  const [colorCuello, setColorCuello] = useState("#4a2f21");

  // IDs de tela por parte (se inicializan al cargar telas)
  const [telaCuerpoId, setTelaCuerpoId] = useState<number>(0);
  const [telaMangasId, setTelaMangasId] = useState<number>(0);
  const [telaCuelloId, setTelaCuelloId] = useState<number>(0);

  // ─── UI de guardado ──────────────────────────────────────────────────────
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  // ─── Carga inicial ───────────────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      try {
        const [resPrendas, resTelas] = await Promise.all([
          apiFetch<Paginado<PrendasBase> | PrendasBase[]>("/api/prendas-base?pageNumber=1&pageSize=50"),
          apiFetch<Paginado<Tela> | Tela[]>("/api/telas?pageNumber=1&pageSize=50"),
        ]);

        // El backend puede devolver lista directa o { items: [...] }
        const listaPrendas: PrendasBase[] = Array.isArray(resPrendas)
          ? resPrendas
          : ((resPrendas as Paginado<PrendasBase>).items ?? (resPrendas as Paginado<PrendasBase>).data ?? []);

        const listaTelas: Tela[] = Array.isArray(resTelas)
          ? resTelas
          : ((resTelas as Paginado<Tela>).items ?? (resTelas as Paginado<Tela>).data ?? []);

        setPrendasBase(listaPrendas);
        setTelas(listaTelas);

        if (disenoId) {
          const [diseno, resRelaciones] = await Promise.all([
            apiFetch<Diseno>(`/api/Disenos/${disenoId}`),
            apiFetch<Paginado<DisenoTela> | DisenoTela[]>("/api/DisenoTelas"),
          ]);
          const relaciones = asList(resRelaciones).filter((relacion) => relacion.disenoId === disenoId);
          let configuracion: { colorCuerpo?: string; colorMangas?: string; colorCuello?: string } = {};
          try {
            configuracion = JSON.parse(diseno.configuracionVisor ?? "{}");
          } catch {
            configuracion = {};
          }

          setNombreDiseno(diseno.nombre ?? "Mi Diseño Personalizado");
          setPrendaSeleccionada(
            listaPrendas.find((prenda) => prenda.id === diseno.prendaBaseId) ?? diseno.prendaBase ?? null
          );
          if (configuracion.colorCuerpo) setColorCuerpo(configuracion.colorCuerpo);
          if (configuracion.colorMangas) setColorMangas(configuracion.colorMangas);
          if (configuracion.colorCuello) setColorCuello(configuracion.colorCuello);
          setRelacionesDiseno(relaciones);
          const relacionTela = (parte: string) =>
            relaciones.find((relacion) => (relacion.parte ?? "").toLowerCase() === parte.toLowerCase())?.telaId;
          const cuerpoId = relacionTela("Cuerpo");
          const mangasId = relacionTela("Mangas");
          const cuelloId = relacionTela("Cuello");
          const primerTelaId = listaTelas[0]?.id ?? 0;
          setTelaCuerpoId(cuerpoId ?? primerTelaId);
          setTelaMangasId(mangasId ?? primerTelaId);
          setTelaCuelloId(cuelloId ?? primerTelaId);
        } else if (listaPrendas.length > 0) {
          setPrendaSeleccionada(listaPrendas[0]);
        }
        if (listaTelas.length > 0) {
          const primerTelaId = listaTelas[0].id ?? 0;
          if (!disenoId) {
            setTelaCuerpoId(primerTelaId);
            setTelaMangasId(primerTelaId);
            setTelaCuelloId(primerTelaId);
          }
        }
      } catch (err) {
        setErrorCarga(err instanceof ApiException ? err.message : "Error al cargar datos.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [disenoId]);

  // ─── Guardar diseño en el backend ────────────────────────────────────────
  async function handleGuardar() {
    if (!prendaSeleccionada) return;
    const sesion = obtenerSesion();
    if (!sesion) return;

    setGuardando(true);
    setErrorGuardar(null);

    try {
      const configuracionVisor = JSON.stringify({ colorCuerpo, colorMangas, colorCuello });
      const partes: AddDisenoTelaCommand[] = [
        { disenoId: disenoId ?? 0, telaId: telaCuerpoId, parte: "Cuerpo" },
        { disenoId: disenoId ?? 0, telaId: telaMangasId, parte: "Mangas" },
        { disenoId: disenoId ?? 0, telaId: telaCuelloId, parte: "Cuello" },
      ];

      if (disenoId) {
        const bodyDiseno: UpdateDisenoCommand = {
          id: disenoId,
          clienteId: sesion.usuarioId ?? 0,
          prendaBaseId: prendaSeleccionada.id ?? 0,
          nombre: nombreDiseno.trim() || "Mi Diseño",
          configuracionVisor,
        };
        await apiFetch(`/api/Disenos/${disenoId}`, { method: "PUT", body: bodyDiseno });

        await Promise.all(partes.map((parte) => {
          const actual = relacionesDiseno.find(
            (relacion) => (relacion.parte ?? "").toLowerCase() === (parte.parte ?? "").toLowerCase()
          );
          if (actual) {
            const bodyRelacion: UpdateDisenoTelaCommand = { ...parte, id: actual.id, disenoId };
            return apiFetch(`/api/DisenoTelas/${actual.id}`, { method: "PUT", body: bodyRelacion });
          }
          return apiFetch("/api/DisenoTelas", { method: "POST", body: { ...parte, disenoId } });
        }));
      } else {
        const bodyDiseno: AddDisenoCommand = {
          clienteId: sesion.usuarioId ?? 0,
          prendaBaseId: prendaSeleccionada.id ?? 0,
          nombre: nombreDiseno.trim() || "Mi Diseño",
          configuracionVisor,
        };
        const diseno = await apiFetch<{ id: number }>("/api/Disenos", { method: "POST", body: bodyDiseno });
        const nuevoDisenoId = diseno?.id;
        if (!nuevoDisenoId) throw new Error("El servidor no devolvió el ID del diseño.");
        await Promise.all(partes.map((parte) =>
          apiFetch("/api/DisenoTelas", { method: "POST", body: { ...parte, disenoId: nuevoDisenoId } })
        ));
      }

      setMensajeExito(true);
      setTimeout(() => router.push("/disenos"), 1200);
    } catch (err) {
      setErrorGuardar(err instanceof ApiException ? err.message : "No se pudo guardar el diseño.");
    } finally {
      setGuardando(false);
    }
  }

  // ─── Render: cargando ────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-marron-claro text-sm">Cargando prendas y telas...</p>
      </div>
    );
  }

  // ─── Render: error de carga ──────────────────────────────────────────────
  if (errorCarga) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-terracota">Aviso</p>
        <p className="text-marron font-semibold">No se pudieron cargar los datos</p>
        <p className="text-marron-claro text-sm">{errorCarga}</p>
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
          <h1 className="text-3xl font-bold text-marron">Estudio de Diseño 3D</h1>
          <p className="text-marron-claro text-sm mt-1">
            Personaliza el modelo base, asigna telas por sección y genera la ficha técnica.
          </p>
        </div>
        <button
          onClick={handleGuardar}
          disabled={guardando || !prendaSeleccionada || telas.length === 0}
          className="inline-flex items-center justify-center bg-terracota hover:bg-marron text-crema font-semibold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
        >
          {guardando ? "Guardando..." : disenoId ? "Guardar Cambios" : "Guardar Diseño"}
        </button>
      </div>

      {mensajeExito && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-sm font-medium">
          ¡Diseño guardado exitosamente! Redirigiendo a tu catálogo...
        </div>
      )}

      {errorGuardar && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl text-sm font-medium">
          {errorGuardar}
        </div>
      )}

      {/* Selector de Prenda Base */}
      <div className="bg-crema-oscuro p-4 rounded-2xl border border-marron-claro/20">
        <h3 className="text-sm font-bold text-marron mb-3 uppercase tracking-wider">
          1. Selecciona la Prenda Base:
        </h3>
        {prendasBase.length === 0 ? (
          <p className="text-marron-claro text-sm">No hay prendas base disponibles.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {prendasBase.map((pb) => (
              <button
                key={pb.id}
                onClick={() => setPrendaSeleccionada(pb)}
                className={`p-3 rounded-xl text-left border transition ${
                  prendaSeleccionada?.id === pb.id
                    ? "border-terracota bg-crema shadow-xs ring-2 ring-terracota/30"
                    : "border-marron-claro/20 bg-crema/60 hover:bg-crema"
                }`}
              >
                <p className="text-xs font-bold text-marron">{pb.nombre}</p>
                <p className="text-[11px] text-marron-claro mt-0.5 line-clamp-1">{pb.categoria}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lienzo de Diseño + Panel de Ajustes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visualizador SVG */}
        <div className="lg:col-span-7 bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-6 flex flex-col items-center justify-center min-h-[420px] relative shadow-xs">
          <div className="absolute top-4 left-4 bg-crema px-3 py-1 rounded-full text-xs font-semibold text-marron border border-marron-claro/20">
            Vista Previa 2D/3D Mock
          </div>

          <div className="w-full max-w-sm flex items-center justify-center p-6">
            <svg viewBox="0 0 300 320" className="w-full h-auto drop-shadow-md">
              <path d="M 60 70 L 10 140 L 45 165 L 85 105 Z" fill={colorMangas} stroke="#4a2f21" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M 240 70 L 290 140 L 255 165 L 215 105 Z" fill={colorMangas} stroke="#4a2f21" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M 85 70 L 215 70 L 225 280 L 75 280 Z" fill={colorCuerpo} stroke="#4a2f21" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M 115 70 C 115 95, 185 95, 185 70 Z" fill={colorCuello} stroke="#4a2f21" strokeWidth="2.5" strokeLinejoin="round" />
              <line x1="80" y1="270" x2="220" y2="270" stroke="#4a2f21" strokeDasharray="3,3" strokeWidth="1.5" />
              <line x1="16" y1="145" x2="40" y2="160" stroke="#4a2f21" strokeDasharray="3,3" strokeWidth="1.5" />
              <line x1="284" y1="145" x2="260" y2="160" stroke="#4a2f21" strokeDasharray="3,3" strokeWidth="1.5" />
            </svg>
          </div>

          <p className="text-xs text-marron-claro mt-2">
            Base: <span className="font-semibold text-marron">{prendaSeleccionada?.nombre ?? "—"}</span>
            {prendaSeleccionada?.categoria ? ` (${prendaSeleccionada.categoria})` : ""}
          </p>
        </div>

        {/* Panel de Configuración */}
        <div className="lg:col-span-5 bg-crema-oscuro rounded-2xl border border-marron-claro/20 p-6 space-y-5 shadow-xs">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-marron block mb-1">
              Nombre de tu diseño
            </label>
            <input
              type="text"
              value={nombreDiseno}
              onChange={(e) => setNombreDiseno(e.target.value)}
              className="w-full bg-crema border border-marron-claro/30 rounded-xl px-4 py-2 text-sm text-marron font-semibold focus:outline-none focus:ring-2 focus:ring-terracota"
            />
          </div>

          {/* Parte: Cuerpo */}
          <div className="bg-crema p-3.5 rounded-xl border border-marron-claro/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-marron uppercase">Parte 1: Cuerpo</span>
              <input type="color" value={colorCuerpo} onChange={(e) => setColorCuerpo(e.target.value)} className="w-7 h-7 rounded border-none cursor-pointer" title="Color del cuerpo" />
            </div>
            <label className="text-[11px] text-marron-claro block">Tipo de Tela asignada:</label>
            <select value={telaCuerpoId} onChange={(e) => setTelaCuerpoId(Number(e.target.value))} className="w-full bg-crema-oscuro border border-marron-claro/30 rounded-lg px-3 py-1.5 text-xs text-marron focus:outline-none focus:ring-2 focus:ring-terracota">
              {telas.map((t) => <option key={t.id} value={t.id}>{t.nombre} ({t.composicion})</option>)}
            </select>
          </div>

          {/* Parte: Mangas */}
          <div className="bg-crema p-3.5 rounded-xl border border-marron-claro/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-marron uppercase">Parte 2: Mangas</span>
              <input type="color" value={colorMangas} onChange={(e) => setColorMangas(e.target.value)} className="w-7 h-7 rounded border-none cursor-pointer" title="Color de mangas" />
            </div>
            <label className="text-[11px] text-marron-claro block">Tipo de Tela asignada:</label>
            <select value={telaMangasId} onChange={(e) => setTelaMangasId(Number(e.target.value))} className="w-full bg-crema-oscuro border border-marron-claro/30 rounded-lg px-3 py-1.5 text-xs text-marron focus:outline-none focus:ring-2 focus:ring-terracota">
              {telas.map((t) => <option key={t.id} value={t.id}>{t.nombre} ({t.composicion})</option>)}
            </select>
          </div>

          {/* Parte: Cuello */}
          <div className="bg-crema p-3.5 rounded-xl border border-marron-claro/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-marron uppercase">Parte 3: Cuello & Rib</span>
              <input type="color" value={colorCuello} onChange={(e) => setColorCuello(e.target.value)} className="w-7 h-7 rounded border-none cursor-pointer" title="Color de cuello" />
            </div>
            <label className="text-[11px] text-marron-claro block">Tipo de Tela asignada:</label>
            <select value={telaCuelloId} onChange={(e) => setTelaCuelloId(Number(e.target.value))} className="w-full bg-crema-oscuro border border-marron-claro/30 rounded-lg px-3 py-1.5 text-xs text-marron focus:outline-none focus:ring-2 focus:ring-terracota">
              {telas.map((t) => <option key={t.id} value={t.id}>{t.nombre} ({t.composicion})</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
