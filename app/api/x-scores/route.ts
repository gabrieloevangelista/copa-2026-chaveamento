import { NextResponse } from "next/server"
import { findScheduleMatch, type ScheduleItem } from "@/lib/sportmonks-mapping"

const SPORTMONKS_BASE = "https://api.sportmonks.com/v3/football"
const WORLD_CUP_SEASON_ID = "26618" // FIFA World Cup 2026

/**
 * SCHEDULE parcial — apenas os campos necessários para o mapeamento.
 * Evita importar o componente inteiro (que é "use client").
 */
const SCHEDULE: ScheduleItem[] = [
  { id: "J76", t1_idx: 0, t2_idx: 1, parentWinnerKey: "1-0" },   // Brasil x Japão
  { id: "J78", t1_idx: 2, t2_idx: 3, parentWinnerKey: "1-1" },   // Costa do Marfim x Noruega
  { id: "J79", t1_idx: 4, t2_idx: 5, parentWinnerKey: "1-2" },   // México x Equador
  { id: "J80", t1_idx: 6, t2_idx: 7, parentWinnerKey: "1-3" },   // Inglaterra x RD Congo
  { id: "J86", t1_idx: 8, t2_idx: 9, parentWinnerKey: "1-4" },   // Argentina x Cabo Verde
  { id: "J88", t1_idx: 10, t2_idx: 11, parentWinnerKey: "1-5" }, // Austrália x Egito
  { id: "J85", t1_idx: 12, t2_idx: 13, parentWinnerKey: "1-6" }, // Suíça x Argélia
  { id: "J87", t1_idx: 14, t2_idx: 15, parentWinnerKey: "1-7" }, // Colômbia x Gana
  { id: "J74", t1_idx: 16, t2_idx: 17, parentWinnerKey: "1-8" }, // Alemanha x Paraguai
  { id: "J77", t1_idx: 18, t2_idx: 19, parentWinnerKey: "1-9" }, // França x Suécia
  { id: "J73", t1_idx: 20, t2_idx: 21, parentWinnerKey: "1-10" }, // África do Sul x Canadá
  { id: "J75", t1_idx: 22, t2_idx: 23, parentWinnerKey: "1-11" }, // Holanda x Marrocos
  { id: "J83", t1_idx: 24, t2_idx: 25, parentWinnerKey: "1-12" }, // Portugal x Croácia
  { id: "J84", t1_idx: 26, t2_idx: 27, parentWinnerKey: "1-13" }, // Espanha x Áustria
  { id: "J81", t1_idx: 28, t2_idx: 29, parentWinnerKey: "1-14" }, // EUA x Bósnia
  { id: "J82", t1_idx: 30, t2_idx: 31, parentWinnerKey: "1-15" }, // Bélgica x Senegal
]

type SportmonksScore = {
  description: string
  score: {
    participant: string
    goals: number
  }
}

type SportmonksEvent = {
  type_id: number
  player_name?: string
  minute?: number
  result?: string
}

type SportmonksParticipant = {
  id: number
  name: string
  meta?: {
    location?: string // "home" | "away"
  }
}

type SportmonksFixture = {
  id: number
  state_id: number
  participants?: SportmonksParticipant[]
  scores?: SportmonksScore[]
  events?: SportmonksEvent[]
}

/**
 * Extrai o placar atual (gols) de um fixture da SportMonks.
 * Prioriza "CURRENT" > "2ND_HALF" > "1ST_HALF" nos scores.
 */
function extractScores(fixture: SportmonksFixture): { homeScore: number; awayScore: number } {
  let homeScore = 0
  let awayScore = 0

  if (!fixture.scores || fixture.scores.length === 0) {
    return { homeScore, awayScore }
  }

  // Procura o score "CURRENT" primeiro, depois "2ND_HALF", depois "1ST_HALF"
  const priority = ["CURRENT", "2ND_HALF", "1ST_HALF"]
  
  for (const desc of priority) {
    const matching = fixture.scores.filter(s => s.description === desc)
    if (matching.length >= 2) {
      for (const s of matching) {
        if (s.score.participant === "home") homeScore = s.score.goals
        else if (s.score.participant === "away") awayScore = s.score.goals
      }
      return { homeScore, awayScore }
    }
  }

  // Fallback: usa quaisquer scores disponíveis
  for (const s of fixture.scores) {
    if (s.score.participant === "home") homeScore = s.score.goals
    else if (s.score.participant === "away") awayScore = s.score.goals
  }

  return { homeScore, awayScore }
}

