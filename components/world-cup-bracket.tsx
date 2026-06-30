"use client"

import { useMemo, useState } from "react"
import { RotateCcw } from "lucide-react"
import { TEAMS, type Team, flagUrl } from "@/components/teams"

// Anéis do mais externo (32 times) ao mais interno (2 finalistas).
// radius = distância do centro em % da largura do palco; size = tamanho em cqmin.
const RINGS = [
  { count: 32, radius: 45, size: 7.4 }, // 16-avos
  { count: 16, radius: 35.5, size: 6.8 }, // oitavas
  { count: 8, radius: 26.5, size: 6.4 }, // quartas
  { count: 4, radius: 18, size: 6 }, // semis
  { count: 2, radius: 10, size: 5.8 }, // final
]

const GOLD = "oklch(0.82 0.13 80)"

// Rótulos das fases posicionados nos espaços entre os anéis (no eixo superior).
const PHASE_LABELS = [
  { text: "Oitavas", radius: (RINGS[0].radius + RINGS[1].radius) / 2 },
  { text: "Quartas", radius: (RINGS[1].radius + RINGS[2].radius) / 2 },
  { text: "Semis", radius: (RINGS[2].radius + RINGS[3].radius) / 2 },
  { text: "Final", radius: (RINGS[3].radius + RINGS[4].radius) / 2 },
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

type Winners = Record<string, Team>

export function WorldCupBracket() {
  const [winners, setWinners] = useState<Winners>({})
  const [champion, setChampion] = useState<Team | null>(null)

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
    setWinners({})
    setChampion(null)
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
    <div className="flex w-full flex-col items-center gap-3">
      {/* Barra de controle compacta */}
      <div className="flex w-full max-w-[1000px] items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <img
            src="/images/fifa-2026-logo.jpg"
            alt="Logo FIFA World Cup 2026"
            className="size-10 rounded-md object-cover sm:size-12"
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold-soft sm:text-xs">
            Copa do Mundo 2026
          </p>
        </div>

        <div className="flex items-center gap-3">
          {champion ? (
            <div className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 py-1 pl-1.5 pr-4">
              <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-card ring-2 ring-gold">
                <img
                  src={flagUrl(champion.slug) || "/placeholder.svg"}
                  alt={`Bandeira ${champion.name}`}
                  className="size-6 rounded-full object-cover"
                />
              </span>
              <span className="text-left leading-none">
                <span className="block text-[9px] font-medium uppercase tracking-widest text-gold-soft">
                  Campeão
                </span>
                <span className="block font-heading text-sm font-bold text-foreground">
                  {champion.name}
                </span>
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {filledCount}/{totalPicks} confrontos
            </span>
          )}

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            <RotateCcw className="size-3.5" />
            Reiniciar
          </button>
        </div>
      </div>

      {/* Palco radial */}
      <div className="w-full px-2 [container-type:inline-size]">
        <div className="relative mx-auto aspect-square w-full max-w-[1000px]">
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
              <text
                key={label.text}
                x={50}
                y={50 - label.radius}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={GOLD}
                fillOpacity={0.85}
                fontSize={1.5}
                fontWeight={700}
                letterSpacing={0.25}
                style={{ textTransform: "uppercase" }}
              >
                {label.text}
              </text>
            ))}
          </svg>

          {/* Brilho central + taça */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/20 blur-2xl" />
          <div className="absolute left-1/2 top-1/2 z-10 flex size-[20%] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <img
              src="/images/trophy.png"
              alt="Taça da Copa do Mundo"
              className="size-full object-contain drop-shadow-[0_0_18px_oklch(0.82_0.13_80/0.55)]"
            />
          </div>

          {/* Nós de cada anel */}
          {RINGS.map((ringCfg, ring) =>
            Array.from({ length: ringCfg.count }).map((_, index) => {
              const team = teamAt(ring, index)
              const pos = nodePos(ring, index)
              const advanced = hasAdvanced(ring, index, team)
              return (
                <Node
                  key={`${ring}-${index}`}
                  team={team}
                  size={ringCfg.size}
                  left={pos.left}
                  top={pos.top}
                  advanced={advanced}
                  onClick={() => pick(ring, index)}
                />
              )
            }),
          )}
        </div>
      </div>

      {/* Assinatura */}
      <span className="font-heading text-sm font-bold tracking-tight text-muted-foreground/70">
        es
      </span>
    </div>
  )
}

function Node({
  team,
  size,
  left,
  top,
  advanced,
  onClick,
}: {
  team: Team | null
  size: number
  left: number
  top: number
  advanced: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!team}
      title={team?.name ?? "Aguardando confronto"}
      aria-label={team ? `Avançar ${team.name}` : "Aguardando confronto"}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold enabled:hover:scale-110"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}cqmin`,
        height: `${size}cqmin`,
      }}
    >
      {team ? (
        <span
          className={`flex size-full items-center justify-center overflow-hidden rounded-full bg-card shadow-md ring-2 ${
            advanced
              ? "ring-gold shadow-[0_0_14px_oklch(0.82_0.13_80/0.6)]"
              : "ring-border"
          }`}
        >
          <img
            src={flagUrl(team.slug) || "/placeholder.svg"}
            alt={`Bandeira ${team.name}`}
            loading="lazy"
            className="size-full scale-[1.45] rounded-full object-cover"
          />
        </span>
      ) : null}
    </button>
  )
}
