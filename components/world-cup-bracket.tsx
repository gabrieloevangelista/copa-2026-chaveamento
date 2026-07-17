"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RotateCcw, X, Volume2, VolumeX, Calendar, Download } from "lucide-react"
import confetti from "canvas-confetti"
import { TEAMS, type Team, flagUrl, TEAM_COLORS } from "@/components/teams"
import { Trophy3D } from "@/components/trophy-3d"

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
  const matchIdx = Math.floor(index / 2)
  if (ring === 1) {
    if (matchIdx === 0 || matchIdx === 1) return "04 de Julho"
    if (matchIdx === 4 || matchIdx === 5) return "05 de Julho"
    if (matchIdx === 2 || matchIdx === 3) return "06 de Julho"
    if (matchIdx === 6 || matchIdx === 7) return "07 de Julho"
  }
  if (ring === 2) {
    if (matchIdx === 0) return "09 de Julho"
    if (matchIdx === 1) return "10 de Julho"
    if (matchIdx === 2 || matchIdx === 3) return "11 de Julho"
  }
  if (ring === 3) {
    if (matchIdx === 0) return "14 de Julho"
    if (matchIdx === 1) return "15 de Julho"
  }
  if (ring === 4) {
    return "19 de Julho"
  }
  return null
}

export type MatchInfo = {
  phase: string
  date: string
  time: string
  t1: Team | null
  t2: Team | null
  score: string | null
  status: string
}

export type LiveMatchState = {
  matchId: string
  t1: Team
  t2: Team
  t1Score: number
  t2Score: number
  minute: number
  scorer: string
  isActive: boolean
  status?: "live" | "halftime" | "finished"
}

function getMatchInfo(
  ring: number,
  index: number,
  winners: Winners,
  champion: Team | null,
  liveMatch: LiveMatchState | null
): MatchInfo {
  const matchIdx = Math.floor(index / 2)
  const activeItem = ring === 0 ? SCHEDULE[matchIdx] : null

  const teamAtLocal = (r: number, idx: number): Team | null => {
    if (r === 0) return TEAMS[idx]
    return winners[`${r}-${idx}`] ?? null
  }

  const t1 = teamAtLocal(ring, matchIdx * 2)
  const t2 = teamAtLocal(ring, matchIdx * 2 + 1)

  const phases = ["16-avos de final", "Oitavas de final", "Quartas de final", "Semifinal", "Final"]
  const phase = phases[ring]

  // Se for a partida ao vivo no momento, sobrescreve os dados com o placar ao vivo
  if (liveMatch && t1 && t2 && ((t1.id === liveMatch.t1.id && t2.id === liveMatch.t2.id) || (t1.id === liveMatch.t2.id && t2.id === liveMatch.t1.id))) {
    return {
      phase,
      date: "AO VIVO",
      time: liveMatch.status === "halftime" ? "Intervalo" : `${liveMatch.minute}'`,
      t1,
      t2,
      score: t1.id === liveMatch.t1.id
        ? `${liveMatch.t1Score} x ${liveMatch.t2Score}`
        : `${liveMatch.t2Score} x ${liveMatch.t1Score}`,
      status: "AO VIVO"
    }
  }

  let date = ""
  let time = ""
  let score: string | null = null
  let status = "A definir"

  if (ring === 0 && activeItem) {
    date = activeItem.dateLabel
    time = activeItem.timeLabel

    const isFinished = !!winners[`1-${matchIdx}`]

    if (isFinished) {
      const res = getDeterministicMatchResult(activeItem.id)
      score = (res as any).str ? (res as any).str : `${res.t1ScoreFinal} x ${res.t2ScoreFinal}`
      status = "FIM"
    } else {
      status = "Agendado"
    }
  } else if (ring === 1) {
    const dates = ["Sáb., 04/07", "Sáb., 04/07", "Seg., 06/07", "Seg., 06/07", "Dom., 05/07", "Dom., 05/07", "Ter., 07/07", "Ter., 07/07"]
    const times = ["18:00", "14:00", "16:00", "21:00", "17:00", "21:00", "13:00", "17:00"]
    date = dates[matchIdx] ?? ""
    time = times[matchIdx] ?? ""

    const isFinished = !!winners[`2-${matchIdx}`]
    if (isFinished) {
      status = "FIM"
      if (matchIdx === 0) {
        score = "0 x 1" // Paraguai x França
      } else if (matchIdx === 1) {
        score = "0 x 3" // Canadá x Marrocos
      } else if (matchIdx === 2) {
        score = "0 x 1" // Portugal x Espanha
      } else if (matchIdx === 3) {
        score = "1 x 2" // EUA x Bélgica
      } else if (matchIdx === 4) {
        score = "1 x 2" // Brasil x Noruega
      } else if (matchIdx === 5) {
        score = "0 x 2" // México x Inglaterra
      } else if (matchIdx === 6) {
        score = "2 x 1" // Argentina x Egito
      } else if (matchIdx === 7) {
        score = "1 (4) x 1 (3)" // Suíça x Colômbia
      }
    } else {
      status = "Agendado"
    }
  } else if (ring === 2) {
    const dates = ["Qui., 09/07", "Sex., 10/07", "Sáb., 11/07", "Sáb., 11/07"]
    const times = ["17:00", "16:00", "18:00", "22:00"]
    date = dates[matchIdx] ?? ""
    time = times[matchIdx] ?? ""
    
    const isFinished = !!winners[`3-${matchIdx}`]
    if (isFinished) {
      status = "FIM"
      if (matchIdx === 0) {
        score = "2 x 0"
      } else if (matchIdx === 1) {
        score = "2 x 1"
      } else if (matchIdx === 2) {
        score = "1 x 2"
      } else if (matchIdx === 3) {
        score = "2 x 1"
      }
    } else {
      status = "Agendado"
    }
  } else if (ring === 3) {
    const dates = ["Ter., 14/07", "Qua., 15/07"]
    const times = ["16:00", "16:00"]
    date = dates[matchIdx] ?? ""
    time = times[matchIdx] ?? ""
    
    const isFinished = !!winners[`4-${matchIdx}`]
    if (isFinished) {
      status = "FIM"
      if (matchIdx === 0) {
        score = "0 x 2" // França 0 x 2 Espanha
      } else if (matchIdx === 1) {
        score = "1 x 2" // Inglaterra 1 x 2 Argentina
      }
    } else {
      status = "Agendado"
    }
  } else if (ring === 4) {
    date = "Dom., 19/07"
    time = "16:00"
    status = "Agendado"
  }
  return { phase, date, time, t1, t2, score, status }
}

