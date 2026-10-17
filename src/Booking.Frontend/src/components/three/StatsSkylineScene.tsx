import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { BoxGeometry, Color, InstancedMesh, MathUtils, Object3D } from 'three'

/** Ajustes de intensidad del horizonte de Estadísticas. */
const SKYLINE = {
  span: 9,            // anchura total que ocupan las columnas
  maxHeight: 2.4,     // altura de la columna con más reservas
  minHeight: 0.035,   // los días sin reservas dejan una marca en el suelo
  grow: 0.9,          // segundos que tarda cada columna en crecer
  stagger: 0.025,     // retraso entre columnas (segundos)
  cursorDrift: 0.6,   // cuánto se mueve la cámara con el cursor
  damping: 3.5,       // suavizado de la cámara
}

export interface SkylineDay {
  key: string
  total: number
}

const COLORS = {
  low: new Color('#3b2a80'),     // columnas bajas
  high: new Color('#8b5cf6'),    // columnas altas (misma tonalidad, más clara)
  today: new Color('#c4b5fd'),
  hover: new Color('#f1ecff'),
}

function Bars({ days, todayKey, hovered, onHover }: {
  days: SkylineDay[]
  todayKey: string
  hovered: number | null
  onHover: (index: number | null, clientX: number, clientY: number) => void
}) {
  const ref = useRef<InstancedMesh>(null)
  const n = days.length

  // Caja con la base en y = 0, para escalar solo hacia arriba
  const geometry = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1)
    g.translate(0, 0.5, 0)
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const work = useMemo(() => ({ dummy: new Object3D(), color: new Color() }), [])

  // Cada vez que cambian los datos, las columnas vuelven a crecer desde el suelo
  const dataKey = days.map(d => `${d.key}:${d.total}`).join('|')
  const restart = useRef(true)
  const startedAt = useRef(0)
  useEffect(() => { restart.current = true }, [dataKey])

  useFrame(state => {
    const mesh = ref.current
    if (!mesh) return
    if (restart.current) {
      startedAt.current = state.clock.elapsedTime
      restart.current = false
    }
    const t = state.clock.elapsedTime - startedAt.current
    const max = Math.max(1, ...days.map(d => d.total))
    const step = SKYLINE.span / Math.max(n, 1)
    const width = Math.min(0.42, step * 0.66)
    const { dummy, color } = work

    for (let i = 0; i < n; i++) {
      const d = days[i]
      const progress = MathUtils.clamp((t - i * SKYLINE.stagger) / SKYLINE.grow, 0, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const target = Math.max(SKYLINE.minHeight, (d.total / max) * SKYLINE.maxHeight)
      const isHovered = hovered === i

      dummy.position.set(-SKYLINE.span / 2 + step * (i + 0.5), 0, 0)
      dummy.scale.set(width * (isHovered ? 1.15 : 1), Math.max(0.001, target * eased), width)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      if (isHovered) color.copy(COLORS.hover)
      else if (d.key === todayKey) color.copy(COLORS.today)
      else color.copy(COLORS.low).lerp(COLORS.high, d.total / max)
      mesh.setColorAt(i, color)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(e.instanceId ?? null, e.nativeEvent.clientX, e.nativeEvent.clientY)
  }

  return (
    <instancedMesh
      // La clave rehace el buffer cuando cambia el número de días
      key={n}
      ref={ref}
      args={[geometry, undefined, n]}
      onPointerMove={handleMove}
      onPointerOut={() => onHover(null, 0, 0)}
    >
      <meshPhysicalMaterial roughness={0.22} metalness={0.15} clearcoat={1} clearcoatRoughness={0.12} />
    </instancedMesh>
  )
}

function Rig({ onReady }: { onReady?: () => void }) {
  const notified = useRef(false)
  useFrame((state, dt) => {
    if (!notified.current) {
      notified.current = true
      onReady?.()
    }
    const { camera, pointer } = state
    camera.position.x = MathUtils.damp(camera.position.x, pointer.x * SKYLINE.cursorDrift, SKYLINE.damping, dt)
    camera.position.y = MathUtils.damp(camera.position.y, 2.3 + pointer.y * 0.35, SKYLINE.damping, dt)
    camera.lookAt(0, 0.9, 0)
  })
  return null
}

export default function StatsSkylineScene({
  days, todayKey, hovered, onHover, active, onReady,
}: {
  days: SkylineDay[]
  todayKey: string
  hovered: number | null
  onHover: (index: number | null, clientX: number, clientY: number) => void
  active: boolean
  onReady?: () => void
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 2.3, 9.6], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      tabIndex={-1}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 5]} intensity={1.4} />
      <directionalLight position={[-6, 2, -2]} intensity={0.6} color="#a5b4fc" />

      {/* Luz de entorno generada en la escena: no descarga ningún HDR externo */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, -2]} rotation-x={Math.PI / 2} scale={[12, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#a78bfa" position={[-6, 1, 0]} rotation-y={Math.PI / 2} scale={[2, 5, 1]} />
        <Lightformer form="rect" intensity={1} color="#818cf8" position={[6, 1, 0]} rotation-y={-Math.PI / 2} scale={[2, 5, 1]} />
      </Environment>

      <Bars days={days} todayKey={todayKey} hovered={hovered} onHover={onHover} />

      {/* Suelo: una franja oscura con sombra suave bajo las columnas */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.002, 0]}>
        <planeGeometry args={[SKYLINE.span + 2.4, 3.2]} />
        <meshStandardMaterial color="#120f22" roughness={0.85} transparent opacity={0.85} />
      </mesh>
      <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={[SKYLINE.span + 2, 3]} blur={2.2} far={2.6} resolution={512} color="#000000" />

      <Rig onReady={onReady} />
    </Canvas>
  )
}
