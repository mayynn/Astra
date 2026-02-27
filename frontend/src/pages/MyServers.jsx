import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Topbar from "../components/Topbar.jsx"
import { api } from "../services/api.js"
import { useAppUI } from "../context/AppUIContext.jsx"
import { Server, Search, AlertCircle, Clock, Plus } from "lucide-react"

export default function MyServers() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [renewing, setRenewing] = useState({})
  const [countdowns, setCountdowns] = useState({})
  const [searchQuery, setSearchQuery] = useState("")
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
  }, [navigate, showError])

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

  const filteredServers = servers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.identifier?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Loading servers...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16">
      <Topbar />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-100 mb-2">My servers</h1>
          <p className="text-gray-400">Manage and monitor your active servers.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 bg-dark-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
          
          <button
            onClick={() => navigate("/plans")}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create server
          </button>
        </div>
      </div>

      {/* Servers List */}
      {filteredServers.length === 0 ? (
        <div className="bg-dark-800 rounded-2xl border border-gray-800 p-12 text-center">
          <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-100 mb-2">
            {searchQuery ? "No servers found" : "No servers yet"}
          </h3>
          <p className="text-gray-400 mb-6">
            {searchQuery
              ? "Try adjusting your search query."
              : "Create your first server to get started."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate("/plans")}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
            >
              Browse plans
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {filteredServers.map((server) => (
            <div
              key={server.id}
              className="bg-dark-800 rounded-xl border border-gray-800 p-6 space-y-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">{server.name}</h3>
                  <p className="text-sm text-gray-400">{server.plan}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    server.status === "active"
                      ? "bg-green-500/10 text-green-500"
                      : server.status === "suspended"
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "bg-gray-500/10 text-gray-400"
                  }`}
                >
                  {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                </span>
              </div>

              {server.status === "suspended" && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-yellow-500 font-medium">Server suspended</p>
                    <p className="text-yellow-400/80">
                      Renew within {countdowns[`grace-${server.id}`] || "12h"} to avoid deletion.
                    </p>
                  </div>
                </div>
              )}

              {server.status === "deleted" && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  Server deleted. Grace period expired.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                {server.ip && server.port && (
                  <div className="col-span-2">
                    <p className="text-gray-400 mb-1">Server Address</p>
                    <div className="flex items-center gap-2 bg-dark-900 px-3 py-2 rounded-lg border border-gray-700">
                      <p className="font-mono font-medium text-primary-400">
                        {server.ip}:{server.port}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${server.ip}:${server.port}`)
                          showSuccess("Server address copied!")
                        }}
                        className="ml-auto text-gray-400 hover:text-primary-400 transition-colors"
                        title="Copy to clipboard"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-gray-400 mb-1">Expires in</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-100">
                      {countdowns[server.id] || "Loading..."}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Plan type</p>
                  <p className="font-medium text-gray-100">
                    {server.plan_type === "coin" ? "Coin plan" : "Real money"}
                  </p>
                </div>
                {server.plan_type === "coin" && (
                  <div>
                    <p className="text-gray-400 mb-1">Renewal cost</p>
                    <p className="font-medium text-primary-500">
                      {server.coin_cost || 0} coins
                    </p>
                  </div>
                )}
                {server.plan_type === "real" && (
                  <div>
                    <p className="text-gray-400 mb-1">Renewal cost</p>
                    <p className="font-medium text-primary-500">
                      ₹{server.real_cost || 0}
                    </p>
                  </div>
                )}
                {server.server_identifier && (
                  <div>
                    <p className="text-gray-400 mb-1">Identifier</p>
                    <p className="font-medium text-gray-100 font-mono text-xs">
                      {server.server_identifier}
                    </p>
                  </div>
                )}
              </div>

              {server.status !== "deleted" && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleRenew(server.id)}
                    disabled={renewing[server.id]}
                    className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {renewing[server.id] ? "Renewing..." : "Renew"}
                  </button>
                  <button
                    onClick={() => navigate(`/servers/${server.id}/manage`)}
                    className="flex-1 px-4 py-2 bg-dark-900 hover:bg-gray-800 text-gray-100 rounded-lg font-medium border border-gray-700 transition-colors"
                  >
                    Manage
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
