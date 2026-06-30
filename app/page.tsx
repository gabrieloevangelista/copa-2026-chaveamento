"use client"

import { useState } from "react"
import { WorldCupBracket } from "@/components/world-cup-bracket"
import { SplashScreen } from "@/components/splash-screen"

export default function Page() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <main className="w-full bg-background" style={{ height: "100dvh", overflow: "hidden" }}>
      {/* Splash screen — all devices, all browsers */}
      {!splashDone && (
        <SplashScreen onFinished={() => setSplashDone(true)} />
      )}

      {/* Bracket — rendered always but hidden until splash finishes */}
      <div
        style={{
          height: "100%",
          visibility: splashDone ? "visible" : "hidden",
          opacity: splashDone ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        <WorldCupBracket />
      </div>
    </main>
  )
}
