// lib/api.ts
// Cliente HTTP centralizado para comunicarse con la API de SORA.
// Toda petición al backend pasa por aquí.

import { obtenerToken, borrarToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5181";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface FetchOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
}

export interface ApiError {
  message: string;
  status: number;
}

export class ApiException extends Error {
  status: number;
  constructor({ message, status }: ApiError) {
    super(message);
    this.name = "ApiException";
    this.status = status;
  }
}

/**
 * Parsea el cuerpo del error devuelto por ASP.NET Core (message, title, detail, errors dictionary).
 */
function extraerMensajeError(json: unknown, status: number): string {
  if (!json || typeof json !== "object") {
    return `Error del servidor (${status})`;
  }

  const errObj = json as Record<string, unknown>;

  // 1. Si viene propiedad { message: "..." } o { error: "..." }
  if (typeof errObj.message === "string" && errObj.message.trim()) {
    return errObj.message;
  }
  if (typeof errObj.error === "string" && errObj.error.trim()) {
    return errObj.error;
  }

  // 2. Si viene formato ASP.NET ValidationProblemDetails con diccionario { errors: { Campo: ["Error 1"] } }
  if (errObj.errors && typeof errObj.errors === "object") {
    const mensajes: string[] = [];
    for (const valor of Object.values(errObj.errors as Record<string, unknown>)) {
      if (Array.isArray(valor)) {
        mensajes.push(...valor.map(String));
      } else if (typeof valor === "string") {
        mensajes.push(valor);
      }
    }
    if (mensajes.length > 0) {
      return mensajes.join(" • ");
    }
  }

  // 3. Si viene formato ASP.NET ProblemDetails { detail: "..." } o { title: "..." }
  if (typeof errObj.detail === "string" && errObj.detail.trim()) {
    return errObj.detail;
  }
  if (typeof errObj.title === "string" && errObj.title.trim()) {
    return errObj.title;
  }

  return `Error en la solicitud (${status})`;
}

/**
 * Función base de fetch.
 * - Conecta a BASE_URL (NEXT_PUBLIC_API_URL).
 * - Serializa body a JSON.
 * - Adjunta automáticamente el token Bearer desde localStorage si existe.
 * - Si responde 401 (No autorizado), borra la sesión y redirige a /login.
 * - Lanza ApiException estructurada con el mensaje real del backend.
 */
export async function apiFetch<T>(
  path: string,
  { method = "GET", body, token, headers = {} }: FetchOptions = {}
): Promise<T> {
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Header Bearer automático si no se pasó uno explícito
  const authToken = token ?? obtenerToken();
  if (authToken) {
    reqHeaders["Authorization"] = `Bearer ${authToken}`;
  }

  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (error) {
    throw new ApiException({
      message: "No se pudo conectar con el servidor de Sora. Verifica que el backend esté corriendo en " + BASE_URL,
      status: 0,
    });
  }

  // Manejo de 401: Sesión expirada o token inválido
  if (response.status === 401) {
    borrarToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login?expirado=1";
    }
    throw new ApiException({
      message: "Sesión no válida o expirada. Por favor ingresa nuevamente.",
      status: 401,
    });
  }

  if (!response.ok) {
    let mensaje = `Error ${response.status}`;
    try {
      const json = await response.json();
      mensaje = extraerMensajeError(json, response.status);
    } catch {
      // Si la respuesta es texto plano
      try {
        const texto = await response.text();
        if (texto.trim()) mensaje = texto;
      } catch {
        // Fallback genérico
      }
    }
    throw new ApiException({ message: mensaje, status: response.status });
  }

  // 204 No Content u otras respuestas sin contenido
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
