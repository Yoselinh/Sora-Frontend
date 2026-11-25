"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerSesion, rutaPorRol } from "@/lib/auth";
import type { Rol } from "@/types";

interface AuthGuardProps {
  rolRequerido: Rol;
  children: React.ReactNode;
}

export default function AuthGuard({ rolRequerido, children }: AuthGuardProps) {
  const router = useRouter();
  const [verificado, setVerificado] = useState<boolean | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();

    // Sin sesión real registrada -> Redirigir de inmediato al login
    if (!sesion) {
      router.replace("/login");
      return;
    }

    // Sesión válida pero para otro rol -> Redirigir a su portal correspondiente
    if (sesion.rol !== rolRequerido) {
      router.replace(rutaPorRol(sesion.rol));
      return;
    }

    setVerificado(true);
  }, [router, rolRequerido]);

  if (!verificado) {
    return (
      <div className="min-h-screen bg-crema flex items-center justify-center">
        <span className="text-marron-claro text-sm animate-pulse">Verificando acceso…</span>
      </div>
    );
  }

  return <>{children}</>;
}
