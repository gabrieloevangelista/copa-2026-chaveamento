import { NextResponse } from "next/server"

export async function GET() {
  const xCookie = process.env.X_COOKIE || ""
  const url = "https://x.com/i/jf/soccer/league/home/id/2059337548200087553"

  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      "Accept": "application/json, text/html, */*",
    }

    if (xCookie) {
      headers["Cookie"] = xCookie
    }

    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      // Retorna fallback 2 x 0 para México vs Equador se a requisição falhar (como por exemplo se estiver sem login)
      return NextResponse.json({
        matchId: "0-10",
        homeScore: 2,
        awayScore: 0,
        isActive: true,
        status: "halftime",
        warning: `Fails to fetch X.com: ${response.status}. Using fallback.`
      })
    }

    const text = await response.text()
    
    let homeScore = 2
    let awayScore = 0
    let isActive = true
    let status = "halftime"

    try {
      const data = JSON.parse(text)
      if (data && data.fixtures) {
        const fixture = data.fixtures.find((f: any) => f.id === "2059337548200087553" || f.name?.includes("Mexico"))
        if (fixture) {
          homeScore = fixture.scores?.home ?? 2
          awayScore = fixture.scores?.away ?? 0
          isActive = fixture.status === "live" || fixture.status === "halftime"
          status = fixture.status === "halftime" ? "halftime" : (fixture.status === "live" ? "live" : "finished")
        }
      }
    } catch {
      // Regex fallback
      const match = text.match(/México\s*(?:Placar|Score|x)\s*(\d+)\s*-\s*(\d+)\s*Equador/i)
      if (match) {
        homeScore = parseInt(match[1])
        awayScore = parseInt(match[2])
      }

      if (/intervalo|halftime|HT/i.test(text)) {
        status = "halftime"
        isActive = true
      } else if (/fim|ended|FT|fulltime/i.test(text)) {
        status = "finished"
        isActive = false
      } else {
        status = "live"
        isActive = true
      }
    }

    return NextResponse.json({
      matchId: "0-10",
      homeScore,
      awayScore,
      isActive,
      status
    })
  } catch (error: any) {
    // Retorna fallback se houver exceções
    return NextResponse.json({
      matchId: "0-10",
      homeScore: 2,
      awayScore: 0,
      isActive: true,
      status: "halftime",
      error: error.message
    })
  }
}
