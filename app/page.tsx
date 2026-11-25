import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-crema text-marron flex flex-col">
      {/* Header Landing */}
      <header className="border-b border-marron-claro/20 bg-crema-oscuro/80 backdrop-blur py-4 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-terracota tracking-wider">SORA</span>
          <span className="text-xs text-marron-claro hidden sm:inline">• Plataforma Textil</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs sm:text-sm font-semibold text-marron hover:text-terracota transition px-3 py-1.5"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/registro"
            className="text-xs sm:text-sm font-bold bg-terracota hover:bg-marron text-crema px-4 py-2 rounded-xl transition shadow-xs"
          >
            Registrarse
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-5xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-terracota bg-terracota/10 px-3 py-1 rounded-full border border-terracota/20 mb-4">
          Conexión Directa Diseñador & Talleres de Confección
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-marron tracking-tight max-w-3xl leading-tight">
          Diseña en 3D. Cotiza en segundos. Confecciona a escala.
        </h1>
        <p className="text-base sm:text-lg text-marron-claro max-w-2xl mt-4">
          La plataforma integral que unifica el modelado de prendas por partes, la selección de telas especializadas y la licitación directa con talleres textiles de Gamarra y Lima.
        </p>

        {/* Portales según Rol */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mt-12 text-left">
          {/* Portal Cliente */}
          <div className="bg-crema-oscuro p-6 rounded-2xl border border-marron-claro/20 shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div>
              <span className="mb-3 inline-flex w-fit rounded-full border border-terracota/20 bg-terracota/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-terracota">Cliente</span>
              <h2 className="text-xl font-bold text-marron">Para Diseñadores & Marcas</h2>
              <p className="text-xs text-marron-claro mt-2">
                Crea prendas personalizadas, asigna telas por sección, define curvas de tallas y recibe cotizaciones competitivas.
              </p>
            </div>
            <Link
              href="/talleres"
              className="mt-6 block text-center bg-terracota hover:bg-marron text-crema text-xs font-bold py-2.5 rounded-xl transition"
            >
              Explorar Portal Cliente →
            </Link>
          </div>

          {/* Portal Taller */}
          <div className="bg-crema-oscuro p-6 rounded-2xl border border-marron-claro/20 shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div>
              <span className="mb-3 inline-flex w-fit rounded-full border border-marron-claro/20 bg-crema px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-marron-claro">Taller</span>
              <h2 className="text-xl font-bold text-marron">Para Talleres de Confección</h2>
              <p className="text-xs text-marron-claro mt-2">
                Registra las telas con las que trabajas y tus precios por metro, evalúa solicitudes y envía presupuestos con plazos.
              </p>
            </div>
            <Link
              href="/solicitudes"
              className="mt-6 block text-center bg-amber-900 hover:bg-amber-950 text-crema text-xs font-bold py-2.5 rounded-xl transition"
            >
              Ingresar como Taller →
            </Link>
          </div>

          {/* Portal Admin */}
          <div className="bg-crema-oscuro p-6 rounded-2xl border border-marron-claro/20 shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div>
              <span className="mb-3 inline-flex w-fit rounded-full border border-purple-900/15 bg-purple-900/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-900">Administración</span>
              <h2 className="text-xl font-bold text-marron">Para Administradores</h2>
              <p className="text-xs text-marron-claro mt-2">
                Control de usuarios, catálogo maestro de prendas base 3D, telas globales y supervisión de operaciones.
              </p>
            </div>
            <Link
              href="/admin"
              className="mt-6 block text-center bg-purple-900 hover:bg-purple-950 text-crema text-xs font-bold py-2.5 rounded-xl transition"
            >
              Panel Administrativo →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-marron-claro/20 py-6 text-center text-xs text-marron-claro bg-crema-oscuro">
        SORA © 2026 • Sistema Integral de Confección y Licitación Textil
      </footer>
    </main>
  );
}
