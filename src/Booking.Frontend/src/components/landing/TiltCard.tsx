import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Inclinación máxima por defecto de la tarjeta con el cursor (grados). */
const MAX_TILT = 8

/** Tarjeta de vidrio que se inclina hacia el cursor y tiene un brillo que lo sigue. Solo con ratón. */
export function TiltCard({ children, className, maxTilt = MAX_TILT }: { children: ReactNode; className?: string; maxTilt?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--ry', `${x * maxTilt * 2}deg`)
    el.style.setProperty('--rx', `${-y * maxTilt * 2}deg`)
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--my', `${(y + 0.5) * 100}%`)
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return (
    <div className="tilt-wrap h-full">
      <div ref={ref} className={cn('tilt-card glass-panel h-full', className)} onPointerMove={onMove} onPointerLeave={onLeave}>
        <div className="tilt-layer h-full">{children}</div>
      </div>
    </div>
  )
}
