"use client"

import { useEffect, useState } from "react"

export function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Show GIF for 3 seconds then fade out
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onFinished, 600)
    }, 3000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.6s ease",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <img
        src="/images/fifa-world-cup-2026-trophy.gif"
        alt="Copa do Mundo FIFA 2026"
        style={{
          height: "min(70vh, 560px)",
          width: "auto",
          objectFit: "contain",
        }}
      />

      {/* Footer credit */}
      <div
        style={{
          position: "absolute",
          bottom: "28px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "oklch(0.45 0.03 80)",
          fontSize: "11px",
          fontWeight: 500,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "0.04em",
        }}
      >
        <span>Powered by</span>
        <img
          src="/images/bbm-space-logo.png"
          alt="BBM Space"
          style={{ height: "14px", width: "auto", borderRadius: "3px" }}
        />
        <span>BBM Space</span>
      </div>
    </div>
  )
}
