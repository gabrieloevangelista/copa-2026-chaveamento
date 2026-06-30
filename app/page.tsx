"use client"

import { useState } from "react"
import { WorldCupBracket } from "@/components/world-cup-bracket"
import { SplashScreen } from "@/components/splash-screen"

export default function Page() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <main className="w-full bg-background" style={{ height: "100dvh", overflow: "hidden" }}>
      {/* Splash screen — desktop only, hidden on mobile via CSS */}
      <div className="hidden md:block">
        {!splashDone && (
          <SplashScreen onFinished={() => setSplashDone(true)} />
        )}
      </div>

      {/* Bracket — always visible on mobile, fades in after splash on desktop */}
      <div
        className={
          /* on desktop: hidden until splash finishes; on mobile: always shown */
          !splashDone
            ? "md:invisible md:opacity-0 md:pointer-events-none"
            : "md:visible md:opacity-100"
        }
        style={{ height: "100%" }}
      >
        <WorldCupBracket />
      </div>
    </main>
  )
}
