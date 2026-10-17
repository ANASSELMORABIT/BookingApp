import { useEffect, useState } from 'react'

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    // Liberar el contexto de prueba: los navegadores limitan cuántos puede haber
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
}

/**
 * Indica si conviene montar una escena WebGL: pantalla ancha, WebGL disponible,
 * sin "reducir movimiento", sin ahorro de datos y con un procesador razonable.
 * Reacciona si el usuario cambia el tamaño de la ventana o la preferencia de movimiento.
 */
export function useCan3D(minWidth = 1280): boolean {
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection
    const weak = (navigator.hardwareConcurrency ?? 8) <= 2
    if (conn?.saveData || weak || !hasWebGL()) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const wide = window.matchMedia(`(min-width: ${minWidth}px)`)
    const update = () => setOk(!reduce.matches && wide.matches)

    update()
    reduce.addEventListener('change', update)
    wide.addEventListener('change', update)
    return () => {
      reduce.removeEventListener('change', update)
      wide.removeEventListener('change', update)
    }
  }, [minWidth])

  return ok
}
