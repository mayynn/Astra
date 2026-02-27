import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Topbar from "../components/Topbar.jsx"
import ConfirmModal from "../components/ConfirmModal.jsx"
import ButtonSpinner from "../components/ButtonSpinner.jsx"
import { useAppUI } from "../context/AppUIContext.jsx"
import { api } from "../services/api.js"
import {
  MapPin,
  Package,
  Server,
  Cpu,
  HardDrive,
  Zap,
  Sparkles,
  Star,
  Crown,
  Shield,
  Rocket,
  Gift,
  Gem,
  Trophy,
  Diamond,
  Circle
} from "lucide-react"

// Icon mapping for dynamic rendering
const iconMap = {
  Package,
  Server,
  Cpu,
  HardDrive,
  Zap,
  Sparkles,
  Star,
  Crown,
  Shield,
  Rocket,
  Gift,
  Gem,
  Trophy,
  Diamond,
  Circle
}

export default function Plans() {
  const [coinPlans, setCoinPlans] = useState([])
  const [realPlans, setRealPlans] = useState([])
  const [locations, setLocations] = useState([])
  const [loadingNodes, setLoadingNodes] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [serverName, setServerName] = useState("")
  const [selectedNode, setSelectedNode] = useState(null) // { nodeId, name }
  const [purchasing, setPurchasing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const navigate = useNavigate()
  const { showSuccess, showError } = useAppUI()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }

    const loadPlans = async () => {
      try {
        const token = localStorage.getItem("token")
        const [coin, real] = await Promise.all([api.getCoinPlans(), api.getRealPlans()])
        setCoinPlans(coin || [])
        setRealPlans(real || [])
      } catch (err) {
        showError(err.message || "Failed to load plans")
      } finally {
        setLoading(false)
      }
    }

    loadPlans()
  }, [navigate, showError])

  const handleConfirmPurchase = async () => {
    if (!selectedPlan || !serverName.trim()) return

    setPurchasing(true)
    try {
      const token = localStorage.getItem("token")
      await api.purchaseServer(
        token,
        selectedPlan.type,
        selectedPlan.id,
        serverName,
        selectedNode?.nodeId || undefined,
        selectedNode?.name || ""
      )
      showSuccess("Server purchased successfully! Redirecting…")
      setSelectedPlan(null)
      setServerName("")
      setSelectedNode(null)
      setConfirmOpen(false)
      navigate("/servers")
    } catch (err) {
      showError(err.message || "Purchase failed")
    } finally {
      setPurchasing(false)
    }
  }

  // Fetch live nodes from Pterodactyl when the user opens the purchase form
  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan)
    if (locations.length === 0) {
      setLoadingNodes(true)
      const token = localStorage.getItem("token")
      api
        .getAvailableNodes(token)
        .then((nodes) => {
          setLocations(nodes || [])
          if (nodes && nodes.length > 0) setSelectedNode(nodes[0])
        })
        .catch(() => {})
        .finally(() => setLoadingNodes(false))
    }
  }

  const handleRequestPurchase = (e) => {
    e.preventDefault()
    if (!selectedPlan || !serverName.trim()) {
      showError("Please select a plan and enter a server name")
      return
    }
    setConfirmOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Loading plans...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16">
      <Topbar />

      {/* Coin Plans Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-100 mb-2">Coin plans</h2>
          <p className="text-gray-400">
            Use coins to provision servers with flexible durations.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {coinPlans.map((plan) => {
            const IconComponent = iconMap[plan.icon] || Package
            return (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan({ ...plan, type: "coin" })}
                className={`cursor-pointer rounded-xl border p-6 transition-all ${
                  selectedPlan?.id === plan.id && selectedPlan?.type === "coin"
                    ? "border-primary-500 bg-primary-500/5"
                    : "border-gray-800 bg-dark-800 hover:border-gray-700"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                      <IconComponent size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-100">{plan.name}</h3>
                      <p className="text-xs text-primary-400">Coin plan</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <HardDrive size={16} />
                      <span>{plan.storage} GB storage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cpu size={16} />
                      <span>{plan.cpu} CPU cores</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap size={16} />
                      <span>{plan.ram} GB RAM</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-4">
                    <p className="text-2xl font-bold text-primary-500">{plan.coin_price}</p>
                    <p className="text-sm text-gray-400">coins / {plan.duration_days} days</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Real Money Plans Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-100 mb-2">Real money plans</h2>
          <p className="text-gray-400">
            Balance-powered plans with the same duration flexibility.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {realPlans.map((plan) => {
            const IconComponent = iconMap[plan.icon] || Server
            return (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan({ ...plan, type: "real" })}
                className={`cursor-pointer rounded-xl border p-6 transition-all ${
                  selectedPlan?.id === plan.id && selectedPlan?.type === "real"
                    ? "border-accent-500 bg-accent-500/5"
                    : "border-gray-800 bg-dark-800 hover:border-gray-700"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-500">
                      <IconComponent size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-100">{plan.name}</h3>
                      <p className="text-xs text-accent-400">Real money</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <HardDrive size={16} />
                      <span>{plan.storage} GB storage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cpu size={16} />
                      <span>{plan.cpu} CPU cores</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap size={16} />
                      <span>{plan.ram} GB RAM</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-4">
                    <p className="text-2xl font-bold text-accent-500">₹{plan.price.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">/ {plan.duration_days} days</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Configuration Form */}
      {selectedPlan && (
        <div className="bg-dark-800 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-semibold text-gray-100 mb-6">Configure server</h3>
          <form onSubmit={handleRequestPurchase} className="space-y-6">
            <div>
              <label htmlFor="server-name" className="block text-sm font-medium text-gray-300 mb-2">
                Server name
              </label>
              <input
                id="server-name"
                name="serverName"
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="e.g., Astra SMP"
                className="w-full bg-dark-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Server location
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {loadingNodes && (
                  <p className="text-sm text-gray-400 col-span-full">Loading locations...</p>
                )}
                {!loadingNodes && locations.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-full">
                    No locations available right now.
                  </p>
                )}
                {locations.map((node) => (
                  <button
                    key={node.nodeId}
                    type="button"
                    onClick={() => setSelectedNode(node)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selectedNode?.nodeId === node.nodeId
                        ? "border-primary-500 bg-primary-500/5"
                        : "border-gray-700 bg-dark-900 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-100 truncate">{node.name}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {node.freeAllocCount} slot{node.freeAllocCount !== 1 ? "s" : ""} free
                        </p>
                      </div>
                      {selectedNode?.nodeId === node.nodeId && (
                        <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="flex-1 px-6 py-3 bg-dark-900 hover:bg-gray-800 text-gray-100 rounded-xl font-medium border border-gray-700 transition-colors"
              >
                Cancel
              </button>
              <ButtonSpinner
                type="submit"
                loading={purchasing}
                className="flex-1 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors disabled:bg-gray-700 disabled:text-gray-400"
              >
                Purchase server
              </ButtonSpinner>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Confirm purchase"
        message={`Deploy "${serverName}" using the ${selectedPlan?.name} plan?`}
        detail={
          selectedPlan?.type === "coin"
            ? `This will cost ${selectedPlan?.coin_price} coins for ${selectedPlan?.duration_days} days.`
            : `This will charge ₹${selectedPlan?.price?.toFixed(2)} for ${selectedPlan?.duration_days} days.`
        }
        confirmLabel="Purchase"
        confirmVariant="primary"
        loading={purchasing}
        onConfirm={handleConfirmPurchase}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}
