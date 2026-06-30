import { WorldCupBracket } from "@/components/world-cup-bracket"

export default function Page() {
  return (
    <main className="flex w-full flex-col items-center justify-center overflow-y-auto bg-background py-2 sm:py-3 lg:py-1" style={{ minHeight: "100dvh" }}>
      <WorldCupBracket />
    </main>
  )
}
