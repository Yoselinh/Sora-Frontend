interface StatusBadgeProps {
  status?: string | null;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const s = (status ?? "pendiente").toLowerCase();

  let styles = "bg-stone-200 text-stone-800 border-stone-300";

  if (s.includes("pendiente")) {
    styles = "bg-amber-100 text-amber-900 border-amber-300";
  } else if (s.includes("cotizado") || s.includes("enviad")) {
    styles = "bg-blue-100 text-blue-900 border-blue-300";
  } else if (s.includes("aceptada") || s.includes("aprobado") || s.includes("finalizado") || s.includes("entregado") || s.includes("listo")) {
    styles = "bg-emerald-100 text-emerald-900 border-emerald-300";
  } else if (s.includes("confección") || s.includes("proceso")) {
    styles = "bg-purple-100 text-purple-900 border-purple-300";
  } else if (s.includes("rechazada") || s.includes("cancelado")) {
    styles = "bg-rose-100 text-rose-900 border-rose-300";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      {status ?? "Pendiente"}
    </span>
  );
}
