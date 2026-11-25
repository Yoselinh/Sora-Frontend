import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";

export default function TallerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard rolRequerido="taller">
      <div className="min-h-screen flex flex-col bg-crema">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
