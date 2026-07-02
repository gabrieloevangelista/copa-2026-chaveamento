import { TEAMS, type Team } from "@/components/teams"

/**
 * Mapeamento de nomes de times usados pela SportMonks → índice no array TEAMS[].
 * 
 * A SportMonks usa nomes em inglês (ex: "Ivory Coast"), enquanto nosso SCHEDULE
 * usa índices do array TEAMS[] (ex: TEAMS[2] = "Costa do Marfim").
 * 
 * Esse mapa normaliza os nomes para garantir o match correto.
 */
const SPORTMONKS_NAME_MAP: Record<string, number> = {
  // Nomes primários (SportMonks em inglês)
  "brazil": 0,
  "japan": 1,
  "ivory coast": 2,
  "côte d'ivoire": 2,
  "cote d'ivoire": 2,
  "norway": 3,
  "mexico": 4,
  "ecuador": 5,
  "england": 6,
  "dr congo": 7,
  "congo dr": 7,
  "democratic republic of congo": 7,
  "argentina": 8,
  "cape verde": 9,
  "cabo verde": 9,
  "cape verde islands": 9,
  "australia": 10,
  "egypt": 11,
  "switzerland": 12,
  "algeria": 13,
  "colombia": 14,
  "ghana": 15,
  "germany": 16,
  "paraguay": 17,
  "france": 18,
  "sweden": 19,
  "south africa": 20,
  "canada": 21,
  "netherlands": 22,
  "morocco": 23,
  "portugal": 24,
  "croatia": 25,
  "spain": 26,
  "austria": 27,
  "united states": 28,
  "usa": 28,
  "bosnia and herzegovina": 29,
  "bosnia-herzegovina": 29,
  "belgium": 30,
  "senegal": 31,
}

/**
 * Dado o nome de um time retornado pela SportMonks, retorna o índice no TEAMS[].
 * Retorna -1 se não encontrado.
 */
export function findTeamIndex(sportmonksName: string): number {
  const normalized = sportmonksName.toLowerCase().trim()
  
  // Tenta match direto
  if (normalized in SPORTMONKS_NAME_MAP) {
    return SPORTMONKS_NAME_MAP[normalized]
  }
  
  // Tenta match parcial (ex: "Brazil" dentro de "Brazil National Team")
  for (const [key, idx] of Object.entries(SPORTMONKS_NAME_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return idx
    }
  }
  
  return -1
}

/**
 * Dado o ID de um participante da SportMonks, retorna o Team correspondente ou null.
 */
export function getTeamByIndex(index: number): Team | null {
  return TEAMS[index] ?? null
}

/**
 * Estrutura de um jogo do SCHEDULE (importada de world-cup-bracket).
 * Reproduzida aqui para evitar dependência circular.
 */
export type ScheduleItem = {
  id: string
  t1_idx: number
  t2_idx: number
  parentWinnerKey: string
}

/**
 * Dado dois nomes de times (home e away), tenta encontrar o item correspondente no SCHEDULE.
 */
export function findScheduleMatch(
  homeTeamName: string,
  awayTeamName: string,
  schedule: ScheduleItem[]
): ScheduleItem | null {
  const homeIdx = findTeamIndex(homeTeamName)
  const awayIdx = findTeamIndex(awayTeamName)
  
  if (homeIdx === -1 || awayIdx === -1) return null
  
  return schedule.find(item =>
    (item.t1_idx === homeIdx && item.t2_idx === awayIdx) ||
    (item.t1_idx === awayIdx && item.t2_idx === homeIdx)
  ) ?? null
}
