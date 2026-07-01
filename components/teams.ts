export type Team = {
  id: number
  name: string
  slug: string
}

export function flagUrl(slug: string) {
  return `https://img.icons8.com/color/96/${slug}.png`
}

// Ordem dos 32 times no anel externo (16-avos de final).
// Cada bloco de 4 forma uma sub-chave: os pares adjacentes (ex.: 16-17 e 18-19)
// se enfrentam nos 16-avos e os vencedores se encontram nas oitavas.
// Ex.: Brasil×Japão e Costa do Marfim×Noruega -> vencedores se enfrentam nas oitavas.
export const TEAMS: Team[] = [
  { id: 0, name: "África do Sul", slug: "south-africa" },
  { id: 1, name: "Canadá", slug: "canada" },
  { id: 2, name: "Holanda", slug: "netherlands" },
  { id: 3, name: "Marrocos", slug: "morocco" },
  { id: 4, name: "Portugal", slug: "portugal" },
  { id: 5, name: "Croácia", slug: "croatia" },
  { id: 6, name: "Espanha", slug: "spain" },
  { id: 7, name: "Áustria", slug: "austria" },
  { id: 8, name: "EUA", slug: "usa" },
  { id: 9, name: "Bósnia", slug: "bosnia-and-herzegovina" },
  { id: 10, name: "Bélgica", slug: "belgium" },
  { id: 11, name: "Senegal", slug: "senegal" },
  { id: 30, name: "França", slug: "france" },
  { id: 31, name: "Suécia", slug: "sweden" },
  { id: 14, name: "Paraguai", slug: "paraguay" },
  { id: 15, name: "Alemanha", slug: "germany" },
  { id: 16, name: "Brasil", slug: "brazil" },
  { id: 17, name: "Japão", slug: "japan" },
  { id: 18, name: "Costa do Marfim", slug: "ivory-coast" },
  { id: 19, name: "Noruega", slug: "norway" },
  { id: 20, name: "México", slug: "mexico" },
  { id: 21, name: "Equador", slug: "ecuador-circular" },
  { id: 22, name: "Inglaterra", slug: "england" },
  { id: 23, name: "Rep. Dem. Congo", slug: "congo" },
  { id: 24, name: "Argentina", slug: "argentina" },
  { id: 25, name: "Cabo Verde", slug: "cape-verde" },
  { id: 26, name: "Austrália", slug: "australia-flag" },
  { id: 27, name: "Egito", slug: "egypt" },
  { id: 28, name: "Argélia", slug: "algeria" },
  { id: 29, name: "Suíça", slug: "switzerland" },
  { id: 12, name: "Gana", slug: "ghana" },
  { id: 13, name: "Colômbia", slug: "colombia" },
]

export const ROUND_LABELS = [
  "16-avos de final",
  "Oitavas de final",
  "Quartas de final",
  "Semifinais",
  "Final",
]
