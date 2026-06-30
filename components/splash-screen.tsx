"use client"

import { useEffect, useRef, useState } from "react"

export function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [opacity, setOpacity] = useState(1)
  const [display, setDisplay] = useState<"flex" | "none">("flex")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Show GIF for 3 seconds, then fade out over 600ms, then remove from DOM
    timerRef.current = setTimeout(() => {
      setOpacity(0)
      timerRef.current = setTimeout(() => {
        setDisplay("none")
        onFinished()
      }, 650)
    }, 3000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (display === "none") return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: "#000000",
        display: display,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        // Cross-browser transition (Safari, Chrome, Firefox, Opera)
        WebkitTransition: "opacity 0.65s ease",
        MozTransition: "opacity 0.65s ease",
        OTransition: "opacity 0.65s ease",
        transition: "opacity 0.65s ease",
        opacity: opacity,
        // Prevent interaction during fade-out
        pointerEvents: opacity === 1 ? "auto" : "none",
        // Prevent any scroll or touch bleed through
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Trophy GIF — centered, large, responsive */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          width: "100%",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <img
          src="/images/fifa-world-cup-2026-trophy.gif"
          alt="Copa do Mundo FIFA 2026"
          // No lazy loading — preload immediately
          loading="eager"
          decoding="async"
          style={{
            // Responsive: fill most of the viewport
            maxHeight: "70vh",
            maxWidth: "90vw",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            // Crisp rendering on all browsers
            imageRendering: "auto",
            // Force GPU layer for smoother GIF playback
            WebkitTransform: "translateZ(0)",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        />
      </div>

      {/* Footer — "Powered by BBM Space" */}
      <div
        style={{
          paddingBottom: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          color: "rgba(200, 180, 120, 0.5)",
          fontSize: "11px",
          fontWeight: 500,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          letterSpacing: "0.05em",
        }}
      >
        <span>Powered by</span>
        <img
          src="/images/bbm-space-logo.png"
          alt="BBM Space"
          loading="eager"
          style={{
            height: "14px",
            width: "auto",
            borderRadius: "3px",
            display: "block",
          }}
        />
        <span>BBM Space</span>
      </div>
    </div>
  )
}