type Winners = Record<string, Team>

const SCHEDULE = [
  // R16-1: Paraguai x França
  { id: "J74", dateLabel: "Seg., 29/06", timeLabel: "17:30", t1_idx: 0, t2_idx: 1, timestamp: new Date("2026-06-29T17:30:00-03:00").getTime(), parentWinnerKey: "1-0" },
  { id: "J77", dateLabel: "Ter., 30/06", timeLabel: "18:00", t1_idx: 2, t2_idx: 3, timestamp: new Date("2026-06-30T18:00:00-03:00").getTime(), parentWinnerKey: "1-1" },

  // R16-2: Canadá x Marrocos
  { id: "J73", dateLabel: "Dom., 28/06", timeLabel: "16:00", t1_idx: 4, t2_idx: 5, timestamp: new Date("2026-06-28T16:00:00-03:00").getTime(), parentWinnerKey: "1-2" },
  { id: "J75", dateLabel: "Seg., 29/06", timeLabel: "22:00", t1_idx: 6, t2_idx: 7, timestamp: new Date("2026-06-29T22:00:00-03:00").getTime(), parentWinnerKey: "1-3" },

  // R16-5: Portugal x Espanha
  { id: "J83", dateLabel: "Qui., 02/07", timeLabel: "20:00", t1_idx: 8, t2_idx: 9, timestamp: new Date("2026-07-02T20:00:00-03:00").getTime(), parentWinnerKey: "1-4" },
  { id: "J84", dateLabel: "Qui., 02/07", timeLabel: "16:00", t1_idx: 10, t2_idx: 11, timestamp: new Date("2026-07-02T16:00:00-03:00").getTime(), parentWinnerKey: "1-5" },

  // R16-6: EUA x Bélgica
  { id: "J81", dateLabel: "Qua., 01/07", timeLabel: "21:00", t1_idx: 12, t2_idx: 13, timestamp: new Date("2026-07-01T21:00:00-03:00").getTime(), parentWinnerKey: "1-6" },
  { id: "J82", dateLabel: "Qua., 01/07", timeLabel: "17:00", t1_idx: 14, t2_idx: 15, timestamp: new Date("2026-07-01T17:00:00-03:00").getTime(), parentWinnerKey: "1-7" },

  // R16-3: Brasil x Noruega
  { id: "J76", dateLabel: "Seg., 29/06", timeLabel: "14:00", t1_idx: 16, t2_idx: 17, timestamp: new Date("2026-06-29T14:00:00-03:00").getTime(), parentWinnerKey: "1-8" },
  { id: "J78", dateLabel: "Ter., 30/06", timeLabel: "14:00", t1_idx: 18, t2_idx: 19, timestamp: new Date("2026-06-30T14:00:00-03:00").getTime(), parentWinnerKey: "1-9" },

  // R16-4: México x Inglaterra
  { id: "J79", dateLabel: "Ter., 30/06", timeLabel: "22:00", t1_idx: 20, t2_idx: 21, timestamp: new Date("2026-06-30T22:00:00-03:00").getTime(), parentWinnerKey: "1-10" },
  { id: "J80", dateLabel: "Qua., 01/07", timeLabel: "13:00", t1_idx: 22, t2_idx: 23, timestamp: new Date("2026-07-01T13:00:00-03:00").getTime(), parentWinnerKey: "1-11" },

  // R16-7: Argentina x Egito
  { id: "J86", dateLabel: "Sex., 03/07", timeLabel: "19:00", t1_idx: 24, t2_idx: 25, timestamp: new Date("2026-07-03T19:00:00-03:00").getTime(), parentWinnerKey: "1-12" },
  { id: "J88", dateLabel: "Sex., 03/07", timeLabel: "15:00", t1_idx: 26, t2_idx: 27, timestamp: new Date("2026-07-03T15:00:00-03:00").getTime(), parentWinnerKey: "1-13" },

  // R16-8: Suíça x Colômbia/Gana
  { id: "J85", dateLabel: "Sex., 03/07", timeLabel: "00:00", t1_idx: 28, t2_idx: 29, timestamp: new Date("2026-07-03T00:00:00-03:00").getTime(), parentWinnerKey: "1-14" },
  { id: "J87", dateLabel: "Sex., 03/07", timeLabel: "22:30", t1_idx: 30, t2_idx: 31, timestamp: new Date("2026-07-03T22:30:00-03:00").getTime(), parentWinnerKey: "1-15" },
]

function getDeterministicMatchResult(matchId: string) {
  // Resultados oficiais da imagem (16-avos)
  const officialResults: Record<string, { t1: number, t2: number, str?: string }> = {
    "J73": { t1: 1, t2: 0 }, // Canadá x África do Sul
    "J74": { t1: 1, t2: 1, str: "1 (4) x 1 (3)" }, // Paraguai x Alemanha
    "J75": { t1: 1, t2: 1, str: "1 (3) x 1 (2)" }, // Marrocos x Países Baixos
    "J76": { t1: 2, t2: 1 }, // Brasil x Japão
    "J77": { t1: 3, t2: 0 }, // França x Suécia
    "J78": { t1: 2, t2: 1 }, // Noruega x Costa do Marfim
    "J79": { t1: 2, t2: 0 }, // México x Equador
    "J80": { t1: 2, t2: 1 }, // Inglaterra x RD Congo
    "J81": { t1: 2, t2: 0 }, // EUA x Bósnia
    "J82": { t1: 3, t2: 2 }, // Bélgica x Senegal
    "J83": { t1: 2, t2: 1 }, // Portugal x Croácia
    "J84": { t1: 3, t2: 0 }, // Espanha x Áustria
    "J85": { t1: 2, t2: 0 }, // Suíça x Argélia
    "J86": { t1: 3, t2: 2 }, // Argentina x Cabo Verde
    "J87": { t1: 1, t2: 0 }, // Colômbia x Gana (Ao vivo)
    "J88": { t1: 1, t2: 1, str: "1 (4) x 1 (2)" }, // Egito x Austrália
  }

  if (officialResults[matchId]) {
    const res = officialResults[matchId]
    return {
      t1ScoreFinal: res.t1,
      t2ScoreFinal: res.t2,
      str: res.str,
      goals: [] // Gols não especificados na imagem, deixamos vazio
    }
  }

  let hash = 0
  for (let i = 0; i < matchId.length; i++) {
    hash = (hash << 5) - hash + matchId.charCodeAt(i)
    hash |= 0
  }
  hash = Math.abs(hash)

  const t1ScoreFinal = hash % 3
  const t2ScoreFinal = (hash >> 2) % 3

  const goals: { minute: number; team: 1 | 2 }[] = []

  for (let i = 0; i < t1ScoreFinal; i++) {
    goals.push({
      minute: 5 + ((hash + i * 23) % 80),
      team: 1
    })
  }

  for (let i = 0; i < t2ScoreFinal; i++) {
    goals.push({
      minute: 8 + ((hash + i * 31) % 78),
      team: 2
    })
  }

  goals.sort((a, b) => a.minute - b.minute)

  return { t1ScoreFinal, t2ScoreFinal, goals }
}

