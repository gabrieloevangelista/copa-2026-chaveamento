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
  { id: 4, name: "Brasil", slug: "brazil" }, // 0
  { id: 5, name: "Japão", slug: "japan" }, // 1
  { id: 6, name: "Costa do Marfim", slug: "ivory-coast" }, // 2
  { id: 7, name: "Noruega", slug: "norway" }, // 3
  { id: 20, name: "México", slug: "mexico" }, // 4
  { id: 21, name: "Equador", slug: "ecuador-circular" }, // 5
  { id: 22, name: "Inglaterra", slug: "england" }, // 6
  { id: 23, name: "RD Congo", slug: "congo" }, // 7
  { id: 28, name: "Argentina", slug: "argentina" }, // 8
  { id: 29, name: "Cabo Verde", slug: "cape-verde" }, // 9
  { id: 14, name: "Austrália", slug: "australia-flag" }, // 10
  { id: 15, name: "Egito", slug: "egypt" }, // 11
  { id: 12, name: "Suíça", slug: "switzerland" }, // 12
  { id: 13, name: "Argélia", slug: "algeria" }, // 13
  { id: 30, name: "Colômbia", slug: "colombia" }, // 14
  { id: 31, name: "Gana", slug: "ghana" }, // 15
  { id: 16, name: "Alemanha", slug: "germany" }, // 16
  { id: 17, name: "Paraguai", slug: "paraguay" }, // 17
  { id: 18, name: "França", slug: "france" }, // 18
  { id: 19, name: "Suécia", slug: "sweden" }, // 19
  { id: 0, name: "África do Sul", slug: "south-africa" }, // 20
  { id: 1, name: "Canadá", slug: "canada" }, // 21
  { id: 2, name: "Países Baixos", slug: "netherlands" }, // 22
  { id: 3, name: "Marrocos", slug: "morocco" }, // 23
  { id: 10, name: "Portugal", slug: "portugal" }, // 24
  { id: 11, name: "Croácia", slug: "croatia" }, // 25
  { id: 8, name: "Espanha", slug: "spain" }, // 26
  { id: 9, name: "Áustria", slug: "austria" }, // 27
  { id: 24, name: "Estados Unidos", slug: "usa" }, // 28
  { id: 25, name: "Bósnia e Herzegovina", slug: "bosnia-and-herzegovina" }, // 29
  { id: 26, name: "Bélgica", slug: "belgium" }, // 30
  { id: 27, name: "Senegal", slug: "senegal" }, // 31
]

export const ROUND_LABELS = [
  "16-avos de final",
  "Oitavas de final",
  "Quartas de final",
  "Semifinais",
  "Final",
]

export const TEAM_COLORS: Record<string, string[]> = {
  "south-africa": ["#007a33", "#ffb81c", "#002395", "#da291c", "#ffffff", "#000000"],
  "canada": ["#ff0000", "#ffffff"],
  "netherlands": ["#ae1c28", "#ffffff", "#21468b"],
  "morocco": ["#c1272d", "#006233"],
  "germany": ["#000000", "#ff0000", "#ffcc00"],
  "paraguay": ["#d52b1e", "#ffffff", "#0038a8"],
  "france": ["#0055a5", "#ffffff", "#ef4135"],
  "sweden": ["#006aa7", "#fecc00"],
  "portugal": ["#006600", "#ff0000", "#ffcc00"],
  "croatia": ["#ff0000", "#ffffff", "#000099"],
  "spain": ["#c60b1e", "#ffc400"],
  "austria": ["#ed2939", "#ffffff"],
  "usa": ["#0a3161", "#ffffff", "#b31942"],
  "bosnia-and-herzegovina": ["#002395", "#fecb00", "#ffffff"],
  "belgium": ["#000000", "#fdda25", "#ef3340"],
  "senegal": ["#00853f", "#fdef42", "#e11b22"],
  "brazil": ["#009c3b", "#ffdf00", "#002776", "#ffffff"],
  "japan": ["#bc002d", "#ffffff"],
  "ivory-coast": ["#ff8200", "#ffffff", "#009e60"],
  "norway": ["#ba0c2f", "#00205b", "#ffffff"],
  "mexico": ["#006847", "#ffffff", "#ce1126"],
  "ecuador-circular": ["#ffdd00", "#034ea2", "#da291c"],
  "england": ["#ffffff", "#cf142b"],
  "congo": ["#007fff", "#f7d618", "#ce1126"],
  "argentina": ["#75aadb", "#ffffff", "#fcbf49"],
  "cape-verde": ["#002a8f", "#ffffff", "#d21034", "#ffc72c"],
  "australia-flag": ["#00008b", "#ffffff", "#ff0000"],
  "egypt": ["#c00d0d", "#ffffff", "#000000", "#c09300"],
  "switzerland": ["#da291c", "#ffffff"],
  "algeria": ["#006233", "#ffffff", "#d21034"],
  "colombia": ["#fcd116", "#003893", "#ce1126"],
  "ghana": ["#da291c", "#fcd116", "#006b3f", "#000000"],
}
