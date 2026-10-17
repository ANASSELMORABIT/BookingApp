import { useEffect, useRef } from 'react'

const FORMATS = {
  int: (n: number) => Math.round(n).toLocaleString('es-ES'),
  eur: (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }),
  pct: (n: number) => `${n.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`,
}

/**
 * Número que cuenta hasta su valor (900 ms, curva suave). Se actualiza escribiendo en el DOM,
 * sin re-renderizar. Con "reducir movimiento" muestra el valor directamente.
 */
export function CountUp({ value, kind = 'int', duration = 900 }: {
  value: number
  kind?: keyof typeof FORMATS
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(0)
  const format = FORMATS[kind]

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const from = shown.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || from === value) {
      el.textContent = format(value)
      shown.current = value
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const current = from + (value - from) * eased
      el.textContent = format(current)
      shown.current = current
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, format])

  return (
    <>
      <span ref={ref} aria-hidden className="tabular-nums">{format(0)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  )
}
