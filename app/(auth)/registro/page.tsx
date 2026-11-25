"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiException } from "@/lib/api";
import { registroReal, loginReal, rutaPorRol } from "@/lib/auth";

type RolSeleccionado = "cliente" | "taller";

interface AddTallerPayload {
  usuarioId: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
}

export default function RegistroPage() {
  const router = useRouter();

  // Campos comunes
  const [rol, setRol] = useState<RolSeleccionado>("cliente");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");

  // Campos extra para rol taller
  const [nombreTaller, setNombreTaller] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    try {
      // 1. Crear el usuario en POST /api/Auth/register
      await registroReal({
        nombre,
        email,
        password,
        rol,
      });

      // 2. Iniciar sesión automáticamente en POST /api/Auth/login
      const sesion = await loginReal({ email, password });

      // 3. Si el rol es taller, registrar sus datos comerciales en POST /api/Talleres
      if (rol === "taller") {
        if (!sesion.usuarioId) {
          throw new Error("No se pudo obtener el identificador de usuario para registrar el taller.");
        }

        const tallerPayload: AddTallerPayload = {
          usuarioId: sesion.usuarioId,
          nombre: nombreTaller.trim() || nombre,
          ...(direccion.trim() && { direccion: direccion.trim() }),
          ...(telefono.trim() && { telefono: telefono.trim() }),
        };

        await apiFetch("/api/Talleres", {
          method: "POST",
          body: tallerPayload,
        });
      }

      // 4. Redirigir según el rol
      router.replace(rutaPorRol(rol));
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error inesperado en el registro. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-crema flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-black text-terracota tracking-tight">SORA</h1>
          </Link>
          <p className="text-marron-claro text-sm mt-1">Diseña. Visualiza. Confecciona.</p>
        </div>

        {/* Tarjeta */}
        <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 shadow-md px-8 py-8 space-y-6">
          <h2 className="text-xl font-semibold text-marron">Crear cuenta</h2>

          {/* Selector de rol */}
          <div className="flex rounded-xl bg-crema p-1 border border-marron-claro/20 text-xs font-bold">
            <button
              type="button"
              onClick={() => setRol("cliente")}
              className={`flex-1 py-2 rounded-lg transition ${
                rol === "cliente" ? "bg-terracota text-crema shadow-xs" : "text-marron hover:text-terracota"
              }`}
            >
              Soy Cliente
            </button>
            <button
              type="button"
              onClick={() => setRol("taller")}
              className={`flex-1 py-2 rounded-lg transition ${
                rol === "taller" ? "bg-amber-900 text-crema shadow-xs" : "text-marron hover:text-amber-900"
              }`}
            >
              Soy Taller Textil
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nombre */}
            <div className="flex flex-col gap-1">
              <label htmlFor="nombre" className="text-xs font-bold uppercase tracking-wider text-marron">
                {rol === "taller" ? "Nombre del Responsable" : "Nombre Completo"}
              </label>
              <input
                id="nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-xl border border-marron-claro/30 bg-crema px-4 py-2 text-marron text-sm focus:outline-none focus:ring-2 focus:ring-terracota"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-marron">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-xl border border-marron-claro/30 bg-crema px-4 py-2 text-marron text-sm focus:outline-none focus:ring-2 focus:ring-terracota"
              />
            </div>

            {/* Campos extra si es taller */}
            {rol === "taller" && (
              <>
                <div className="flex flex-col gap-1">
                  <label htmlFor="nombreTaller" className="text-xs font-bold uppercase tracking-wider text-marron">
                    Nombre del Taller / Razón Social
                  </label>
                  <input
                    id="nombreTaller"
                    type="text"
                    required
                    value={nombreTaller}
                    onChange={(e) => setNombreTaller(e.target.value)}
                    placeholder="Ej: Confecciones Lima S.A.C."
                    className="w-full rounded-xl border border-marron-claro/30 bg-crema px-4 py-2 text-marron text-sm focus:outline-none focus:ring-2 focus:ring-terracota"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="direccion" className="text-xs font-bold uppercase tracking-wider text-marron">
                    Dirección de Planta
                  </label>
                  <input
                    id="direccion"
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Jr. Gamarra 840, La Victoria"
                    className="w-full rounded-xl border border-marron-claro/30 bg-crema px-4 py-2 text-marron text-sm focus:outline-none focus:ring-2 focus:ring-terracota"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="telefono" className="text-xs font-bold uppercase tracking-wider text-marron">
                    Teléfono / Celular de Contacto
                  </label>
                  <input
                    id="telefono"
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+51 987 654 321"
                    className="w-full rounded-xl border border-marron-claro/30 bg-crema px-4 py-2 text-marron text-sm focus:outline-none focus:ring-2 focus:ring-terracota"
                  />
                </div>
              </>
            )}

            {/* Contraseña */}
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-marron">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-marron-claro/30 bg-crema px-4 py-2 text-marron text-sm focus:outline-none focus:ring-2 focus:ring-terracota"
              />
            </div>

            {/* Confirmar Contraseña */}
            <div className="flex flex-col gap-1">
              <label htmlFor="confirmar" className="text-xs font-bold uppercase tracking-wider text-marron">
                Confirmar Contraseña
              </label>
              <input
                id="confirmar"
                type="password"
                required
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-marron-claro/30 bg-crema px-4 py-2 text-marron text-sm focus:outline-none focus:ring-2 focus:ring-terracota"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-rose-800 bg-rose-100 border border-rose-300 rounded-lg px-3 py-2 font-medium">
                {error}
              </p>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-xl bg-terracota text-crema font-bold py-2.5 text-sm hover:bg-marron transition disabled:opacity-60 shadow-xs mt-2"
            >
              {cargando ? "Creando cuenta…" : "Registrarme"}
            </button>
          </form>

          {/* Pie */}
          <p className="text-center text-xs text-marron-claro pt-2">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-terracota font-bold hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
