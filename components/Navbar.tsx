"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { obtenerSesion, borrarToken } from "@/lib/auth";
import type { Rol } from "@/types";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [sesion, setSesion] = useState<{ rol: Rol; nombre: string } | null>(null);

  useEffect(() => {
    const s = obtenerSesion();
    if (s) {
      setSesion({ rol: s.rol, nombre: s.nombre });
    }
  }, [pathname]);

  function handleLogout() {
    borrarToken();
    router.replace("/login");
  }

  const rol = sesion?.rol ?? "cliente";

  const enlacesCliente = [
    { href: "/talleres", label: "Explorar Talleres" },
    { href: "/disenar", label: "Estudio de Diseño" },
    { href: "/disenos", label: "Mis Diseños" },
    { href: "/cotizaciones", label: "Cotizaciones" },
    { href: "/pedidos", label: "Pedidos" },
  ];

  const enlacesTaller = [
    { href: "/solicitudes", label: "Solicitudes de Clientes" },
    { href: "/taller-cotizaciones", label: "Cotizaciones Enviadas" },
    { href: "/taller-pedidos", label: "Pedidos" },
    { href: "/taller-telas", label: "Gestión de Telas" },
    { href: "/taller-perfil", label: "Perfil del Taller" },
  ];

  const enlacesAdmin = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/usuarios", label: "Usuarios" },
    { href: "/admin/telas", label: "Catálogo de Telas" },
    { href: "/admin/prendas", label: "Prendas Base" },
    { href: "/admin/talleres", label: "Talleres" },
  ];

  const enlaces = rol === "admin" ? enlacesAdmin : rol === "taller" ? enlacesTaller : enlacesCliente;

  return (
    <header className="sticky top-0 z-40 bg-crema-oscuro/95 backdrop-blur border-b border-marron-claro/20 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Rol Badge */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl font-black text-terracota tracking-wider">SORA</span>
            </Link>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                rol === "admin"
                  ? "bg-purple-900/10 text-purple-950 border border-purple-300"
                  : rol === "taller"
                  ? "bg-amber-900/10 text-amber-950 border border-amber-300"
                  : "bg-terracota/15 text-terracota border border-terracota/30"
              }`}
            >
              {rol}
            </span>
          </div>

          {/* Menú Principal */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-2">
            {enlaces.map((item) => {
              const activo =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activo
                      ? "bg-terracota text-crema shadow-xs"
                      : "text-marron hover:bg-crema hover:text-marron"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Usuario y Cierre de Sesión */}
          <div className="flex items-center gap-3">
            {sesion && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-marron hidden sm:inline">
                  {sesion.nombre}
                </span>
                <button
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  className="px-3 py-1.5 text-xs font-semibold border border-marron-claro/30 text-marron rounded-xl hover:bg-terracota hover:text-crema hover:border-terracota transition"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subbarra móvil de navegación */}
      <div className="md:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-marron-claro/10 bg-crema">
        {enlaces.map((item) => {
          const activo = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium ${
                activo ? "bg-terracota text-crema" : "text-marron"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
