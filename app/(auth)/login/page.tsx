import { Suspense } from "react";
import LoginForm from "./LoginForm";

function LoginFallback() {
  return (
    <main className="min-h-screen bg-crema flex items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <div className="w-9 h-9 border-4 border-terracota border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-marron-claro">Cargando inicio de sesión...</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
