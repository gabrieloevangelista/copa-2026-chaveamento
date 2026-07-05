import { NextResponse } from "next/server"
import { TEAMS, type Team } from "@/components/teams"

function findTeamByEnglishName(name: string): Team | null {
  const normalized = name.toLowerCase().trim()
  
  const mapping: Record<string, string> = {
    "brazil": "brazil",
    "norway": "norway",
    "mexico": "mexico",
    "england": "england",
    "france": "france",
    "paraguay": "paraguay",
    "morocco": "morocco",
    "canada": "canada",
    "colombia": "colombia",
    "ghana": "ghana",
    "switzerland": "switzerland",
    "algeria": "algeria",
    "argentina": "argentina",
    "egypt": "egypt",
    "portugal": "portugal",
    "spain": "spain",
    "usa": "usa",
    "united states": "usa",
    "belgium": "belgium",
    "senegal": "senegal",
    "croatia": "croatia",
    "germany": "germany",
    "sweden": "sweden",
    "austria": "austria",
    "netherlands": "netherlands",
    "south africa": "south-africa",
    "ecuador": "ecuador-circular",
    "bosnia": "bosnia-and-herzegovina",
    "bosnia and herzegovina": "bosnia-and-herzegovina",
    "cape verde": "cape-verde",
    "australia": "australia-flag",
    "dr congo": "congo",
    "congo dr": "congo",
    "ivory coast": "ivory-coast",
    "côte d'ivoire": "ivory-coast"
  }

  const slug = mapping[normalized]
  if (slug) {
    return TEAMS.find(t => t.slug === slug) || null
  }
  
  return TEAMS.find(t => t.name.toLowerCase().includes(normalized) || t.slug.includes(normalized)) || null
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "") // YYYYMMDD
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${today}`
    
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "espn_api_failed" })
    }

    const data = await response.json()
    const events = data.events ?? []

    if (events.length === 0) {
      return NextResponse.json({ error: "no_live_matches" })
    }

    // Tenta encontrar um jogo em andamento ("in"), senão pega o primeiro do dia
    let selectedEvent = events.find((e: any) => e.status?.type?.state === "in")
    if (!selectedEvent) {
      selectedEvent = events[0]
    }

    const competition = selectedEvent.competitions?.[0]
    if (!competition || !competition.competitors || competition.competitors.length < 2) {
      return NextResponse.json({ error: "invalid_competition_data" })
    }

    const homeCompetitor = competition.competitors.find((c: any) => c.homeAway === "home")
    const awayCompetitor = competition.competitors.find((c: any) => c.homeAway === "away")

    if (!homeCompetitor || !awayCompetitor) {
      return NextResponse.json({ error: "missing_competitors" })
    }

    const homeTeamName = homeCompetitor.team?.name
    const awayTeamName = awayCompetitor.team?.name

    if (!homeTeamName || !awayTeamName) {
      return NextResponse.json({ error: "missing_team_names" })
    }

    const t1 = findTeamByEnglishName(homeTeamName)
    const t2 = findTeamByEnglishName(awayTeamName)

    if (!t1 || !t2) {
      return NextResponse.json({ error: "teams_not_found_in_bracket" })
    }

    const homeScore = parseInt(homeCompetitor.score || "0", 10)
    const awayScore = parseInt(awayCompetitor.score || "0", 10)

    const state = selectedEvent.status?.type?.state
    const name = selectedEvent.status?.type?.name
    const isActive = state === "in"
    
    let status: "live" | "halftime" | "finished" = "live"
    if (name === "STATUS_HALFTIME") {
      status = "halftime"
    } else if (state === "post") {
      status = "finished"
    }

    const minute = Math.floor((selectedEvent.status?.clock ?? 0) / 60)

    // Extrai o último jogador a fazer gol
    let scorer = ""
    const goalEvents = selectedEvent.details?.filter((d: any) => d.type?.text === "Goal")
    if (goalEvents && goalEvents.length > 0) {
      const lastGoal = goalEvents[goalEvents.length - 1]
      scorer = lastGoal.athletesInvolved?.[0]?.displayName || ""
    }

    return NextResponse.json({
      t1,
      t2,
      t1Score: homeScore,
      t2Score: awayScore,
      isActive,
      status,
      minute,
      scorer,
      source: "espn",
    })

  } catch (error: any) {
    console.error("[ESPN] Exceção:", error.message)
    return NextResponse.json({
      error: error.message,
      source: "espn",
    })
  }
}
