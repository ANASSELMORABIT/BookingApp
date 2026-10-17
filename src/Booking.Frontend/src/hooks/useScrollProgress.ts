import { useEffect, useRef, type RefObject } from 'react'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Progreso de scroll (0 a 1) de una sección, sin re-renderizar:
 * se guarda en un ref y en la variable CSS `--p` del propio elemento.
 *
 * - "sticky": de 0 cuando la sección toca arriba a 1 cuando termina (secciones más altas que la pantalla).
 * - "pass":   de 0 cuando la sección asoma por abajo (75 % de la pantalla) a 1 cuando su final llega a la mitad.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, mode: 'sticky' | 'pass' = 'sticky') {
  const progress = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0

    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p = mode === 'sticky'
        ? clamp01(-r.top / Math.max(1, r.height - vh))
        : clamp01((vh * 0.75 - r.top) / Math.max(1, r.height - vh * 0.25))
      progress.current = p
      el.style.setProperty('--p', p.toFixed(4))
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update) }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const ro = new ResizeObserver(schedule)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      ro.disconnect()
    }
  }, [ref, mode])

  return progress
}
