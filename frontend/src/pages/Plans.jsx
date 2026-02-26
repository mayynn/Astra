import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import SectionHeader from "../components/SectionHeader.jsx"
import PlanCard from "../components/PlanCard.jsx"
import ConfirmModal from "../components/ConfirmModal.jsx"
import ButtonSpinner from "../components/ButtonSpinner.jsx"
import { SkeletonCard } from "../components/Skeletons.jsx"
import { useAppUI } from "../context/AppUIContext.jsx"
import { api } from "../services/api.js"
import { MapPin,
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
  const [selectedNode, setSelectedNode] = useState(null)  // { nodeId, name }
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
        const [coin, real] = await Promise.all([
          api.getCoinPlans(),
          api.getRealPlans()
        ])
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
      api.getAvailableNodes(token)
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
      <div className="space-y-10">
        <SectionHeader title="Coin Plans" subtitle="Loading plans…" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} className="h-56" />)}
        </div>
        <SectionHeader title="Real Money Plans" subtitle="Loading plans…" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} className="h-56" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <SectionHeader
        title="Coin Plans"
        subtitle="Use coins to provision weekly, monthly, or custom duration servers."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {coinPlans.map((plan) => {
          const IconComponent = iconMap[plan.icon] || Package
          return (
            <div
              key={plan.id}
              onClick={() => handleSelectPlan({ ...plan, type: "coin" })}
              className={`button-3d cursor-pointer rounded-xl border p-6 transition-all ${
                selectedPlan?.id === plan.id && selectedPlan?.type === "coin"
                  ? "border-aurora-400 bg-aurora-500/10"
                  : "border-slate-700/30 bg-slate-900/20 hover:border-aurora-400/50"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-aurora-900/20 flex items-center justify-center text-aurora-300">
                    <IconComponent size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">{plan.name}</h3>
                    <p className="text-xs text-aurora-300 uppercase tracking-widest">Coin Plan</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-400">
                  <p className="flex items-center gap-2"><HardDrive size={16} /> {plan.storage} GB Storage</p>
                  <p className="flex items-center gap-2"><Cpu size={16} /> {plan.cpu} CPU Cores</p>
                  <p className="flex items-center gap-2"><Zap size={16} /> {plan.ram} GB RAM</p>
                </div>
                <div className="border-t border-slate-700/30 pt-4">
                  <p className="text-2xl font-bold text-aurora-300">{plan.coin_price}</p>
                  <p className="text-xs text-slate-500">coins / {plan.duration_days} days</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <SectionHeader
        title="Real Money Plans"
        subtitle="Balance-powered plans with the same duration flexibility."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {realPlans.map((plan) => {
          const IconComponent = iconMap[plan.icon] || Server
          return (
            <div
              key={plan.id}
              onClick={() => handleSelectPlan({ ...plan, type: "real" })}
              className={`button-3d cursor-pointer rounded-xl border p-6 transition-all ${
                selectedPlan?.id === plan.id && selectedPlan?.type === "real"
                  ? "border-ember-400 bg-ember-500/10"
                  : "border-slate-700/30 bg-slate-900/20 hover:border-ember-400/50"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-ember-900/20 flex items-center justify-center text-ember-300">
                    <IconComponent size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">{plan.name}</h3>
                    <p className="text-xs text-ember-300 uppercase tracking-widest">Real Money</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-400">
                  <p className="flex items-center gap-2"><HardDrive size={16} /> {plan.storage} GB Storage</p>
                  <p className="flex items-center gap-2"><Cpu size={16} /> {plan.cpu} CPU Cores</p>
                  <p className="flex items-center gap-2"><Zap size={16} /> {plan.ram} GB RAM</p>
                </div>
                <div className="border-t border-slate-700/30 pt-4">
                  <p className="text-2xl font-bold text-ember-300">₹{plan.price.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">/ {plan.duration_days} days</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedPlan && (
        <div className="mt-10 rounded-xl border border-neon-500/30 bg-neon-900/20 p-6">
          <h3 className="text-lg font-semibold text-neon-200 mb-4">Configure Server</h3>
          <form onSubmit={handleRequestPurchase} className="space-y-4">
            <div>
              <label htmlFor="server-name" className="text-sm text-slate-400">Server Name</label>
              <input
                id="server-name"
                name="serverName"
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="e.g., Astra SMP"
                className="input mt-2 w-full"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5" /> Server Location
              </label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {loadingNodes && (
                  <p className="text-xs text-slate-400 animate-pulse col-span-full">Fetching available locations…</p>
                )}
                {!loadingNodes && locations.length === 0 && (
                  <p className="text-xs text-slate-500 col-span-full">No locations available right now.</p>
                )}
                {locations.map((node) => (
                  <button
                    key={node.nodeId}
                    type="button"
                    onClick={() => setSelectedNode(node)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm text-left transition-all ${
                      selectedNode?.nodeId === node.nodeId
                        ? "border-neon-500/50 bg-neon-900/30 text-neon-200"
                        : "border-slate-700/40 bg-ink-950/40 text-slate-300 hover:border-neon-500/30 hover:bg-neon-900/10"
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{node.name}</span>
                      <span className="block text-xs text-slate-500">{node.freeAllocCount} slot{node.freeAllocCount !== 1 ? "s" : ""} free</span>
                    </span>
                    {selectedNode?.nodeId === node.nodeId && (
                      <span className="h-2 w-2 rounded-full bg-neon-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="button-3d flex-1 rounded-lg border border-slate-700/30 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800/30"
              >
                Cancel
              </button>
              <ButtonSpinner
                type="submit"
                loading={purchasing}
                className="button-3d flex-1 rounded-lg bg-neon-500/20 px-4 py-2 text-sm font-semibold text-neon-200 hover:bg-neon-500/30"
              >
                Purchase Server
              </ButtonSpinner>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Confirm Purchase"
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
