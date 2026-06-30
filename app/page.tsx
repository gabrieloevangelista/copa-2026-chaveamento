import { WorldCupBracket } from "@/components/world-cup-bracket"

export default function Page() {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-background py-4 sm:py-12">
      <WorldCupBracket />
    </main>
  )
}
