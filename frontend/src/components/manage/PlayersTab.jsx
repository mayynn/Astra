import { useState } from "react"
import { Users, Loader2, Gavel, Shield, ShieldOff, UserX, UserCheck } from "lucide-react"
import { api } from "../../services/api.js"

const actions = [
  { id: "list",   label: "List Players", icon: Users,      cls: "border-slate-700/40 text-slate-300 hover:bg-slate-800/50", needsPlayer: false },
  { id: "kick",   label: "Kick",         icon: UserX,      cls: "border-orange-700/40 text-orange-300 bg-orange-900/10 hover:bg-orange-900/20", needsPlayer: true },
  { id: "ban",    label: "Ban",          icon: Gavel,      cls: "border-red-700/40 text-red-300 bg-red-900/10 hover:bg-red-900/20", needsPlayer: true },
  { id: "pardon", label: "Pardon",       icon: UserCheck,  cls: "border-green-700/40 text-green-300 bg-green-900/10 hover:bg-green-900/20", needsPlayer: true },
  { id: "op",     label: "OP",           icon: Shield,     cls: "border-neon-400/40 text-neon-200 bg-neon-500/10 hover:bg-neon-500/20", needsPlayer: true },
  { id: "deop",   label: "De-OP",        icon: ShieldOff,  cls: "border-slate-700/40 text-slate-300 hover:bg-slate-800/50", needsPlayer: true },
]

export default function PlayersTab({ serverId }) {
  const [player, setPlayer] = useState("")
  const [loading, setLoading] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const token = localStorage.getItem("token")

  const handleAction = async (action) => {
    const needsPlayer = actions.find((a) => a.id === action)?.needsPlayer
    if (needsPlayer && !player.trim()) {
      setError("Enter a player name first.")
      return
    }

    setLoading(action)
    setError("")
    setSuccess("")
    try {
      const data = await api.serverPlayerAction(token, serverId, action, player.trim() || undefined)
      setSuccess(`Executed: ${data.command}`)
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading("")
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">Player Manager</h3>
        <p className="text-xs text-slate-500">
          Manage online players via console commands. Open the Console tab to see command output.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/20 border border-red-700/30 p-2 text-xs text-red-300">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-900/20 border border-green-700/30 p-2 text-xs text-green-300">{success}</div>
      )}

      <div>
        <label htmlFor="player-name" className="block text-xs font-semibold text-slate-400 mb-1">
          Player Name
        </label>
        <input
          id="player-name"
          name="player"
          type="text"
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
          placeholder="e.g. Steve"
          autoComplete="off"
          className="w-full rounded-lg border border-slate-700/40 bg-ink-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-neon-500/50 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
          const Icon = a.icon
          const isLoading = loading === a.id
          return (
            <button
              key={a.id}
              onClick={() => handleAction(a.id)}
              disabled={!!loading}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${a.cls}`}
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
              {a.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
