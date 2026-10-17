import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Color, Euler, Group, InstancedMesh, MathUtils, Object3D, Quaternion, Vector3 } from 'three'

/** Ajustes de intensidad de la escena de la página de inicio. */
const HERO_SCENE = {
  cols: 6,              // columnas de la "agenda" ordenada
  rows: 4,              // filas (cols x rows = número de cápsulas)
  damping: 3,           // suavizado general: más alto = responde más rápido
  cursorDrift: 0.5,     // cuánto se mueve la cámara con el cursor
  cursorTilt: 0.18,     // cuánto se inclina el conjunto hacia el cursor (radianes)
  chaosSpin: 0.12,      // giro de las cápsulas desordenadas (rad/s)
  bob: 0.12,            // flotación de las cápsulas desordenadas
  cameraStartZ: 9.5,    // distancia de la cámara arriba del todo
  cameraEndZ: 7.6,      // distancia al terminar el scroll (se acerca)
  offsetX: 0.2,         // posición horizontal (fracción del ancho visible)
}

const UP = new Vector3(0, 1, 0)
const HIGHLIGHTED = new Set([3, 8, 14, 19]) // citas destacadas (más brillantes)
const BASE_COLOR = new Color('#6d5bd0')
const HIGHLIGHT_COLOR = new Color('#d8ccff')

type Slot = { chaosPos: Vector3; chaosRot: Quaternion; orderPos: Vector3; phase: number }

// Generador pseudoaleatorio con semilla: el "caos" es siempre el mismo
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function useSlots(): Slot[] {
  return useMemo(() => {
    const { cols, rows } = HERO_SCENE
    const rand = seeded(11)
    return Array.from({ length: cols * rows }, (_, i) => {
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      const r = 1.9 + rand() * 0.9
      const chaosPos = new Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) * 0.65,
        r * Math.sin(phi) * Math.sin(theta),
      )
      const chaosRot = new Quaternion().setFromEuler(new Euler(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI))
      const col = i % cols
      const row = Math.floor(i / cols)
      const orderPos = new Vector3((col - (cols - 1) / 2) * 0.46, ((rows - 1) / 2 - row) * 0.34, 0.35)
      return { chaosPos, chaosRot, orderPos, phase: rand() * Math.PI * 2 }
    })
  }, [])
}

function Capsules({ progress }: { progress: RefObject<number> }) {
  const ref = useRef<InstancedMesh>(null)
  const slots = useSlots()
  const eased = useRef(0)

  // Objetos de trabajo reutilizados en cada fotograma (sin crear basura)
  const work = useMemo(() => ({
    dummy: new Object3D(),
    pos: new Vector3(),
    rot: new Quaternion(),
    spin: new Quaternion(),
    orderRot: new Quaternion().setFromEuler(new Euler(0, 0, Math.PI / 2)), // pastillas en horizontal
  }), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    slots.forEach((_, i) => mesh.setColorAt(i, HIGHLIGHTED.has(i) ? HIGHLIGHT_COLOR : BASE_COLOR))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [slots])

  useFrame((state, dt) => {
    const mesh = ref.current
    if (!mesh) return
    eased.current = MathUtils.damp(eased.current, progress.current ?? 0, HERO_SCENE.damping, dt)
    const p = eased.current
    const e = p * p * (3 - 2 * p) // curva suave
    const t = state.clock.elapsedTime
    const { dummy, pos, rot, spin, orderRot } = work

    spin.setFromAxisAngle(UP, t * HERO_SCENE.chaosSpin)
    slots.forEach((s, i) => {
      pos.copy(s.chaosPos).applyQuaternion(spin)
      pos.y += Math.sin(t * 0.8 + s.phase) * HERO_SCENE.bob
      pos.lerp(s.orderPos, e)
      rot.slerpQuaternions(s.chaosRot, orderRot, e)
      dummy.position.copy(pos)
      dummy.quaternion.copy(rot)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, slots.length]}>
      <capsuleGeometry args={[0.08, 0.26, 8, 16]} />
      <meshPhysicalMaterial color="#ffffff" metalness={0.35} roughness={0.38} clearcoat={0.8} clearcoatRoughness={0.25} />
    </instancedMesh>
  )
}

function Ring({ progress }: { progress: RefObject<number> }) {
  const ref = useRef<Group>(null)
  const eased = useRef(0)

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    eased.current = MathUtils.damp(eased.current, progress.current ?? 0, HERO_SCENE.damping, dt)
    const e = eased.current
    // Empieza inclinado como una órbita y acaba de frente, enmarcando la agenda
    g.rotation.x = MathUtils.lerp(1.15, 0, e)
    g.rotation.y = MathUtils.lerp(0.35, 0, e)
    g.scale.setScalar(MathUtils.lerp(1, 1.08, e))
  })

  return (
    <group ref={ref}>
      {/* Único material de cristal de la escena (es el más costoso) */}
      <mesh>
        <torusGeometry args={[1.6, 0.1, 48, 220]} />
        <meshPhysicalMaterial
          color="#a78bfa"
          transmission={0.9}
          thickness={0.6}
          ior={1.45}
          roughness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.05}
          attenuationColor="#6d28d9"
          attenuationDistance={1.2}
        />
      </mesh>
      {/* Marcas de las horas */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.36, Math.sin(a) * 1.36, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[i % 3 === 0 ? 0.14 : 0.07, 0.022, 0.022]} />
            <meshStandardMaterial color="#ede9fe" metalness={1} roughness={0.25} />
          </mesh>
        )
      })}
    </group>
  )
}

