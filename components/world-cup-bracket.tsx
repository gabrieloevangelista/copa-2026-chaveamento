"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RotateCcw, X, Volume2, VolumeX, Calendar } from "lucide-react"
import confetti from "canvas-confetti"
import { TEAMS, type Team, flagUrl } from "@/components/teams"

// Anéis do mais externo (32 times) ao mais interno (2 finalistas).
// radius = distância do centro em % da largura do palco; size = tamanho em % do palco.
const RINGS = [
  { count: 32, radius: 42.5, size: 6.0 }, // 16-avos
  { count: 16, radius: 34.0, size: 5.4 }, // oitavas
  { count: 8, radius: 25.5, size: 5.0 }, // quartas
  { count: 4, radius: 17.5, size: 4.6 }, // semis
  { count: 2, radius: 10.5, size: 4.2 }, // final
]

const GOLD = "oklch(0.82 0.13 80)"

// Rótulos das fases posicionados nos espaços entre os anéis (no eixo superior).
const PHASE_LABELS = [
  { text: "Oitavas", date: "04 a 07/07", radius: (RINGS[0].radius + RINGS[1].radius) / 2 },
  { text: "Quartas", date: "09 a 11/07", radius: (RINGS[1].radius + RINGS[2].radius) / 2 },
  { text: "Semis", date: "14 e 15/07", radius: (RINGS[2].radius + RINGS[3].radius) / 2 },
  { text: "Final", date: "19 de Julho", radius: (RINGS[3].radius + RINGS[4].radius) / 2 },
]

const round = (n: number) => Math.round(n * 1000) / 1000

function nodeAngle(ring: number, index: number) {
  const { count } = RINGS[ring]
  return ((index + 0.5) / count) * Math.PI * 2 - Math.PI / 2
}

function pointOnRing(radius: number, angle: number) {
  return {
    left: round(50 + radius * Math.cos(angle)),
    top: round(50 + radius * Math.sin(angle)),
  }
}

function nodePos(ring: number, index: number) {
  return pointOnRing(RINGS[ring].radius, nodeAngle(ring, index))
}

function getMatchDate(ring: number, index: number): string | null {
  if (ring === 0) return null
  if (ring === 1) {
    const matchIdx = Math.floor(index / 2)
    if (matchIdx === 0) return "04 de Julho"
    if (matchIdx === 1) return "06 de Julho"
    if (matchIdx === 2) return "06 de Julho"
    if (matchIdx === 3) return "04 de Julho"
    if (matchIdx === 4) return "05 de Julho"
    if (matchIdx === 5) return "05 de Julho"
    if (matchIdx === 6) return "07 de Julho"
    if (matchIdx === 7) return "07 de Julho"
  }
  if (ring === 2) {
    const matchIdx = Math.floor(index / 2)
    if (matchIdx === 0) return "09 de Julho"
    if (matchIdx === 1) return "10 de Julho"
    if (matchIdx === 2) return "10 de Julho"
    if (matchIdx === 3) return "11 de Julho"
  }
  if (ring === 3) {
    const matchIdx = Math.floor(index / 2)
    if (matchIdx === 0) return "14 de Julho"
    if (matchIdx === 1) return "15 de Julho"
  }
  if (ring === 4) {
    return "19 de Julho"
  }
  return null
}

type Winners = Record<string, Team>

const STORAGE_KEY = "fifa-2026-bracket"