/**
 * Mapeia o state_id da SportMonks para nosso status.
 * 
 * State IDs comuns da SportMonks:
 * 1 = NS (Not Started), 2 = LIVE (1st Half), 3 = HT (Half Time),
 * 4 = LIVE (2nd Half), 5 = FT (Full Time), 6 = FT_PEN,
 * 7 = AET (After Extra Time), 8 = BREAK, 9 = ET (Extra Time 1st Half),
 * 10 = ET (Extra Time 2nd Half), 11 = PEN_LIVE
 */
function mapStatus(stateId: number): "live" | "halftime" | "finished" {
  switch (stateId) {
    case 3: // HT
    case 8: // BREAK
      return "halftime"
    case 5: // FT
    case 6: // FT_PEN
    case 7: // AET
      return "finished"
    default:
      return "live"
  }
}

function isLiveState(stateId: number): boolean {
  // States que indicam jogo em andamento (inclui HT que ainda não acabou)
  return [2, 3, 4, 8, 9, 10, 11].includes(stateId)
}

/**
 * Extrai o minuto atual e o último goleador dos eventos.
 */
function extractMatchDetails(fixture: SportmonksFixture): { minute: number; scorer: string } {
  let minute = 0
  let scorer = ""

  if (fixture.events && fixture.events.length > 0) {
    // Encontra o evento mais recente para obter o minuto
    const lastEvent = fixture.events.reduce((latest, ev) =>
      (ev.minute ?? 0) > (latest.minute ?? 0) ? ev : latest
    , fixture.events[0])
    
    minute = lastEvent.minute ?? 0

    // Encontra o último gol (type_id 14 = Goal na SportMonks)
    const goals = fixture.events
      .filter(ev => ev.type_id === 14)
      .sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0))
    
    if (goals.length > 0) {
      scorer = goals[0].player_name ?? ""
    }
  }

  return { minute, scorer }
}

async function fetchSportmonks(endpoint: string): Promise<any> {
  const token = process.env.SPORTMONKS_API_TOKEN
  
  if (!token || token === "YOUR_TOKEN_HERE") {
    return null
  }

  const url = `${SPORTMONKS_BASE}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_token=${token}`
  
  const response = await fetch(url, {
    headers: { "Accept": "application/json" },
    next: { revalidate: 0 }, // Sem cache no servidor
  })

  if (!response.ok) {
    console.error(`[SportMonks] Erro ${response.status}: ${response.statusText}`)
    return null
  }

  return response.json()
}

export async function GET() {
  try {
    // 1. Tenta buscar livescores (jogos em andamento)
    const liveData = await fetchSportmonks(
      `/livescores/inplay?include=scores;events;participants&filters=fixtureSeasons:${WORLD_CUP_SEASON_ID}`
    )

    let fixtures: SportmonksFixture[] = liveData?.data ?? []

    // 2. Se não há jogos ao vivo, busca fixtures do dia (pode ter jogos recém-encerrados)
    if (fixtures.length === 0) {
      const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
      const dayData = await fetchSportmonks(
        `/fixtures/date/${today}?include=scores;events;participants&filters=fixtureSeasons:${WORLD_CUP_SEASON_ID}`
      )
      fixtures = dayData?.data ?? []
    }

    if (fixtures.length === 0) {
      return NextResponse.json({ error: "no_live_matches" })
    }

    // 3. Para cada fixture, tenta fazer match com nosso SCHEDULE
    for (const fixture of fixtures) {
      if (!fixture.participants || fixture.participants.length < 2) continue

      const homeParticipant = fixture.participants.find(p => p.meta?.location === "home")
      const awayParticipant = fixture.participants.find(p => p.meta?.location === "away")

      if (!homeParticipant || !awayParticipant) continue

      const scheduleItem = findScheduleMatch(
        homeParticipant.name,
        awayParticipant.name,
        SCHEDULE
      )

      if (!scheduleItem) continue

      const { homeScore, awayScore } = extractScores(fixture)
      const status = mapStatus(fixture.state_id)
      const isActive = isLiveState(fixture.state_id)
      const { minute, scorer } = extractMatchDetails(fixture)

      return NextResponse.json({
        matchId: scheduleItem.id,
        homeScore,
        awayScore,
        isActive,
        status,
        minute,
        scorer,
        source: "sportmonks",
      })
    }

    // Nenhum fixture correspondeu ao nosso SCHEDULE
    return NextResponse.json({ error: "no_matching_fixtures" })

  } catch (error: any) {
    console.error("[SportMonks] Exceção:", error.message)
    return NextResponse.json({
      error: error.message,
      source: "sportmonks",
    })
  }
}
