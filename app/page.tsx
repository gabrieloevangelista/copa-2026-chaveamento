import { WorldCupBracket } from "@/components/world-cup-bracket"

export default function Page() {
  return (
    <main className="w-full bg-background" style={{ height: "100dvh", overflow: "hidden" }}>
      <WorldCupBracket />
    </main>
  )
}
