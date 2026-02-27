import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import SectionHeader from "../components/SectionHeader.jsx"
import ServerCard from "../components/ServerCard.jsx"
import { SkeletonCard } from "../components/Skeletons.jsx"
import { api } from "../services/api.js"
import { useAppUI } from "../context/AppUIContext.jsx"

export default function MyServers() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [renewing, setRenewing] = useState({})
  const [countdowns, setCountdowns] = useState({})
  const navigate = useNavigate()
  const { showSuccess, showError } = useAppUI()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }

    const loadServers = async () => {
      try {
        const data = await api.getUserServers(token)
        setServers(data || [])
      } catch (err) {
        showError(err.message || "Failed to load servers.")
      } finally {
        setLoading(false)
      }
    }

    loadServers()
  }, [navigate])

  // Update countdowns every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdowns = {}
      servers.forEach((server) => {
        if (server.expires_at) {
          const expiryTime = new Date(server.expires_at).getTime()
          const now = Date.now()
          const diff = expiryTime - now

          if (diff <= 0) {
            newCountdowns[server.id] = "Expired"
          } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

            if (days > 0) {
              newCountdowns[server.id] = `${days}d ${hours}h`
            } else if (hours > 0) {
              newCountdowns[server.id] = `${hours}h ${minutes}m`
            } else {
              newCountdowns[server.id] = `${minutes}m`
            }
          }
        }

        // Grace period countdown (if suspended)
        if (server.grace_expires_at) {
          const graceTime = new Date(server.grace_expires_at).getTime()
          const now = Date.now()
          const diff = graceTime - now

          if (diff <= 0) {
            newCountdowns[`grace-${server.id}`] = "Grace expired"
          } else {
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            newCountdowns[`grace-${server.id}`] = `${hours}h ${minutes}m`
          }
        }
      })
      setCountdowns(newCountdowns)
    }, 1000)

    return () => clearInterval(interval)
  }, [servers])

  const handleRenew = async (serverId) => {
    setRenewing((prev) => ({ ...prev, [serverId]: true }))

    try {
      const token = localStorage.getItem("token")
      await api.renewServer(token, serverId)
      showSuccess("Server renewed successfully.")

      // Refresh servers
      const data = await api.getUserServers(token)
      setServers(data || [])
    } catch (err) {
      showError(err.message || "Failed to renew server.")
    } finally {
      setRenewing((prev) => ({ ...prev, [serverId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="My Servers" subtitle="Expiry countdowns and renewal actions update in real time." />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (servers.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="My Servers"
          subtitle="Expiry countdowns and renewal actions update in real time."
        />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-ink-900/70 py-12">
          <p className="text-slate-400 mb-4">No active servers</p>
          <a
            href="/plans"
            className="button-3d rounded-xl bg-aurora-500/20 px-6 py-2 text-sm font-semibold text-aurora-200 hover:bg-aurora-500/30"
          >
            Deploy a server
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="My Servers"
        subtitle="Expiry countdowns and renewal actions update in real time."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {servers.map((server) => (
          <div
            key={server.id}
            className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6 space-y-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-100">{server.name}</h3>
              <p className="text-xs text-slate-500">{server.plan}</p>
            </div>

            {server.status === "suspended" && (
              <div className="rounded-lg bg-red-900/20 border border-red-700/30 p-3 text-xs text-red-300">
                ⚠️ Your server is suspended. Renew within {countdowns[`grace-${server.id}`] || "12h"} to avoid deletion.
              </div>
            )}

            {server.status === "deleted" && (
              <div className="rounded-lg bg-slate-900/50 border border-slate-700/30 p-3 text-xs text-slate-400">
                ❌ Server deleted. Grace period expired.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className={`font-semibold ${
                  server.status === "active" ? "text-aurora-200" :
                  server.status === "suspended" ? "text-orange-300" :
                  "text-slate-400"
                }`}>
                  {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Expires in</p>
                <p className="font-semibold text-slate-100">
                  {countdowns[server.id] || "Loading..."}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Plan</p>
                <p className="font-semibold text-slate-100">{server.plan}</p>
              </div>
              {server.plan_type === 'coin' && (
                <div>
                  <p className="text-xs text-slate-500">Coins Cost</p>
                  <p className="font-semibold text-aurora-200">
                    {server.coin_cost || 0}₳
                  </p>
                </div>
              )}
              {server.plan_type === 'real' && (
                <div>
                  <p className="text-xs text-slate-500">Real Cost</p>
                  <p className="font-semibold text-aurora-200">
                    {server.real_cost || 0}₹
                  </p>
                </div>
              )}
            </div>

            {server.status !== "deleted" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleRenew(server.id)}
                  disabled={renewing[server.id]}
                  className="button-3d flex-1 rounded-xl bg-aurora-500/20 px-4 py-2 text-sm font-semibold text-aurora-200 hover:bg-aurora-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {renewing[server.id] ? "Renewing..." : "Renew"}
                </button>
                <button
                  onClick={() => navigate(`/servers/${server.id}/manage`)}
                  className="button-3d flex-1 rounded-xl border border-slate-600/60 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-500/80"
                >
                  Manage
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
