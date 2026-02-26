import { useState, useEffect } from "react"
import { MapPin } from "lucide-react"
import Badge from "./Badge.jsx"

export default function ServerCard({ server, onRenew }) {
  const [countdown, setCountdown] = useState("")
  const [graceCountdown, setGraceCountdown] = useState("")

  const statusTone = {
    active: "active",
    suspended: "suspended",
    deleted: "deleted"
  }

  // Real-time countdown for expiry
  useEffect(() => {
    if (!server.expires_at) return

    const interval = setInterval(() => {
      const expiryTime = new Date(server.expires_at).getTime()
      const now = Date.now()
      const diff = expiryTime - now

      if (diff <= 0) {
        setCountdown("Expired")
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        if (days > 0) {
          setCountdown(`${days}d ${hours}h`)
        } else if (hours > 0) {
          setCountdown(`${hours}h ${minutes}m`)
        } else {
          setCountdown(`${minutes}m`)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [server.expires_at])

  // Real-time countdown for grace period
  useEffect(() => {
    if (!server.grace_expires_at) return

    const interval = setInterval(() => {
      const graceTime = new Date(server.grace_expires_at).getTime()
      const now = Date.now()
      const diff = graceTime - now

      if (diff <= 0) {
        setGraceCountdown("Grace expired")
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setGraceCountdown(`${hours}h ${minutes}m`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [server.grace_expires_at])

  const handleManage = () => {
    window.open("https://panel.astranodes.cloud", "_blank")
  }

  return (
    <div className="rounded-2xl border border-slate-700/40 bg-ink-900/70 p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{server.name}</h3>
          <p className="text-sm text-slate-400">
            {server.plan}
            {server.location && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />{server.location}
              </span>
            )}
          </p>
        </div>
        <Badge label={server.status} tone={statusTone[server.status]} />
      </div>

      {server.status === "suspended" && graceCountdown && (
        <div className="mt-4 rounded-lg bg-red-900/20 border border-red-700/30 p-3 text-xs text-red-300">
          ⚠️ Suspended. Renew within {graceCountdown} to avoid deletion.
        </div>
      )}

      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Expiry</p>
          <p className="mt-1 font-semibold">{countdown || "Loading..."}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Status</p>
          <p className={`mt-1 font-semibold ${
            server.status === "active" ? "text-aurora-200" :
            server.status === "suspended" ? "text-orange-300" :
            "text-slate-400"
          }`}>
            {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Cost</p>
          <p className="mt-1 font-semibold">
            {server.plan_type === "coin" ? `${server.coin_cost || 0}₳` : `₹${server.real_cost || 0}`}
          </p>
        </div>
      </div>

      {server.status !== "deleted" && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => onRenew && onRenew(server.id)}
            className="rounded-xl bg-neon-500/15 px-4 py-2 text-sm font-semibold text-neon-200 transition hover:bg-neon-500/25"
          >
            Renew
          </button>
          <button
            onClick={handleManage}
            className="rounded-xl border border-slate-600/60 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500/80"
          >
            Manage
          </button>
        </div>
      )}
    </div>
  )
}
