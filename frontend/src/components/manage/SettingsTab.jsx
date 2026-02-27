import { useState, useEffect } from "react"
import { Loader2, Cpu, HardDrive, MemoryStick, Network } from "lucide-react"
import { api } from "../../services/api.js"

function ResourceCard({ icon: Icon, label, value, max, unit }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="rounded-lg border border-slate-800/40 bg-ink-950/50 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icon className="h-4 w-4" />
        <span className="font-semibold">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-200">
        {value} <span className="text-xs font-normal text-slate-500">/ {max} {unit}</span>
      </p>
      {max > 0 && (
        <div className="h-1.5 rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${pct > 80 ? "bg-red-500" : "bg-neon-500/60"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function SettingsTab({ serverId }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const token = localStorage.getItem("token")

  useEffect(() => {
    setLoading(true)
    api.serverGetSettings(token, serverId)
      .then((data) => setSettings(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [serverId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    )
  }

  if (error) {
    return <div className="rounded-lg bg-red-900/20 border border-red-700/30 p-3 text-xs text-red-300">{error}</div>
  }

  if (!settings) return null

  const res = settings.resources?.resources || {}
  const limits = settings.limits || {}

  return (
    <div className="space-y-6">
      {/* ── Resource usage ──────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Resource Allocation</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <ResourceCard
            icon={MemoryStick}
            label="Memory"
            value={Math.round((res.memory_bytes || 0) / 1024 / 1024)}
            max={limits.memory || 0}
            unit="MB"
          />
          <ResourceCard
            icon={Cpu}
            label="CPU"
            value={(res.cpu_absolute || 0).toFixed(1)}
            max={limits.cpu ? limits.cpu * 100 : 100}
            unit="%"
          />
          <ResourceCard
            icon={HardDrive}
            label="Disk"
            value={Math.round((res.disk_bytes || 0) / 1024 / 1024)}
            max={limits.disk || 0}
            unit="MB"
          />
        </div>
      </div>

      {/* ── Server Info ─────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Server Information</h3>
        <div className="rounded-lg border border-slate-800/40 divide-y divide-slate-800/40">
          {[
            ["Identifier", settings.identifier],
            ["Node", settings.node],
            ["Status", settings.suspended ? "Suspended" : settings.resources?.current_state || "Unknown"],
            ["Address", settings.allocations?.[0] ? `${settings.allocations[0].ip}:${settings.allocations[0].port}` : "N/A"],
            ["Memory Limit", `${limits.memory || 0} MB`],
            ["CPU Limit", `${(limits.cpu || 0) * 100}%`],
            ["Disk Limit", `${limits.disk || 0} MB`],
            ["Swap", `${limits.swap || 0} MB`],
            ["I/O Weight", limits.io || 500],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-3 py-2 text-xs">
              <span className="text-slate-500">{label}</span>
              <span className="font-semibold text-slate-300">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Startup Variables ───────────────────────────────────────────── */}
      {settings.startup_variables?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Startup Variables</h3>
          <div className="rounded-lg border border-slate-800/40 divide-y divide-slate-800/40 max-h-[300px] overflow-y-auto">
            {settings.startup_variables.map((v) => (
              <div key={v.env_variable} className="px-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">{v.env_variable}</span>
                  <span className="text-slate-300 font-semibold">{v.server_value || v.default_value || ""}</span>
                </div>
                {v.description && (
                  <p className="mt-0.5 text-xs text-slate-600">{v.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
