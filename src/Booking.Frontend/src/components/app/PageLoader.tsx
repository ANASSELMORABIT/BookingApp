/** Esqueleto de carga: mantiene la forma de la pantalla en lugar de un spinner suelto. */
export function PageLoader({ label = 'Cargando…', cards = 4 }: { label?: string; cards?: number }) {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="space-y-2">
        <div className="skeleton h-7 w-48" />
        <div className="skeleton h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="skeleton h-64" />
    </div>
  )
}