export function WorldCupBracket() {
  const [winners, setWinners] = useState<Winners>({})
  const [champion, setChampion] = useState<Team | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(true)
  const [scale, setScale] = useState(1)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const lastChampionId = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  // Touch references to track touch state
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const pinchStartDistRef = useRef<number | null>(null)
  const scaleStartRef = useRef<number>(1)
  const dragPosStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Active event listeners for passive-avoidance wheel and touch moves
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      setScale((prev) => Math.max(0.5, Math.min(3, prev - e.deltaY * 0.001)))
    }

    const handleTouchMoveDefault = (e: TouchEvent) => {
      // Prevent screen scrolling when dragging the canvas
      if (e.touches.length <= 2) {
        e.preventDefault()
      }
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false })
    canvas.addEventListener("touchmove", handleTouchMoveDefault, { passive: false })

    return () => {
      canvas.removeEventListener("wheel", handleWheel)
      canvas.removeEventListener("touchmove", handleTouchMoveDefault)
    }
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
      dragPosStartRef.current = { ...dragPos }
      pinchStartDistRef.current = null
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
      pinchStartDistRef.current = dist
      scaleStartRef.current = scale
      
      const midX = (touch1.clientX + touch2.clientX) / 2
      const midY = (touch1.clientY + touch2.clientY) / 2
      touchStartRef.current = { x: midX, y: midY }
      dragPosStartRef.current = { ...dragPos }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y
      setDragPos({
        x: dragPosStartRef.current.x + deltaX,
        y: dragPosStartRef.current.y + deltaY,
      })
    } else if (e.touches.length === 2 && pinchStartDistRef.current && touchStartRef.current) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
      
      const factor = dist / pinchStartDistRef.current
      const newScale = Math.max(0.5, Math.min(3, scaleStartRef.current * factor))
      setScale(newScale)
      
      const midX = (touch1.clientX + touch2.clientX) / 2
      const midY = (touch1.clientY + touch2.clientY) / 2
      const deltaX = midX - touchStartRef.current.x
      const deltaY = midY - touchStartRef.current.y
      setDragPos({
        x: dragPosStartRef.current.x + deltaX,
        y: dragPosStartRef.current.y + deltaY,
      })
    }
  }

  const handleTouchEnd = () => {
    touchStartRef.current = null
    pinchStartDistRef.current = null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - dragPos.x, y: e.clientY - dragPos.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setDragPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Estado pré-carregado: Brasil, Marrocos, Suíça, Paraguai, Canadá nas oitavas
  const DEFAULT_WINNERS: Winners = {
    "1-0": TEAMS[1],   // Canadá (1) vence África do Sul (0)
    "1-1": TEAMS[3],   // Marrocos (3) vence Holanda (2)
    "1-7": TEAMS[14],  // Paraguai (14) vence Alemanha (15)
    "1-8": TEAMS[16],  // Brasil (16) vence Japão (17)
    "1-14": TEAMS[29], // Suíça (29) vence Argélia (28)
  }

  // Recupera o estado do localStorage ao montar.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { winners: w, champion: c } = JSON.parse(saved)
        const mappedWinners: Winners = {}
        if (w) {
          for (const [key, val] of Object.entries(w)) {
            const fullTeam = TEAMS.find((t) => t.id === (val as any).id)
            if (fullTeam) mappedWinners[key] = fullTeam
          }
        }
        setWinners(mappedWinners)
        if (c) setChampion(TEAMS.find((t) => t.id === c.id) || null)
      } else {
        // Primeira vez: usar estado pré-carregado
        setWinners(DEFAULT_WINNERS)
      }
    } catch (e) {
      console.error("[v0] Erro ao recuperar estado:", e)
    }
    setIsLoaded(true)
  }, [])

  // Salva o estado sempre que winners ou champion mudam.
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          winners: Object.fromEntries(
            Object.entries(winners).map(([k, team]) => [k, { id: team.id }])
          ),
          champion: champion ? { id: champion.id } : null,
        })
      )
    } catch (e) {
      console.error("[v0] Erro ao salvar estado:", e)
    }
  }, [winners, champion, isLoaded])

  // Dispara o confete em ondas a partir das laterais.
  const fireConfetti = useCallback(() => {
    const end = Date.now() + 1500
    const colors = ["#e9b949", "#f5d76e", "#ffffff", "#16a34a"]
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        startVelocity: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      })
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        startVelocity: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
    // Estouro central dourado
    confetti({
      particleCount: 160,
      spread: 100,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.45 },
      colors,
    })
  }, [])

  // Ao coroar um novo campeão: celebração + pop-up + música.
  useEffect(() => {
    if (champion && champion.id !== lastChampionId.current) {
      lastChampionId.current = champion.id
      setShowCelebration(true)
      fireConfetti()
      // Toca a trilha da Copa a partir de 0:34.5 desmutado
      if (audioRef.current) {
        audioRef.current.currentTime = 34.5
        audioRef.current.muted = false
        const playPromise = audioRef.current.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            console.log("[v0] Autoplay bloqueado")
          })
        }
      }
    }
    if (!champion) {
      lastChampionId.current = null
      setShowCelebration(false)
      // Para a música
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [champion, fireConfetti])

  const teamAt = (ring: number, index: number): Team | null => {
    if (ring === 0) return TEAMS[index]
    return winners[`${ring}-${index}`] ?? null
  }

  function pick(ring: number, index: number) {
    const team = teamAt(ring, index)
    if (!team) return

    if (ring === 4) {
      setChampion((prev) => (prev?.id === team.id ? prev : team))
      return
    }

    const parentRing = ring + 1
    const parentIndex = Math.floor(index / 2)
    const key = `${parentRing}-${parentIndex}`

    setWinners((prev) => {
      if (prev[key]?.id === team.id) return prev
      const next = { ...prev, [key]: team }
      // Limpa todos os vencedores a montante (mais perto do centro) deste confronto.
      let r = parentRing + 1
      let i = Math.floor(parentIndex / 2)
      while (r <= 4) {
        delete next[`${r}-${i}`]
        i = Math.floor(i / 2)
        r++
      }
      return next
    })
    setChampion(null)
  }

  function reset() {
    setWinners(DEFAULT_WINNERS)
    setChampion(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Verifica se um time perdeu em seu confronto (tem um rival que avançou no mesmo nó).
  function hasLost(ring: number, index: number, team: Team | null): boolean {
    if (!team) return false
    const parentRing = ring + 1
    const parentIndex = Math.floor(index / 2)
    const winner = winners[`${parentRing}-${parentIndex}`]
    // Se há um vencedor neste nó e não é este time, então este perdeu.
    return !!winner && winner.id !== team.id
  }

  // Alterna reprodução de áudio
  function toggleAudio() {
    if (!audioRef.current) return
    if (isAudioPlaying) {
      audioRef.current.pause()
      setIsAudioPlaying(false)
    } else {
      audioRef.current.play().catch(() => {
        console.log("[v0] Falha ao reproduzir áudio")
      })
      setIsAudioPlaying(true)
    }
  }

  // Chave interligada: um arco liga os dois confrontos de cada par e um
  // conector radial leva do meio do arco até o nó da etapa seguinte.
  const { arcs, connectors } = useMemo(() => {
    const arcs: { d: string; active: boolean; key: string }[] = []
    const connectors: {
      x1: number
      y1: number
      x2: number
      y2: number
      active: boolean
      key: string
    }[] = []

    for (let ring = 0; ring < 4; ring++) {
      const { radius } = RINGS[ring]
      const parentRing = ring + 1
      for (let p = 0; p < RINGS[parentRing].count; p++) {
        const aIdx = p * 2
        const bIdx = p * 2 + 1
        const aAngle = nodeAngle(ring, aIdx)
        const bAngle = nodeAngle(ring, bIdx)
        const a = pointOnRing(radius, aAngle)
        const b = pointOnRing(radius, bAngle)
        arcs.push({
          key: `arc-${ring}-${p}`,
          d: `M ${a.left} ${a.top} A ${radius} ${radius} 0 0 1 ${b.left} ${b.top}`,
          active: !!winners[`${parentRing}-${p}`],
        })
        const midAngle = (aAngle + bAngle) / 2
        const mid = pointOnRing(radius, midAngle)
        const parent = nodePos(parentRing, p)
        connectors.push({
          key: `con-${ring}-${p}`,
          x1: mid.left,
          y1: mid.top,
          x2: parent.left,
          y2: parent.top,
          active: !!winners[`${parentRing}-${p}`],
        })
      }
    }

    // Final: arco ligando os dois finalistas e conector até a taça (centro).
    const fRadius = RINGS[4].radius
    const fa = pointOnRing(fRadius, nodeAngle(4, 0))
    const fb = pointOnRing(fRadius, nodeAngle(4, 1))
    arcs.push({
      key: "arc-final",
      d: `M ${fa.left} ${fa.top} A ${fRadius} ${fRadius} 0 0 1 ${fb.left} ${fb.top}`,
      active: !!champion,
    })
    const midFinal = pointOnRing(fRadius, (nodeAngle(4, 0) + nodeAngle(4, 1)) / 2)
    connectors.push({
      key: "con-final",
      x1: midFinal.left,
      y1: midFinal.top,
      x2: 50,
      y2: 50,
      active: !!champion,
    })

    return { arcs, connectors }
  }, [winners, champion])

  // Pequenos pontos de junção em cada nó interno (oitavas → final).
  const junctions = useMemo(() => {
    const result: { x: number; y: number; active: boolean; key: string }[] = []
    for (let ring = 1; ring <= 4; ring++) {
      for (let i = 0; i < RINGS[ring].count; i++) {
        const pos = nodePos(ring, i)
        const team = winners[`${ring}-${i}`] ?? null
        let active = false
        if (team) {
          if (ring === 4) active = champion?.id === team.id
          else active = winners[`${ring + 1}-${Math.floor(i / 2)}`]?.id === team.id
        }
        result.push({ key: `j-${ring}-${i}`, x: pos.left, y: pos.top, active })
      }
    }
    return result
  }, [winners, champion])

  // Um nó "avançou" se é o vencedor escolhido do seu confronto.
  function hasAdvanced(ring: number, index: number, team: Team | null) {
    if (!team) return false
    if (ring === 4) return champion?.id === team.id
    const parentWinner = winners[`${ring + 1}-${Math.floor(index / 2)}`]
    return parentWinner?.id === team.id
  }

  const filledCount = Object.keys(winners).length + (champion ? 1 : 0)
  const totalPicks = 16 + 8 + 4 + 2 + 1 // 31 confrontos no total

  return (
    <div className="relative w-full h-full flex flex-col bg-background overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 w-full bg-background/90 px-4 py-3 border-b border-border/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/images/fifa-2026-logo.jpg"
            alt="Logo FIFA World Cup 2026"
            className="size-9 rounded-md object-cover md:size-11"
          />
          <span className="text-left">
            <span className="block text-[8px] font-bold uppercase tracking-[0.2em] text-gold-soft leading-none">
              FIFA World Cup
            </span>
            <span className="block font-heading text-sm font-bold text-foreground">
              Copa do Mundo 2026
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {champion ? (
            <div className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 py-1 pl-1.5 pr-3">
              <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-card ring-2 ring-gold">
                <img
                  src={flagUrl(champion.slug) || "/placeholder.svg"}
                  alt={`Bandeira ${champion.name}`}
                  className="size-6 rounded-full object-cover"
                />
              </span>
              <span className="text-left leading-none">
                <span className="block text-[8px] font-medium uppercase tracking-widest text-gold-soft">
                  Campeão
                </span>
                <span className="block font-heading text-xs font-bold text-foreground">
                  {champion.name}
                </span>
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">
              {filledCount}/{totalPicks} <span className="hidden sm:inline">confrontos</span>
            </span>
          )}

          {/* Desktop Actions (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCalendar(true)}
              aria-label="Calendário"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Calendar className="size-3.5" />
              <span>Calendário</span>
            </button>

            <button
              type="button"
              onClick={reset}
              aria-label="Reiniciar"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <RotateCcw className="size-3.5" />
              <span>Reiniciar</span>
            </button>

            <button
              type="button"
              onClick={toggleAudio}
              aria-label={isAudioPlaying ? "Mudar para Mudo" : "Mudar para Áudio"}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              {isAudioPlaying ? <Volume2 className="size-3.5 text-gold-soft" /> : <VolumeX className="size-3.5" />}
              <span>Música</span>
            </button>
          </div>
        </div>
      </header>

      {/* Palco radial com drag/zoom para mobile e desktop */}
      <div 
        ref={canvasRef}
        className="hidden-scrollbar absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center z-10"
        style={{
          userSelect: "none",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="relative w-full max-w-[900px] aspect-square flex items-center justify-center" 
          style={{ 
            transform: `translate(${dragPos.x}px, ${dragPos.y}px) scale(${scale})`,
            transformOrigin: "center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          {/* Linhas conectoras */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 size-full"
            aria-hidden="true"
          >
            <defs>
              <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="0.5"
                  floodColor="oklch(0.82 0.13 80)"
                  floodOpacity="0.55"
                />
              </filter>
              <filter id="goldGlowStrong" x="-80%" y="-80%" width="260%" height="260%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="0.9"
                  floodColor="oklch(0.82 0.13 80)"
                  floodOpacity="0.9"
                />
              </filter>
            </defs>

            {/* Anel fino ao redor da taça */}
            <circle
              cx={50}
              cy={50}
              r={10}
              fill="none"
              stroke={GOLD}
              strokeOpacity={0.4}
              strokeWidth={0.22}
              filter="url(#goldGlow)"
            />
            {/* Arcos ligando cada par de confrontos da etapa */}
            {arcs.map((a) => (
              <path
                key={a.key}
                d={a.d}
                fill="none"
                stroke={GOLD}
                strokeOpacity={a.active ? 1 : 0.75}
                strokeWidth={a.active ? 0.7 : 0.5}
                strokeLinecap="round"
                filter={a.active ? "url(#goldGlowStrong)" : "url(#goldGlow)"}
              />
            ))}
            {/* Conectores do arco até a etapa seguinte */}
            {connectors.map((c) => (
              <line
                key={c.key}
                x1={c.x1}
                y1={c.y1}
                x2={c.x2}
                y2={c.y2}
                stroke={GOLD}
                strokeOpacity={c.active ? 1 : 0.75}
                strokeWidth={c.active ? 0.7 : 0.5}
                strokeLinecap="round"
                filter={c.active ? "url(#goldGlowStrong)" : "url(#goldGlow)"}
              />
            ))}
            {/* Pontos de junção em cada nó */}
            {junctions.map((j) => (
              <circle
                key={j.key}
                cx={j.x}
                cy={j.y}
                r={j.active ? 0.6 : 0.42}
                fill={GOLD}
                fillOpacity={j.active ? 1 : 0.5}
                filter={j.active ? "url(#goldGlowStrong)" : "url(#goldGlow)"}
              />
            ))}
            {/* Rótulos das fases (no eixo superior, entre os anéis) */}
            {PHASE_LABELS.map((label) => (
              <g key={label.text}>
                <text
                  x={50}
                  y={50 - label.radius - 0.7}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={GOLD}
                  fillOpacity={0.85}
                  fontSize={1.2}
                  fontWeight={700}
                  letterSpacing={0.25}
                  style={{ textTransform: "uppercase" }}
                >
                  {label.text}
                </text>
                <text
                  x={50}
                  y={50 - label.radius + 0.8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={GOLD}
                  fillOpacity={0.55}
                  fontSize={0.7}
                  fontWeight={500}
                  letterSpacing={0.1}
                >
                  {label.date}
                </text>
              </g>
            ))}
          </svg>

          {/* Brilho central + taça */}
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold blur-2xl transition-all duration-700 ${
              champion
                ? "size-[45%] opacity-60 animate-pulse"
                : "size-[26%] opacity-20"
            }`}
          />
          <div className="absolute left-1/2 top-1/2 z-10 flex size-[15%] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <img
              src="/images/trophy.png"
              alt="Taça da Copa do Mundo"
              className={`size-full object-contain transition-all duration-700 ${
                champion
                  ? "scale-110 drop-shadow-[0_0_38px_oklch(0.85_0.15_82/0.95)]"
                  : "drop-shadow-[0_0_18px_oklch(0.82_0.13_80/0.55)]"
              }`}
            />
          </div>

          {/* Nós de cada anel */}
          {RINGS.map((ringCfg, ring) =>
            Array.from({ length: ringCfg.count }).map((_, index) => {
              const team = teamAt(ring, index)
              const pos = nodePos(ring, index)
              const advanced = hasAdvanced(ring, index, team)
              const lost = hasLost(ring, index, team)
              return (
                <Node
                  key={`${ring}-${index}`}
                  team={team}
                  size={ringCfg.size}
                  left={pos.left}
                  top={pos.top}
                  advanced={advanced}
                  lost={lost}
                  date={getMatchDate(ring, index)}
                  onClick={() => pick(ring, index)}
                />
              )
            }),
          )}
        </div>
      </div>

      {/* Controles de zoom flutuantes */}
      <div className="fixed bottom-24 right-3 z-40 flex flex-col gap-1.5 md:hidden">
        <button
          type="button"
          onClick={() => setScale(Math.min(3, scale + 0.2))}
          className="inline-flex size-8 items-center justify-center rounded-full bg-gold text-background font-bold transition-transform hover:scale-110 shadow-lg"
          title="Ampliar"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setScale(Math.max(0.5, scale - 0.2))}
          className="inline-flex size-8 items-center justify-center rounded-full bg-gold text-background font-bold transition-transform hover:scale-110 shadow-lg"
          title="Reduzir"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => { setScale(1); setDragPos({ x: 0, y: 0 }); }}
          className="inline-flex size-8 items-center justify-center rounded-full bg-gold/70 text-background text-xs font-bold transition-transform hover:scale-110 shadow-lg"
          title="Reset"
        >
          ↺
        </button>
      </div>

      {/* Bottom Tabbar for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 border-t border-border/40 backdrop-blur-md flex items-center justify-around py-2 pb-safe md:hidden">
        <button
          type="button"
          onClick={() => setShowCalendar(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-gold-soft transition-colors"
        >
          <Calendar className="size-5" />
          <span>Calendário</span>
        </button>

        <button
          type="button"
          onClick={reset}
          className="flex flex-col items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-gold-soft transition-colors"
        >
          <RotateCcw className="size-5" />
          <span>Reiniciar</span>
        </button>

        <button
          type="button"
          onClick={toggleAudio}
          className="flex flex-col items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-gold-soft transition-colors"
        >
          {isAudioPlaying ? (
            <Volume2 className="size-5 text-gold-soft animate-pulse" />
          ) : (
            <VolumeX className="size-5" />
          )}
          <span>Música</span>
        </button>
      </nav>

      {/* Footer com logo e link BBM Space */}
      <a
        href="https://bbmspace.com"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-14 left-0 right-0 md:bottom-2 z-30 flex items-center justify-center gap-1.5 px-2 py-1 text-[10px] font-medium text-muted-foreground/50 transition-colors hover:text-gold-soft md:text-xs md:relative md:bg-transparent md:py-1.5"
        title="BBM Space"
      >
        <span>Powered by</span>
        <img
          src="/images/bbm-space-logo.png"
          alt="BBM Space logo"
          className="size-3.5 rounded transition-transform group-hover:scale-110"
        />
        <span>BBM Space</span>
      </a>

      {/* Áudio da trilha oficial da Copa 2026 */}
      <audio
        ref={audioRef}
        loop
        crossOrigin="anonymous"
        onPlay={() => setIsAudioPlaying(true)}
        onPause={() => setIsAudioPlaying(false)}
      >
        <source
          src="/audio/fifa-2026-theme.mp3"
          type="audio/mpeg"
        />
      </audio>

      {/* Pop-up de celebração do campeão */}
      {champion && showCelebration && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Campeão: ${champion.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setShowCelebration(false)}
        >
          <div
            className="relative flex w-full max-w-md flex-col items-center gap-6 overflow-hidden rounded-2xl border border-gold/40 bg-card px-6 py-10 text-center shadow-[0_0_60px_oklch(0.82_0.13_80/0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Brilho de fundo do card */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/15 blur-3xl" />

            <button
              type="button"
              onClick={() => setShowCelebration(false)}
              aria-label="Fechar"
              className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <p className="relative z-10 text-xs font-medium uppercase tracking-[0.4em] text-gold-soft">
              Campeão Mundial 2026
            </p>

            {/* Taça oficial no topo */}
            <img
              src="/images/trophy.png"
              alt="Taça da Copa do Mundo"
              className="relative z-10 h-32 w-auto object-contain drop-shadow-[0_0_30px_oklch(0.85_0.15_82/0.9)]"
            />

            <h2 className="relative z-10 text-balance font-heading text-3xl font-bold tracking-tight text-foreground">
              {champion.name}
            </h2>

            {/* Bandeira do campeão em destaque */}
            <span className="relative z-10 flex size-36 items-center justify-center overflow-hidden rounded-full bg-card ring-4 ring-gold shadow-[0_0_30px_oklch(0.82_0.13_80/0.7)]">
              <img
                src={flagUrl(champion.slug) || "/placeholder.svg"}
                alt={`Bandeira ${champion.name}`}
                className="size-full scale-[1.45] rounded-full object-cover"
              />
            </span>

            <button
              type="button"
              onClick={toggleAudio}
              aria-label={isAudioPlaying ? "Desativar som" : "Ativar som"}
              className="relative z-10 inline-flex items-center justify-center rounded-full border border-gold/40 bg-gold/10 p-3 text-gold transition-colors hover:bg-gold hover:text-background"
            >
              {isAudioPlaying ? (
                <Volume2 className="size-6" />
              ) : (
                <VolumeX className="size-6" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Pop-up do Calendário */}
      {showCalendar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Calendário da Fase Final"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setShowCalendar(false)}
        >
          <div
            className="relative flex w-full max-w-md flex-col items-center gap-6 overflow-hidden rounded-2xl border border-gold/40 bg-card px-6 py-8 text-center shadow-[0_0_60px_oklch(0.82_0.13_80/0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Brilho de fundo */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/5 blur-3xl" />

            <button
              type="button"
              onClick={() => setShowCalendar(false)}
              aria-label="Fechar"
              className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <h3 className="relative z-10 font-heading text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Calendar className="size-5 text-gold-soft" />
              Calendário da Fase Final
            </h3>

            {/* Linha do tempo / Agenda */}
            <div className="relative z-10 w-full text-left flex flex-col gap-4 mt-2">
              <div className="relative pl-6 border-l border-gold/20 flex flex-col gap-5">
                
                {/* Item 1 */}
                <div className="relative">
                  <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-gold border-2 border-card" />
                  <span className="block text-xs font-bold uppercase tracking-wider text-gold-soft">
                    04 a 07 de Julho
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Oitavas de Final
                  </span>
                </div>

                {/* Item 2 */}
                <div className="relative opacity-60">
                  <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-muted border-2 border-card" />
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    08 de Julho
                  </span>
                  <span className="text-sm text-foreground">
                    Descanso (Sem jogos)
                  </span>
                </div>

                {/* Item 3 */}
                <div className="relative">
                  <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-gold border-2 border-card" />
                  <span className="block text-xs font-bold uppercase tracking-wider text-gold-soft">
                    09 a 11 de Julho
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Quartas de Final
                  </span>
                </div>

                {/* Item 4 */}
                <div className="relative opacity-60">
                  <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-muted border-2 border-card" />
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    12 e 13 de Julho
                  </span>
                  <span className="text-sm text-foreground">
                    Descanso (Sem jogos)
                  </span>
                </div>

                {/* Item 5 */}
                <div className="relative">
                  <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-gold border-2 border-card" />
                  <span className="block text-xs font-bold uppercase tracking-wider text-gold-soft">
                    14 e 15 de Julho
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Semifinais
                  </span>
                </div>

                {/* Item 6 */}
                <div className="relative opacity-60">
                  <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-muted border-2 border-card" />
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    16 e 17 de Julho
                  </span>
                  <span className="text-sm text-foreground">
                    Descanso (Sem jogos)
                  </span>
                </div>

                {/* Item 7 */}
                <div className="relative">
                  <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-gold border-2 border-card" />
                  <span className="block text-xs font-bold uppercase tracking-wider text-gold-soft">
                    18 de Julho
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Disputa do 3º Lugar
                  </span>
                </div>

                {/* Item 8 */}
                <div className="relative">
                  <div className="absolute -left-[29px] top-1 size-3.5 rounded-full bg-gold shadow-[0_0_8px_oklch(0.82_0.13_80)] border-2 border-card" />
                  <span className="block text-xs font-bold uppercase tracking-wider text-gold-soft">
                    19 de Julho
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    Grande Final
                  </span>
                </div>

              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCalendar(false)}
              className="relative z-10 w-full rounded-full border border-gold/40 bg-gold/10 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold hover:text-background mt-2"
            >
              Fechar Calendário
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Node({
  team,
  size,
  left,
  top,
  advanced,
  lost,
  date,
  onClick,
}: {
  team: Team | null
  size: number
  left: number
  top: number
  advanced: boolean
  lost: boolean
  date: string | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!team}
      title={
        team
          ? `${team.name}${date ? ` (Jogo: ${date})` : ""}`
          : `Aguardando confronto${date ? ` (${date})` : ""}`
      }
      aria-label={
        team
          ? `Avançar ${team.name}${date ? ` - Jogo em ${date}` : ""}`
          : `Aguardando confronto${date ? ` em ${date}` : ""}`
      }
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold enabled:hover:scale-110"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
      }}
    >
      {team ? (
        <span
          className={`flex size-full items-center justify-center overflow-hidden rounded-full bg-card shadow-md ring-2 transition-all duration-500 ${
            lost
              ? "ring-border opacity-50"
              : advanced
                ? "ring-gold shadow-[0_0_14px_oklch(0.82_0.13_80/0.6)]"
                : "ring-border"
          }`}
        >
          <img
            src={flagUrl(team.slug) || "/placeholder.svg"}
            alt={`Bandeira ${team.name}`}
            loading="lazy"
            className={`size-full scale-[1.45] rounded-full object-cover transition-all duration-500 ${
              lost ? "grayscale" : ""
            }`}
          />
        </span>
      ) : null}
    </button>
  )
}
