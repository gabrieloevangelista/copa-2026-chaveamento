import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chaveamento Copa 2026",
    short_name: "Copa 2026",
    description: "Chaveamento interativo da Copa do Mundo 2026",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#e9b949",
    icons: [
      {
        src: "/images/fifa-2026-logo.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/images/fifa-2026-logo.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
  }
}