function Rig({ progress, onReady, children }: { progress: RefObject<number>; onReady?: () => void; children: React.ReactNode }) {
  const group = useRef<Group>(null)
  const eased = useRef(0)
  const notified = useRef(false)
  const { viewport, size } = useThree()

  const scale = MathUtils.clamp(size.width / 1500, 0.65, 0.95)
  const x = viewport.width * HERO_SCENE.offsetX

  useFrame((state, dt) => {
    // Avisa cuando ya se ha pintado el primer fotograma (para el fundido de entrada)
    if (!notified.current) {
      notified.current = true
      onReady?.()
    }
    const { pointer, camera } = state
    const k = HERO_SCENE.damping
    eased.current = MathUtils.damp(eased.current, progress.current ?? 0, k, dt)
    const z = MathUtils.lerp(HERO_SCENE.cameraStartZ, HERO_SCENE.cameraEndZ, eased.current)
    camera.position.set(
      MathUtils.damp(camera.position.x, pointer.x * HERO_SCENE.cursorDrift, k, dt),
      MathUtils.damp(camera.position.y, pointer.y * HERO_SCENE.cursorDrift * 0.6, k, dt),
      MathUtils.damp(camera.position.z, z, k, dt),
    )
    camera.lookAt(0, 0, 0)

    const g = group.current
    if (g) {
      g.rotation.y = MathUtils.damp(g.rotation.y, pointer.x * HERO_SCENE.cursorTilt, k, dt)
      g.rotation.x = MathUtils.damp(g.rotation.x, -pointer.y * HERO_SCENE.cursorTilt * 0.6, k, dt)
    }
  })

  return (
    <group position={[x, 0, 0]} scale={scale}>
      <group ref={group}>{children}</group>
    </group>
  )
}

export default function HeroScene({
  progress,
  active,
  onReady,
}: {
  progress: RefObject<number>
  active: boolean
  onReady?: () => void
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, HERO_SCENE.cameraStartZ], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      // El cursor se sigue en toda la página, no solo sobre el canvas
      eventSource={document.getElementById('root') ?? undefined}
      eventPrefix="client"
      tabIndex={-1}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} />
      <directionalLight position={[-5, -2, 3]} intensity={0.5} color="#a5b4fc" />

      {/* Luz de entorno generada en la escena: no descarga ningún HDR externo */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, -2]} rotation-x={Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#a78bfa" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[2, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#818cf8" position={[5, -1, -1]} rotation-y={-Math.PI / 2} scale={[2, 6, 1]} />
        <Lightformer form="ring" intensity={1.4} position={[2, 2, 5]} scale={2} />
      </Environment>

      <Rig progress={progress} onReady={onReady}>
        <Ring progress={progress} />
        <Capsules progress={progress} />
      </Rig>
    </Canvas>
  )
}
