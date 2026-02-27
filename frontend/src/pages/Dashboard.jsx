import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Topbar from "../components/Topbar.jsx"
import { api } from "../services/api.js"
import { Coins, Wallet, Server } from "lucide-react"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }

    loadData()
  }, [navigate])

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token")
      const userData = JSON.parse(localStorage.getItem("user") || "{}")
      const balance = await api.getBalance(token)
      const userServers = await api.getUserServers(token)

      setUser({ ...userData, ...balance })
      setServers(userServers || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    )
  }

  const userName = user?.username || "User"
  const activeServers = servers.filter((s) => s.status === "active").length

  return (
    <div className="space-y-8 pb-16">
      <Topbar />
      
      {/* Welcome Section */}
      <section className="bg-dark-800 rounded-2xl p-8 border border-gray-800">
        <h1 className="text-3xl font-semibold text-gray-100 mb-2">
          Welcome back, {userName}
        </h1>
        <p className="text-gray-400">
          Manage your servers, track your balance, and monitor your account.
        </p>
      </section>

      {/* Stats Cards */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="bg-dark-800 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <Coins className="w-5 h-5 text-primary-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-100">Coins</h3>
          </div>
          <p className="text-2xl font-bold text-gray-100">
            {user?.coins?.toLocaleString() || "0"}
          </p>
          <p className="text-sm text-gray-400 mt-1">Available for purchases</p>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent-500/10 rounded-lg">
              <Wallet className="w-5 h-5 text-accent-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-100">Balance</h3>
          </div>
          <p className="text-2xl font-bold text-gray-100">
            ₹{(user?.balance || 0).toFixed(2)}
          </p>
          <p className="text-sm text-gray-400 mt-1">Account balance</p>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Server className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-100">Active servers</h3>
          </div>
          <p className="text-2xl font-bold text-gray-100">{activeServers}</p>
          <p className="text-sm text-gray-400 mt-1">Currently running</p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="bg-dark-800 rounded-2xl p-8 border border-gray-800">
        <h2 className="text-2xl font-semibold text-gray-100 mb-4">Quick actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => navigate("/plans")}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
          >
            Create server
          </button>
          <button
            onClick={() => navigate("/coins")}
            className="px-6 py-3 bg-dark-900 hover:bg-gray-800 text-gray-100 rounded-xl font-medium border border-gray-700 transition-colors"
          >
            Add funds
          </button>
          <button
            onClick={() => navigate("/servers")}
            className="px-6 py-3 bg-dark-900 hover:bg-gray-800 text-gray-100 rounded-xl font-medium border border-gray-700 transition-colors"
          >
            View all servers
          </button>
        </div>
      </section>

      {/* Recent Servers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-100">Your servers</h2>
          {servers.length > 0 && (
            <button
              onClick={() => navigate("/servers")}
              className="text-primary-500 hover:text-primary-400 text-sm font-medium transition-colors"
            >
              View all
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {servers.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {servers.slice(0, 4).map((server) => (
              <div
                key={server.id}
                className="bg-dark-800 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
                onClick={() => navigate(`/servers/${server.id}/manage`)}
              >
                <div className="flex items-start justify-between mb-4">
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
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Plan</p>
                    <p className="text-gray-100 font-medium">{server.plan}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Identifier</p>
                    <p className="text-gray-100 font-medium">{server.identifier || "N/A"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-dark-800 rounded-xl border border-gray-800 p-12 text-center">
            <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No servers yet. Create your first server to get started.</p>
            <button
              onClick={() => navigate("/plans")}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
            >
              Browse plans
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