const STORAGE_KEY = "fifa-2026-bracket-v4"

export function WorldCupBracket() {
  const [winners, setWinners] = useState<Winners>({})
  const [champion, setChampion] = useState<Team | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(true)
  const [scale, setScale] = useState(1)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const lastChampionId = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  // Drag tracking to prevent clicking team nodes when dragging
  const hasDragged = useRef(false)
  const dragStartPos = useRef({ x: 0, y: 0 })

  // Touch references to track touch state
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const pinchStartDistRef = useRef<number | null>(null)
  const scaleStartRef = useRef<number>(1)
  const dragPosStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const [liveMatch, setLiveMatchState] = useState<LiveMatchState | null>(null)
  const liveMatchRef = useRef<LiveMatchState | null>(null)
  const setLiveMatch = useCallback((val: LiveMatchState | null | ((prev: LiveMatchState | null) => LiveMatchState | null)) => {
    if (typeof val === "function") {
      setLiveMatchState(prev => {
        const next = val(prev)
        liveMatchRef.current = next
        return next
      })
    } else {
      liveMatchRef.current = val
      setLiveMatchState(val)
    }
  }, [])

  const winnersRef = useRef<Winners>({})
  useEffect(() => {
    winnersRef.current = winners
  }, [winners])

  const realStartRef = useRef(typeof window !== "undefined" ? Date.now() : new Date("2026-07-02T08:40:24-03:00").getTime())
  const SIMULATED_START = useMemo(() => new Date("2026-07-02T08:40:24-03:00").getTime(), [])

  const getSimulatedNow = useCallback(() => {
    if (typeof window === "undefined") return SIMULATED_START
    return SIMULATED_START + (Date.now() - realStartRef.current)
  }, [SIMULATED_START])

  const [currentTime, setCurrentTime] = useState(getSimulatedNow())
  const lastXFetchRef = useRef(0)
  const isXActiveRef = useRef(false)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getSimulatedNow())
    }, 1000)
    return () => clearInterval(interval)
  }, [getSimulatedNow])

  const getCountdownLabel = useCallback((targetMs: number) => {
    const diff = targetMs - currentTime
    if (diff <= 0) return "Começando..."
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    const pad = (n: number) => String(n).padStart(2, "0")
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    }
    return `${pad(minutes)}:${pad(seconds)}`
  }, [currentTime])

  // Register Service Worker and listen to Install prompt
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => console.log("Service Worker registrado com escopo:", reg.scope))
        .catch((err) => console.error("Falha ao registrar Service Worker:", err))
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBtn(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Detect iOS Safari to show manual install instruction banner
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone
    if (isIOS && !isStandalone) {
      setShowIOSPrompt(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`Escolha de instalação do usuário: ${outcome}`)
    setDeferredPrompt(null)
    setShowInstallBtn(false)
  }

  // Escuta combinação de teclas Ctrl+0 ou Cmd+0 para redefinir o zoom e posição
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault()
        setScale(1)
        setDragPos({ x: 0, y: 0 })
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

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
      hasDragged.current = false
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
      hasDragged.current = false
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y
      if (Math.hypot(deltaX, deltaY) > 5) {
        hasDragged.current = true
      }
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
      if (Math.hypot(deltaX, deltaY) > 5) {
        hasDragged.current = true
      }
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
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    hasDragged.current = false
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartPos.current.x
    const dy = e.clientY - dragStartPos.current.y
    if (Math.hypot(dx, dy) > 5) {
      hasDragged.current = true
    }
    setDragPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setScale((prev) => Math.min(3, prev + 0.1))
  }

  // Estado pré-carregado: Todos os vencedores confirmados no JSON (16-avos)
  const DEFAULT_WINNERS: Winners = {
    // QF-1
    "1-0": TEAMS[0],   // Paraguai
    "1-1": TEAMS[2],   // França
    "1-2": TEAMS[4],   // Canadá
    "1-3": TEAMS[6],   // Marrocos
    // QF-2
    "1-4": TEAMS[8],   // Portugal
    "1-5": TEAMS[10],  // Espanha
    "1-6": TEAMS[12],  // Estados Unidos
    "1-7": TEAMS[14],  // Bélgica
    // QF-3
    "1-8": TEAMS[16],  // Brasil
    "1-9": TEAMS[18],  // Noruega
    "1-10": TEAMS[20], // México
    "1-11": TEAMS[22], // Inglaterra
    // QF-4
    "1-12": TEAMS[24], // Argentina
    "1-13": TEAMS[26], // Egito
    "1-14": TEAMS[28], // Suíça
    "1-15": TEAMS[30], // Colômbia

    // Oitavas -> Quartas (Jogos de Ontem)
    "2-0": TEAMS[2],   // França avançou (venceu Paraguai)
    "2-1": TEAMS[6],   // Marrocos avançou (venceu Canadá)
    "2-4": TEAMS[18],  // Noruega avançou (venceu Brasil)
    "2-5": TEAMS[22],  // Inglaterra avançou (venceu México)
    "2-2": TEAMS[10],  // Espanha avançou (venceu Portugal)
    "2-6": TEAMS[24],  // Argentina avançou (venceu Egito)
    "2-3": TEAMS[14],  // Bélgica avançou (venceu EUA)
    "2-7": TEAMS[28],  // Suíça avançou (venceu Colômbia)

    // Quartas -> Semifinal
    "3-0": TEAMS[2],   // França avançou (venceu Marrocos)
    "3-1": TEAMS[10],  // Espanha avançou (venceu Bélgica)
    "3-2": TEAMS[22],  // Inglaterra avançou (venceu Noruega)
    "3-3": TEAMS[24],  // Argentina avançou (venceu Suíça)

    // Semifinal -> Final
    "4-0": TEAMS[10],  // Espanha avançou (venceu França)
    "4-1": TEAMS[24],  // Argentina avançou (venceu Inglaterra)
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
        // Injeta resultados oficiais do JSON se eles estiverem incorretos no storage
        mappedWinners["1-0"] = TEAMS[0]   // Paraguai
        mappedWinners["1-1"] = TEAMS[2]   // França
        mappedWinners["1-2"] = TEAMS[4]   // Canadá
        mappedWinners["1-3"] = TEAMS[6]   // Marrocos
        mappedWinners["1-4"] = TEAMS[8]   // Portugal
        mappedWinners["1-5"] = TEAMS[10]  // Espanha
        mappedWinners["1-6"] = TEAMS[12]  // EUA
        mappedWinners["1-7"] = TEAMS[14]  // Bélgica
        mappedWinners["1-8"] = TEAMS[16]  // Brasil
        mappedWinners["1-9"] = TEAMS[18]  // Noruega
        mappedWinners["1-10"] = TEAMS[20] // México
        mappedWinners["1-11"] = TEAMS[22] // Inglaterra
        mappedWinners["1-12"] = TEAMS[24] // Argentina
        mappedWinners["1-13"] = TEAMS[26] // Egito
        mappedWinners["1-14"] = TEAMS[28] // Suíça
        mappedWinners["1-15"] = TEAMS[30] // Colômbia
        mappedWinners["2-0"] = TEAMS[2]   // França (avançou ontem)
        mappedWinners["2-1"] = TEAMS[6]   // Marrocos (avançou ontem)
        mappedWinners["2-4"] = TEAMS[18]  // Noruega (avançou)
        mappedWinners["2-5"] = TEAMS[22]  // Inglaterra (avançou)
        mappedWinners["2-2"] = TEAMS[10]  // Espanha (avançou)
        mappedWinners["2-6"] = TEAMS[24]  // Argentina (avançou)
        mappedWinners["2-3"] = TEAMS[14]  // Bélgica (avançou)
        mappedWinners["2-7"] = TEAMS[28]  // Suíça (avançou)
        mappedWinners["3-0"] = TEAMS[2]   // França (avançou)
        mappedWinners["3-1"] = TEAMS[10]  // Espanha (avançou)
        mappedWinners["3-2"] = TEAMS[22]  // Inglaterra (avançou)
        mappedWinners["3-3"] = TEAMS[24]  // Argentina (avançou)
        mappedWinners["4-0"] = TEAMS[10]  // Espanha (avançou)
        mappedWinners["4-1"] = TEAMS[24]  // Argentina (avançou)

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

  /*
   * INTEGRAÇÃO EM PRODUÇÃO:
   * Os placares ao vivo são obtidos via SportMonks Football API v3 (/api/x-scores).
   * A rota consulta livescores inplay e fixtures por data, filtrando pela Season ID da Copa 2026.
   * Configurar SPORTMONKS_API_TOKEN no .env.local para ativar.
   */

  // O WebSocket de simulação (wss://x-stream.copa2026.org/live-scores) foi desativado
  // para evitar poluição de erros no console, pois a integração principal agora é feita
  // via HTTP Polling com a SportMonks API no endpoint /api/x-scores.
  /*
  useEffect(() => {
    if (!isLoaded) return

    const ws = new WebSocket("wss://x-stream.copa2026.org/live-scores")

    ws.onopen = () => {
      console.log("[LiveScore] Conectado ao stream de resultados em tempo real")
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data && data.matchId) {
          const activeItem = SCHEDULE.find(item => item.id === data.matchId)
          if (activeItem) {
            if (data.isActive && !winnersRef.current[activeItem.parentWinnerKey]) {
              const t1 = TEAMS[activeItem.t1_idx]
              const t2 = TEAMS[activeItem.t2_idx]
              
              setLiveMatch({
                matchId: activeItem.id,
                t1,
                t2,
                t1Score: data.homeScore,
                t2Score: data.awayScore,
                minute: data.minute || 90,
                scorer: data.scorer || "",
                isActive: true
              })
            } else {
              setLiveMatch(null)
              if (!winnersRef.current[activeItem.parentWinnerKey]) {
                const winner = data.homeScore > data.awayScore ? TEAMS[activeItem.t1_idx] : TEAMS[activeItem.t2_idx]
                setWinners(prev => ({ ...prev, [activeItem.parentWinnerKey]: winner }))
                
                const flagColors = TEAM_COLORS[winner.slug] || ["#e9b949", "#ffffff"]
                confetti({
                  particleCount: 60,
                  spread: 70,
                  origin: { x: 0.5, y: 0.5 },
                  colors: flagColors,
                })
              }
            }
          }
        }
      } catch (e) {
        console.error("[LiveScore] Erro ao processar mensagem:", e)
      }
    }

    ws.onerror = (error) => {
      console.warn("[X.com WebSocket] Erro na conexão:", error)
    }

    ws.onclose = () => {
      console.log("[X.com WebSocket] Conexão encerrada")
    }

    return () => {
      ws.close()
    }
  }, [isLoaded])
  */

  // Verifica e atualiza partidas ao vivo em tempo real baseado no relógio do sistema
  useEffect(() => {
    if (!isLoaded) return

    const checkMatches = () => {
      const now = getSimulatedNow()

      // Busca atualizações de placar via SportMonks API (throttle 20s)
      if (now - lastXFetchRef.current > 20000) {
        lastXFetchRef.current = now
        fetch("/api/x-scores")
          .then(res => res.json())
          .then(data => {
            if (data && !data.error) {
              isXActiveRef.current = true
              const t1 = TEAMS.find(t => t.id === data.t1.id)
              const t2 = TEAMS.find(t => t.id === data.t2.id)

              if (t1 && t2) {
                // Só ativa o placar se o jogo estiver realmente em andamento
                if (data.isActive) {
                  setLiveMatch({
                    matchId: `espn-${t1.id}-${t2.id}`,
                    t1,
                    t2,
                    t1Score: data.t1Score,
                    t2Score: data.t2Score,
                    minute: data.minute ?? 0,
                    scorer: data.scorer ?? "",
                    isActive: true,
                    status: data.status
                  })
                } else {
                  setLiveMatch(null)
                  // Se o jogo encerrou, avança o vencedor automaticamente na chave
                  if (data.status === "finished") {
                    for (let ring = 0; ring < 4; ring++) {
                      const count = RINGS[ring].count
                      for (let i = 0; i < count; i += 2) {
                        const pt1 = teamAt(ring, i)
                        const pt2 = teamAt(ring, i + 1)
                        if (pt1 && pt2 && ((pt1.id === t1.id && pt2.id === t2.id) || (pt1.id === t2.id && pt2.id === t1.id))) {
                          const parentRing = ring + 1
                          const parentIndex = Math.floor(i / 2)
                          const key = `${parentRing}-${parentIndex}`

                          if (!winnersRef.current[key]) {
                            const winner = data.t1Score > data.t2Score ? t1 : t2
                            setWinners(prev => ({ ...prev, [key]: winner }))

                            const flagColors = TEAM_COLORS[winner.slug] || ["#e9b949", "#ffffff"]
                            confetti({
                              particleCount: 60,
                              spread: 70,
                              origin: { x: 0.5, y: 0.5 },
                              colors: flagColors,
                            })
                          }
                          break
                        }
                      }
                    }
                  }
                }
              }
            }
          })
          .catch(err => console.error("Erro ao buscar score da ESPN:", err))
      }

      // Se a SportMonks já está ativamente gerenciando o placar, não rodamos a simulação do relógio do sistema
      if (isXActiveRef.current) {
        return
      }

      const activeItem = SCHEDULE.find(item => {
        // Se já existe um vencedor para este confronto no estado da chave, não é um jogo "AO VIVO"
        if (winnersRef.current[item.parentWinnerKey]) return false
        // Jogo dura 120 minutos (90 min jogo + 15 min intervalo + acréscimos)
        return now >= item.timestamp && now < item.timestamp + 120 * 60 * 1000
      })

      if (activeItem) {
        const t1 = TEAMS[activeItem.t1_idx]
        const t2 = TEAMS[activeItem.t2_idx]

        const elapsedMinutes = Math.floor((now - activeItem.timestamp) / 60000)

        let gameMinute = 0
        let isHalftime = false

        if (elapsedMinutes < 45) {
          gameMinute = elapsedMinutes
        } else if (elapsedMinutes >= 45 && elapsedMinutes < 60) {
          gameMinute = 45
          isHalftime = true
        } else if (elapsedMinutes >= 60 && elapsedMinutes < 105) {
          gameMinute = 45 + (elapsedMinutes - 60)
        } else {
          gameMinute = 90
        }

        let t1Score = 0
        let t2Score = 0
        let currentScorer = ""

        setLiveMatch({
          matchId: activeItem.id,
          t1,
          t2,
          t1Score,
          t2Score,
          minute: gameMinute,
          scorer: currentScorer,
          isActive: true
        })
      } else {
        const currentLive = liveMatchRef.current
        if (currentLive && currentLive.isActive) {
          const finishedItem = SCHEDULE.find(item => item.id === currentLive.matchId)
          if (finishedItem) {
            const result = getDeterministicMatchResult(finishedItem.id)
            let winner = currentLive.t1
            if (result.t1ScoreFinal === result.t2ScoreFinal) {
              const t1Pen = 4 + (finishedItem.id.charCodeAt(0) % 2)
              const t2Pen = t1Pen === 5 ? 4 : 5
              winner = t1Pen > t2Pen ? currentLive.t1 : currentLive.t2
            } else {
              winner = result.t1ScoreFinal > result.t2ScoreFinal ? currentLive.t1 : currentLive.t2
            }

            const parentRing = 1
            const parentIndex = Math.floor(finishedItem.t1_idx / 2)
            const key = `${parentRing}-${parentIndex}`
            setWinners(prev => {
              if (prev[key]) return prev
              return { ...prev, [key]: winner }
            })

            // Celebração visual
            const flagColors = TEAM_COLORS[winner.slug] || ["#e9b949", "#ffffff"]
            confetti({
              particleCount: 60,
              spread: 70,
              origin: { x: 0.5, y: 0.5 },
              colors: flagColors,
            })

            // Remove o placar imediatamente ao encerrar o tempo regulamentar simulado
            setLiveMatch(null)
          }
        }
      }
    }

    const interval = setInterval(checkMatches, 1000)
    checkMatches()

    return () => clearInterval(interval)
  }, [isLoaded])

  // Avança automaticamente partidas passadas que ainda não têm vencedor definido
  useEffect(() => {
    if (!isLoaded) return

    let updated = false
    const nextWinners = { ...winners }
    const now = getSimulatedNow()

    SCHEDULE.forEach(item => {
      if (now >= item.timestamp + 120 * 60 * 1000 && !winners[item.parentWinnerKey]) {
        const result = getDeterministicMatchResult(item.id)
        const t1 = TEAMS[item.t1_idx]
        const t2 = TEAMS[item.t2_idx]

        let winner = t1
        if (result.t1ScoreFinal === result.t2ScoreFinal) {
          const t1Pen = 4 + (item.id.charCodeAt(0) % 2)
          const t2Pen = t1Pen === 5 ? 4 : 5
          winner = t1Pen > t2Pen ? t1 : t2
        } else {
          winner = result.t1ScoreFinal > result.t2ScoreFinal ? t1 : t2
        }

        nextWinners[item.parentWinnerKey] = winner
        updated = true

        // Pequeno confete com cores da bandeira do vencedor automático!
        const flagColors = TEAM_COLORS[winner.slug] || ["#e9b949", "#ffffff"]
        confetti({
          particleCount: 50,
          spread: 60,
          startVelocity: 35,
          origin: { x: 0.5, y: 0.5 },
          colors: flagColors,
        })
      }
    })

    if (updated) {
      setWinners(nextWinners)
    }
  }, [isLoaded, winners])

  // Dispara o confete em ondas a partir das laterais.
  const fireConfetti = useCallback((customColors?: string[]) => {
    const end = Date.now() + 1500
    const colors = customColors && customColors.length > 0
      ? customColors
      : ["#e9b949", "#f5d76e", "#ffffff", "#16a34a"]
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
      const flagColors = TEAM_COLORS[champion.slug] || []
      fireConfetti(flagColors)
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
    if (hasDragged.current) return
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

    // Pequeno confete com cores da bandeira do vencedor intermediário escolhido!
    const flagColors = TEAM_COLORS[team.slug] || ["#e9b949", "#ffffff"]
    confetti({
      particleCount: 35,
      spread: 45,
      startVelocity: 30,
      origin: { x: 0.5, y: 0.5 },
      colors: flagColors,
    })
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

  const getThirdPlaceTeams = () => {
    const s1_a = teamAt(3, 0)
    const s1_b = teamAt(3, 1)
    const s1_winner = winners["4-0"] ?? null
    const s2_a = teamAt(3, 2)
    const s2_b = teamAt(3, 3)
    const s2_winner = winners["4-1"] ?? null

    let teamA: Team | null = null
    if (s1_a && s1_b && s1_winner) {
      teamA = s1_a.id === s1_winner.id ? s1_b : s1_a
    }
    let teamB: Team | null = null
    if (s2_a && s2_b && s2_winner) {
      teamB = s2_a.id === s2_winner.id ? s2_b : s2_a
    }
    return { teamA, teamB }
  }

  const getCalendarMatches = () => {
    const thirdPlace = getThirdPlaceTeams()

    return [
      { phase: "Oitavas de final", date: "Sáb., 04/07", time: "14:00", stadium: "Estádio de Houston (TX)", t1: teamAt(1, 2), t2: teamAt(1, 3), score: winners["2-1"] ? "0 x 3" : null }, // Canadá x Marrocos
      { phase: "Oitavas de final", date: "Sáb., 04/07", time: "18:00", stadium: "Estádio de Filadélfia (PA)", t1: teamAt(1, 0), t2: teamAt(1, 1), score: winners["2-0"] ? "0 x 1" : null }, // Paraguai x França
      { phase: "Oitavas de final", date: "Dom., 05/07", time: "17:00", stadium: "Estádio de Nova York / Nova Jersey (NJ)", t1: teamAt(1, 8), t2: teamAt(1, 9), score: winners["2-4"] ? "1 x 2" : null }, // Brasil x Noruega
      { phase: "Oitavas de final", date: "Dom., 05/07", time: "21:00", stadium: "Estádio da Cidade do México", t1: teamAt(1, 10), t2: teamAt(1, 11), score: winners["2-5"] ? "0 x 2" : null }, // México x Inglaterra
      { phase: "Oitavas de final", date: "Seg., 06/07", time: "16:00", stadium: "Estádio de Dallas (TX)", t1: teamAt(1, 4), t2: teamAt(1, 5), score: winners["2-2"] ? "0 x 1" : null }, // Portugal x Espanha
      { phase: "Oitavas de final", date: "Seg., 06/07", time: "21:00", stadium: "Estádio de Seattle (WA)", t1: teamAt(1, 6), t2: teamAt(1, 7), score: winners["2-3"] ? "1 x 2" : null }, // EUA x Bélgica
      { phase: "Oitavas de final", date: "Ter., 07/07", time: "13:00", stadium: "Estádio de Atlanta (GA)", t1: teamAt(1, 12), t2: teamAt(1, 13), score: winners["2-6"] ? "2 x 1" : null }, // Argentina x Egito
      { phase: "Oitavas de final", date: "Ter., 07/07", time: "17:00", stadium: "BC Place, Vancouver", t1: teamAt(1, 14), t2: teamAt(1, 15), score: winners["2-7"] ? "1 (4) x 1 (3)" : null }, // Suíça x Colômbia/Gana

      { phase: "Quartas de final", date: "Qui., 09/07", time: "17:00", stadium: "Boston", t1: teamAt(2, 0), t2: teamAt(2, 1), score: winners["3-0"] ? "2 x 0" : null }, // QF-1: Paraguai/França x Canadá/Marrocos
      { phase: "Quartas de final", date: "Sex., 10/07", time: "16:00", stadium: "Los Angeles", t1: teamAt(2, 2), t2: teamAt(2, 3), score: winners["3-1"] ? "2 x 1" : null }, // QF-2: Portugal/Espanha x EUA/Bélgica
      { phase: "Quartas de final", date: "Sáb., 11/07", time: "18:00", stadium: "Miami", t1: teamAt(2, 4), t2: teamAt(2, 5), score: winners["3-2"] ? "1 x 2" : null }, // QF-3: Brasil/Noruega x México/Inglaterra
      { phase: "Quartas de final", date: "Sáb., 11/07", time: "22:00", stadium: "Kansas City", t1: teamAt(2, 6), t2: teamAt(2, 7), score: winners["3-3"] ? "2 x 1" : null }, // QF-4: Argentina/Egito x Suíça/A definir

      { phase: "Semifinal", date: "Ter., 14/07", time: "16:00", stadium: "Dallas", t1: teamAt(3, 0), t2: teamAt(3, 1), score: winners["4-0"] ? "0 x 2" : null }, // SF-1: Vencedor QF-1 x Vencedor QF-2
      { phase: "Semifinal", date: "Qua., 15/07", time: "16:00", stadium: "Atlanta", t1: teamAt(3, 2), t2: teamAt(3, 3), score: winners["4-1"] ? "1 x 2" : null }, // SF-2: Vencedor QF-3 x Vencedor QF-4

      { phase: "Disputa 3º Lugar", date: "Sáb., 18/07", time: "18:00", stadium: "Miami", t1: thirdPlace.teamA, t2: thirdPlace.teamB },

      { phase: "Final", date: "Dom., 19/07", time: "16:00", stadium: "Nova York / Nova Jersey", t1: teamAt(4, 0), t2: teamAt(4, 1) }
    ]
  }

  const nextMatch = useMemo(() => {
    if (!isLoaded) return null
    const now = getSimulatedNow()
    const sortedSchedule = [...SCHEDULE].sort((a, b) => a.timestamp - b.timestamp)
    const found = sortedSchedule.find(item => {
      if (winners[item.parentWinnerKey]) return false
      return item.timestamp > now
    })
    if (!found) return null
    const t1 = TEAMS[found.t1_idx]
    const t2 = TEAMS[found.t2_idx]
    return {
      ...found,
      t1,
      t2
    }
  }, [isLoaded, winners, currentTime, getSimulatedNow])

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
              <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-card ring-2 ring-gold shrink-0">
                <img
                  src={flagUrl(champion) || "/placeholder.svg"}
                  alt={`Bandeira ${champion.name}`}
                  className="size-6 shrink-0 rounded-full object-cover"
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
            {showInstallBtn && (
              <button
                type="button"
                onClick={handleInstallClick}
                aria-label="Instalar Aplicativo"
                className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold hover:text-background"
              >
                <Download className="size-3.5" />
                <span>Instalar App</span>
              </button>
            )}

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

        {/* Informação do Próximo Jogo no Header */}
        <div className="fixed top-[74px] md:absolute md:top-1/2 left-1/2 -translate-x-1/2 -translate-y-0 md:-translate-y-1/2 z-30 md:z-50 pointer-events-auto flex items-center justify-center">
          {nextMatch ? (
            <div className="flex items-center gap-2.5 sm:gap-3 bg-card/75 px-5 py-2 rounded-full border border-gold/30 shadow-lg backdrop-blur-md max-w-[95vw] sm:max-w-none whitespace-nowrap">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-gold-soft uppercase tracking-widest shrink-0 whitespace-nowrap">
                PRÓXIMO
              </span>

              {/* Teams & Flags */}
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span className="flex items-center gap-1 font-semibold text-xs sm:text-sm shrink-0 whitespace-nowrap">
                  <img src={flagUrl(nextMatch.t1)} alt="" className="size-5 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-border" />
                  <span className="hidden sm:inline truncate max-w-[80px]">{nextMatch.t1.name}</span>
                </span>

                <span className="text-muted-foreground font-normal text-[10px] shrink-0 whitespace-nowrap">vs</span>

                <span className="flex items-center gap-1 font-semibold text-xs sm:text-sm shrink-0 whitespace-nowrap">
                  <span className="hidden sm:inline truncate max-w-[80px]">{nextMatch.t2.name}</span>
                  <img src={flagUrl(nextMatch.t2)} alt="" className="size-5 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-border" />
                </span>
              </div>

              {/* Schedule only (No countdown) */}
              <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold shrink-0 whitespace-nowrap">
                {nextMatch.dateLabel} às {nextMatch.timeLabel}
              </span>
            </div>
          ) : null}
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
        onDoubleClick={handleDoubleClick}
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
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold blur-2xl transition-all duration-700 ${champion
                ? "size-[45%] opacity-60 animate-pulse"
                : "size-[26%] opacity-20"
              }`}
          />
          <div className="absolute left-1/2 top-1/2 z-10 flex size-[15%] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <img
              src="/images/trophy.png"
              alt="Taça da Copa do Mundo"
              className={`size-full object-contain transition-all duration-700 ${champion
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
                  matchInfo={getMatchInfo(ring, index, winners, champion, liveMatch)}
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
        {showInstallBtn && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-gold hover:text-gold-soft transition-colors"
          >
            <Download className="size-5" />
            <span>Instalar</span>
          </button>
        )}

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
        className="fixed bottom-20 left-0 right-0 md:bottom-3 z-30 flex items-center justify-center gap-1.5 px-2 py-1 text-[10px] font-medium text-muted-foreground/50 transition-colors hover:text-gold-soft md:text-xs md:bg-transparent md:py-1.5"
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

      {/* Carregamento nos bastidores (Ghost Render) para cache de GPU */}
      <div className="fixed -left-[9999px] -top-[9999px] size-1 opacity-0 pointer-events-none" aria-hidden="true">
        <Trophy3D />
      </div>

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

            {/* Taça 3D no topo */}
            <div className="relative z-10 w-full flex justify-center -my-8">
              <Trophy3D />
            </div>

            <h2 className="relative z-10 text-balance font-heading text-3xl font-bold tracking-tight text-foreground">
              {champion.name}
            </h2>

            {/* Bandeira do campeão em destaque */}
            <span className="relative z-10 flex size-36 items-center justify-center overflow-hidden rounded-full bg-card ring-4 ring-gold shadow-[0_0_30px_oklch(0.82_0.13_80/0.7)]">
              <img
                src={flagUrl(champion) || "/placeholder.svg"}
                alt={`Bandeira ${champion.name}`}
                className="size-full rounded-full object-cover"
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
            className="relative flex w-full max-w-md flex-col items-center gap-4 overflow-hidden rounded-2xl border border-gold/40 bg-card px-4 py-6 text-center shadow-[0_0_60px_oklch(0.82_0.13_80/0.35)]"
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

            <h3 className="relative z-10 font-heading text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Calendar className="size-5 text-gold-soft" />
              Calendário da Fase Final
            </h3>

            {/* Linha do tempo / Agenda */}
            <div className="relative z-10 w-full flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-1.5 mt-2 hidden-scrollbar">
              {getCalendarMatches().map((match, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col gap-2 p-2.5 rounded-lg border border-border/40 bg-background/50 text-left transition-colors hover:bg-background/85 ${match.phase === "Final" ? "border-gold/30 bg-gold/5 shadow-[0_0_10px_oklch(0.82_0.13_80/0.1)] animate-pulse" : ""
                    }`}
                >
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className={match.phase === "Final" ? "text-gold-soft" : ""}>{match.phase}</span>
                    <span>{match.date} às {match.time}</span>
                  </div>

                  {(match as any).stadium && (
                    <div className="text-[10px] text-muted-foreground/80 font-medium">
                      {(match as any).stadium}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-foreground">
                    {/* Time 1 */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 shrink-0">
                      {match.t1 ? (
                        <>
                          <img
                            src={flagUrl(match.t1)}
                            alt=""
                            className="size-4 shrink-0 rounded-full object-cover ring-1 ring-border"
                          />
                          <span className="truncate">{match.t1.name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground/60 italic font-normal">A definir</span>
                      )}
                    </div>

                    <span className="text-[10px] text-muted-foreground font-bold px-1.5 shrink-0">
                      {match.score ? match.score : "×"}
                    </span>

                    {/* Time 2 */}
                    <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0 text-right shrink-0">
                      {match.t2 ? (
                        <>
                          <span className="truncate">{match.t2.name}</span>
                          <img
                            src={flagUrl(match.t2)}
                            alt=""
                            className="size-4 shrink-0 rounded-full object-cover ring-1 ring-border"
                          />
                        </>
                      ) : (
                        <span className="text-muted-foreground/60 italic font-normal">A definir</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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

      {/* iOS Install Prompt Banner */}
      {showIOSPrompt && (
        <div className="fixed bottom-16 left-4 right-4 z-50 rounded-xl border border-gold/40 bg-card/95 p-4 shadow-xl backdrop-blur md:hidden flex items-start gap-3">
          <div className="flex-1 text-left">
            <h4 className="text-xs font-bold text-gold-soft uppercase tracking-wider">Instalar no iPhone</h4>
            <p className="text-[11px] text-foreground mt-1 leading-normal">
              Adicione à sua tela de início para abrir como app: toque no botão de <strong>Compartilhar</strong> (ícone com seta <span className="inline-block translate-y-0.5">📤</span>) e selecione <strong>"Adicionar à Tela de Início"</strong> (ícone <span className="inline-block translate-y-0.5">➕</span>).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowIOSPrompt(false)}
            className="text-muted-foreground hover:text-foreground p-0.5"
            aria-label="Fechar dica"
          >
            <X className="size-4" />
          </button>
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
  matchInfo,
}: {
  team: Team | null
  size: number
  left: number
  top: number
  advanced: boolean
  lost: boolean
  date: string | null
  onClick: () => void
  matchInfo: MatchInfo
}) {
  const [isHovered, setIsHovered] = useState(false)
  const clickTimeout = useRef<any>(null)

  useEffect(() => {
    return () => {
      if (clickTimeout.current) clearTimeout(clickTimeout.current)
    }
  }, [])

  const handleNodeClick = (e: React.MouseEvent) => {
    const isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768

    if (isMobile) {
      e.preventDefault()
      if (clickTimeout.current) {
        // Clique duplo detectado
        clearTimeout(clickTimeout.current)
        clickTimeout.current = null
        setIsHovered((prev) => !prev)
      } else {
        // Primeiro clique: inicia temporizador
        clickTimeout.current = setTimeout(() => {
          clickTimeout.current = null
          onClick()
        }, 250)
      }
    } else {
      onClick()
    }
  }

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
        zIndex: isHovered ? 3000 : 20,
      }}
      onMouseEnter={() => {
        const isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768
        if (!isMobile) setIsHovered(true)
      }}
      onMouseLeave={() => {
        const isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768
        if (!isMobile) setIsHovered(false)
      }}
    >
      <button
        type="button"
        onClick={handleNodeClick}
        disabled={!team}
        title="" // Desativa o tooltip nativo do navegador
        aria-label={
          team
            ? `Avançar ${team.name}${date ? ` - Jogo em ${date}` : ""}`
            : `Aguardando confronto${date ? ` em ${date}` : ""}`
        }
        className="relative flex size-full items-center justify-center rounded-full transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold enabled:hover:scale-110"
      >
        {team ? (
          <span
            title=""
            className={`flex size-full items-center justify-center overflow-hidden rounded-full bg-card shadow-md ring-2 transition-all duration-500 ${lost
                ? "ring-border opacity-50"
                : advanced
                  ? "ring-gold shadow-[0_0_14px_oklch(0.82_0.13_80/0.6)]"
                  : "ring-border"
              }`}
          >
            <img
              src={flagUrl(team) || "/placeholder.svg"}
              alt={`Bandeira ${team.name}`}
              title=""
              loading="lazy"
              className={`size-full rounded-full object-cover transition-all duration-500 ${lost ? "grayscale" : ""
                }`}
            />
          </span>
        ) : null}
      </button>

      {/* Placar Badge na chave (somente para quem jogou e tem placar) */}
      {team && matchInfo.score && advanced && (
        <div className="absolute -bottom-2 md:-bottom-2.5 left-1/2 -translate-x-1/2 z-30 rounded-full border border-gold/40 bg-background/95 px-1.5 py-px text-[7px] md:text-[8px] font-extrabold text-gold-soft whitespace-nowrap shadow-sm backdrop-blur-sm pointer-events-none">
          {matchInfo.score}
        </div>
      )}

      {/* Tooltip Premium */}
      {isHovered && (
        <div
          className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 pointer-events-none select-none"
          style={{ zIndex: 3000 }}
        >
          <div className="flex w-64 flex-col gap-2 rounded-xl border border-gold/30 bg-card/95 p-3 text-left shadow-2xl backdrop-blur-md">
            {/* Header: Phase and Status/Date */}
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-gold-soft">
              <span>{matchInfo.phase}</span>
              <span>{matchInfo.date}</span>
            </div>

            {/* Teams Matchup */}
            <div className="flex flex-col gap-1.5 py-1 border-y border-border/40">
              {/* Team 1 */}
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-foreground">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {matchInfo.t1 ? (
                    <>
                      <img
                        src={flagUrl(matchInfo.t1)}
                        alt=""
                        className="size-4 rounded-full object-cover ring-1 ring-border shrink-0"
                      />
                      <span className="truncate">{matchInfo.t1.name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/60 italic font-normal">A definir</span>
                  )}
                </div>
                {/* Score do Time 1 */}
                {matchInfo.score && (
                  <span className="text-xs font-bold text-gold-soft shrink-0">
                    {matchInfo.score.split("x")[0].trim()}
                  </span>
                )}
              </div>

              {/* Team 2 */}
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-foreground">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {matchInfo.t2 ? (
                    <>
                      <img
                        src={flagUrl(matchInfo.t2)}
                        alt=""
                        className="size-4 rounded-full object-cover ring-1 ring-border shrink-0"
                      />
                      <span className="truncate">{matchInfo.t2.name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/60 italic font-normal">A definir</span>
                  )}
                </div>
                {/* Score do Time 2 */}
                {matchInfo.score && (
                  <span className="text-xs font-bold text-gold-soft shrink-0">
                    {matchInfo.score.split("x")[1].trim()}
                  </span>
                )}
              </div>
            </div>

            {/* Footer: Time/Status info */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Horário / Status:</span>
              <span className="font-semibold text-foreground">
                {matchInfo.time}
              </span>
            </div>
          </div>
          {/* Tooltip Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 size-2 rotate-45 border-r border-b border-gold/30 bg-card/95" />
        </div>
      )}
    </div>
  )
}
