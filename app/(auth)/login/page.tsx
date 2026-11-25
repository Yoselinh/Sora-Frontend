"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ApiException } from "@/lib/api";
import { loginReal, rutaPorRol } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recienRegistrado = searchParams.get("registrado") === "1";
  const sesionExpirada = searchParams.get("expirado") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      // Login real contra POST /api/Auth/login
      const sesion = await loginReal({ email, password });
      router.replace(rutaPorRol(sesion.rol));
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || "Credenciales incorrectas.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado al conectar con el servidor.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-crema flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo / cabecera */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-black text-terracota tracking-tight">SORA</h1>
          </Link>
          <p className="text-marron-claro text-sm mt-1">Diseña. Visualiza. Confecciona.</p>
        </div>

        {/* Tarjeta */}
        <div className="bg-crema-oscuro rounded-2xl border border-marron-claro/20 shadow-md px-8 py-8 space-y-6">
          <h2 className="text-xl font-semibold text-marron">Iniciar sesión</h2>

          {/* Aviso de registro exitoso */}
          {recienRegistrado && (
            <p className="text-sm text-marron bg-emerald-100 border border-emerald-300 rounded-lg px-4 py-2.5">
              Cuenta creada correctamente. Ya puedes iniciar sesión con tus credenciales.
            </p>
          )}

          {/* Aviso de sesión expirada */}
          {sesionExpirada && (
            <p className="text-sm text-amber-900 bg-amber-100 border border-amber-300 rounded-lg px-4 py-2.5">
              Tu sesión ha expirado. Por favor ingresa nuevamente.
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-marron">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-xl border border-marron-claro/30 bg-crema px-4 py-2.5 text-marron text-sm focus:outline-none focus:ring-2 focus:ring-terracota"
              />
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-marron">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-marron-claro/30 bg-crema px-4 py-2.5 text-marron text-sm focus:outline-none focus:ring-2 focus:ring-terracota"
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
              {cargando ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          {/* Pie */}
          <p className="text-center text-xs text-marron-claro pt-2">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="text-terracota font-bold hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
