export type Team = {
  id: number
  name: string
  slug: string
}

export function flagUrl(slug: string) {
  return `https://img.icons8.com/color/96/${slug}.png`
}

// Ordem dos 32 times no anel externo (16-avos de final).
// Times adjacentes (0-1, 2-3, ...) se enfrentam.
export const TEAMS: Team[] = [
  { id: 0, name: "França", slug: "france" },
  { id: 1, name: "Suécia", slug: "sweden" },
  { id: 2, name: "África do Sul", slug: "south-africa" },
  { id: 3, name: "Canadá", slug: "canada" },
  { id: 4, name: "Holanda", slug: "netherlands" },
  { id: 5, name: "Marrocos", slug: "morocco" },
  { id: 6, name: "Portugal", slug: "portugal" },
  { id: 7, name: "Croácia", slug: "croatia" },
  { id: 8, name: "Espanha", slug: "spain" },
  { id: 9, name: "Áustria", slug: "austria" },
  { id: 10, name: "EUA", slug: "usa" },
  { id: 11, name: "Bósnia", slug: "bosnia-and-herzegovina" },
  { id: 12, name: "Bélgica", slug: "belgium" },
  { id: 13, name: "Senegal", slug: "senegal" },
  { id: 14, name: "Gana", slug: "ghana" },
  { id: 15, name: "Colômbia", slug: "colombia" },
  { id: 16, name: "Paraguai", slug: "paraguay" },
  { id: 17, name: "Alemanha", slug: "germany" },
  { id: 18, name: "Brasil", slug: "brazil" },
  { id: 19, name: "Japão", slug: "japan" },
  { id: 20, name: "Costa do Marfim", slug: "ivory-coast" },
  { id: 21, name: "Noruega", slug: "norway" },
  { id: 22, name: "México", slug: "mexico" },
  { id: 23, name: "Equador", slug: "ecuador-circular" },
  { id: 24, name: "Inglaterra", slug: "england" },
  { id: 25, name: "Rep. Dem. Congo", slug: "congo" },
  { id: 26, name: "Argentina", slug: "argentina" },
  { id: 27, name: "Cabo Verde", slug: "cape-verde" },
  { id: 28, name: "Austrália", slug: "australia-flag" },
  { id: 29, name: "Egito", slug: "egypt" },
  { id: 30, name: "Argélia", slug: "algeria" },
  { id: 31, name: "Suíça", slug: "switzerland" },
]

export const ROUND_LABELS = [
  "16-avos de final",
  "Oitavas de final",
  "Quartas de final",
  "Semifinais",
  "Final",
]
