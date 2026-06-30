import { WorldCupBracket } from "@/components/world-cup-bracket"

export default function Page() {
  return (
    <main className="flex w-full flex-col items-center overflow-y-auto bg-background py-4 sm:py-8" style={{ minHeight: "100dvh" }}>
      <WorldCupBracket />
    </main>
  )
}
