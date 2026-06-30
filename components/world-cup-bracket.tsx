"use client"

import { useMemo, useState } from "react"
import { RotateCcw, Trophy } from "lucide-react"
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

const round = (n: number) => Math.round(n * 1000) / 1000

function nodePos(ring: number, index: number) {
  const { count, radius } = RINGS[ring]
  const angle = ((index + 0.5) / count) * Math.PI * 2 - Math.PI / 2
  return {
    left: round(50 + radius * Math.cos(angle)),
    top: round(50 + radius * Math.sin(angle)),
  }
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

  // Linhas conectoras entre cada nó e seu nó "pai" mais ao centro.
  const lines = useMemo(() => {
    const result: {
      x1: number
      y1: number
      x2: number
      y2: number
      active: boolean
      key: string
    }[] = []
    for (let ring = 0; ring < 4; ring++) {
      for (let i = 0; i < RINGS[ring].count; i++) {
        const from = nodePos(ring, i)
        const parentIndex = Math.floor(i / 2)
        const to = nodePos(ring + 1, parentIndex)
        const child = teamAt(ring, i)
        const parentWinner = winners[`${ring + 1}-${parentIndex}`]
        result.push({
          key: `${ring}-${i}`,
          x1: from.left,
          y1: from.top,
          x2: to.left,
          y2: to.top,
          active: !!child && parentWinner?.id === child.id,
        })
      }
    }
    // Linhas dos finalistas até o centro (a taça).
    for (let i = 0; i < 2; i++) {
      const from = nodePos(4, i)
      const finalist = teamAt(4, i)
      result.push({
        key: `final-${i}`,
        x1: from.left,
        y1: from.top,
        x2: 50,
        y2: 50,
        active: !!finalist && champion?.id === finalist.id,
      })
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
    <div className="flex w-full flex-col items-center gap-6">
      {/* Cabeçalho / campeão */}
      <div className="flex w-full max-w-[1000px] flex-col items-center gap-3 px-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold-soft">
          Copa do Mundo 2026
        </p>
        <h1 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Chaveamento — dos 16-avos à final
        </h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          Clique em uma seleção para avançá-la em cada confronto. Continue até coroar o campeão no centro.
        </p>

        <div className="mt-1 flex items-center gap-4">
          {champion ? (
            <div className="flex items-center gap-3 rounded-full border border-gold/40 bg-gold/10 py-2 pl-2 pr-5">
              <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-card ring-2 ring-gold">
                <img
                  src={flagUrl(champion.slug) || "/placeholder.svg"}
                  alt={`Bandeira ${champion.name}`}
                  className="size-9 rounded-full object-cover"
                />
              </span>
              <span className="text-left">
                <span className="block text-[10px] font-medium uppercase tracking-widest text-gold-soft">
                  Campeão
                </span>
                <span className="block font-heading text-lg font-bold leading-none text-foreground">
                  {champion.name}
                </span>
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {filledCount}/{totalPicks} confrontos definidos
            </span>
          )}

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
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
            {lines.map((l) => (
              <line
                key={l.key}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                className={
                  l.active
                    ? "stroke-gold"
                    : "stroke-line/60"
                }
                strokeWidth={l.active ? 0.45 : 0.3}
                strokeLinecap="round"
              />
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
            className="size-full scale-110 rounded-full object-cover"
          />
        </span>
      ) : (
        <span className="flex size-full items-center justify-center rounded-full border border-dashed border-border bg-card/40">
          <Trophy className="size-1/3 text-muted-foreground/40" />
        </span>
      )}
    </button>
  )
}
