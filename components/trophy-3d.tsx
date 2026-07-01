"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, Stage, Html } from "@react-three/drei"
import { Suspense, useRef, useEffect } from "react"
import * as THREE from "three"

const MODEL_PATH = "/world-cup-trophy/source/world cup trophy.glb"

function Model() {
  const { scene } = useGLTF(MODEL_PATH)
  const modelRef = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.8 // Velocidade de rotação
    }
  })

  return <primitive ref={modelRef} object={scene} scale={2.2} position={[0, -1.2, 0]} />
}

// Pré-carregamento do modelo para cache agressivo
useGLTF.preload(MODEL_PATH)

export function Trophy3D() {
  return (
    <div className="w-full h-72 md:h-96 relative pointer-events-none">
      <Canvas 
        shadows 
        gl={{ antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]} // Otimizado: 1.5 é suficiente para mobile/desktop sem pesar
        camera={{ position: [0, 0, 5], fov: 40 }}
      >
        <Suspense fallback={<Html center><div className="text-gold-soft animate-pulse whitespace-nowrap text-[10px] uppercase tracking-[0.2em]">Sincronizando Taça...</div></Html>}>
          <Stage environment="city" intensity={0.6} contactShadow={{ opacity: 0.8, blur: 2 }} adjustCamera={false}>
            <Model />
          </Stage>
        </Suspense>
      </Canvas>
    </div>
  )
}
