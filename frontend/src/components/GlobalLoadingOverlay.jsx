import { useAppUI } from "../context/AppUIContext.jsx"
import { Loader2 } from "lucide-react"

export default function GlobalLoadingOverlay() {
  const { isLoading } = useAppUI()

  if (!isLoading) return null

  return (
    <div
      aria-label="Loading"
      role="status"
      className="fixed inset-0 z-[8999] flex items-center justify-center bg-ink-950/60 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-4 border-neon-500/20" />
          <Loader2 className="absolute inset-0 h-14 w-14 animate-spin text-neon-400" />
        </div>
        <p className="text-sm font-medium text-slate-400">Processing…</p>
      </div>
    </div>
  )
}
