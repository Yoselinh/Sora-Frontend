// lib/auth.ts
// Capa de abstracción y gestión de sesiones y autenticación real con Sora API.
// El almacenamiento en localStorage queda totalmente aislado en este archivo.

import type { Rol, LoginCommand, AddUsuarioCommand } from "@/types";
import { apiFetch } from "./api";

const TOKEN_KEY = "sora_token";
const USER_INFO_KEY = "sora_user_info";

// ─── ALMACENAMIENTO AISLADO ──────────────────────────────────────────────────

export function guardarToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function obtenerToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function guardarInfoUsuario(info: {
  email?: string;
  rol?: Rol;
  nombre?: string;
  usuarioId?: number;
}): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(info));
  }
}

export function obtenerInfoUsuario(): {
  email?: string;
  rol?: Rol;
  nombre?: string;
  usuarioId?: number;
} | null {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(USER_INFO_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export function borrarToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
  }
}

export const cerrarSesion = borrarToken;

// ─── DECODIFICADOR JWT ───────────────────────────────────────────────────────

interface JwtPayload {
  sub?: string;
  nameid?: string;
  nombre?: string;
  unique_name?: string;
  email?: string;
  rol?: Rol;
  role?: string;
  exp?: number;
  [key: string]: unknown;
}

export function parsearToken(token: string): JwtPayload | null {
  try {
    const partes = token.split(".");
    if (partes.length !== 3) return null;
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function tokenExpirado(token: string): boolean {
  const payload = parsearToken(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

// ─── SESIÓN ACTIVA ───────────────────────────────────────────────────────────

export interface Sesion {
  token: string;
  rol: Rol;
  nombre: string;
  email: string;
  usuarioId?: number;
}

export function obtenerSesion(): Sesion | null {
  if (typeof window === "undefined") return null;
  const token = obtenerToken();
  if (!token) return null;

  if (tokenExpirado(token)) {
    borrarToken();
    return null;
  }

  const payload = parsearToken(token);
  const infoGuardada = obtenerInfoUsuario();

  // Detectar rol soportando tanto respuesta del body como claims tradicionales de ASP.NET
  const rolDetectado = (
    infoGuardada?.rol ||
    payload?.rol ||
    payload?.role ||
    (payload?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] as string)
  )?.toString().toLowerCase() as Rol | undefined;

  if (!rolDetectado) return null;

  const idStr =
    infoGuardada?.usuarioId ||
    payload?.sub ||
    payload?.nameid ||
    (payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] as string);

  const nombreDetectado =
    infoGuardada?.nombre ||
    payload?.nombre ||
    payload?.unique_name ||
    (payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as string) ||
    infoGuardada?.email ||
    (rolDetectado === "taller" ? "Taller Textil" : rolDetectado === "admin" ? "Administrador" : "Cliente");

  const emailDetectado =
    infoGuardada?.email ||
    payload?.email ||
    (payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] as string) ||
    "";

  return {
    token,
    rol: rolDetectado,
    nombre: nombreDetectado,
    email: emailDetectado,
    usuarioId: idStr ? Number(idStr) : undefined,
  };
}

export function rutaPorRol(rol: Rol): string {
  switch (rol) {
    case "taller":
      return "/solicitudes";
    case "admin":
      return "/admin";
    default:
      return "/talleres"; // cliente
  }
}

// ─── FUNCIONES DE ACCIÓN REAL (LOGIN / REGISTRO) ─────────────────────────────

interface LoginResponseDto {
  token: string;
  email?: string;
  rol?: string;
}

/**
 * Autentica al usuario contra POST /api/Auth/login del backend.
 * Guarda el token, email y rol en el almacenamiento aislado y devuelve la Sesion activa.
 */
export async function loginReal(credenciales: LoginCommand): Promise<Sesion> {
  const res = await apiFetch<LoginResponseDto>("/api/Auth/login", {
    method: "POST",
    body: {
      email: credenciales.email,
      password: credenciales.password,
    },
  });

  if (!res?.token) {
    throw new Error("El servidor no devolvió un token de acceso válido.");
  }

  guardarToken(res.token);

  const payload = parsearToken(res.token);
  const rolRaw = res.rol ?? payload?.rol ?? payload?.role ?? "cliente";
  const rol = rolRaw.toLowerCase() as Rol;

  const usuarioId = payload?.sub ? Number(payload.sub) : undefined;
  const nombre = payload?.nombre ?? payload?.unique_name ?? credenciales.email;

  guardarInfoUsuario({
    email: res.email ?? credenciales.email,
    rol,
    usuarioId,
    nombre,
  });

  return {
    token: res.token,
    rol,
    email: res.email ?? credenciales.email,
    nombre,
    usuarioId,
  };
}

/**
 * Registra un nuevo usuario contra POST /api/Auth/register del backend.
 */
export async function registroReal(datos: AddUsuarioCommand): Promise<void> {
  await apiFetch("/api/Auth/register", {
    method: "POST",
    body: {
      nombre: datos.nombre,
      email: datos.email,
      password: datos.password,
      rol: datos.rol?.toLowerCase(),
    },
  });
}
