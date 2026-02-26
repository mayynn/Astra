import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import SectionHeader from "../components/SectionHeader.jsx"
import { SkeletonCard } from "../components/Skeletons.jsx"
import { api } from "../services/api.js"
import { useAppUI } from "../context/AppUIContext.jsx"

export default function CouponRedeem() {
  const [code, setCode] = useState("")
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(false)
  const navigate = useNavigate()
  const { showSuccess, showError } = useAppUI()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }

    const loadRedemptions = async () => {
      try {
        const data = await api.getCouponHistory(token)
        setRedemptions(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadRedemptions()
  }, [navigate])

  const handleRedeem = async (e) => {
    e.preventDefault()

    if (!code.trim()) {
      showError("Please enter a coupon code.")
      return
    }

    setRedeeming(true)

    try {
      const token = localStorage.getItem("token")
      const result = await api.redeemCoupon(token, code)
      showSuccess(`Redeemed! +${result.reward} coins`)

      // Refresh history
      const data = await api.getCouponHistory(token)
      setRedemptions(data || [])

      setCode("")
    } catch (err) {
      showError(err.message || "Failed to redeem coupon.")
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Redeem Coupon" subtitle="One code per IP. Abuse prevention is enforced automatically." />
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Redeem Coupon"
        subtitle="One code per IP. Abuse prevention is enforced automatically."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="glass rounded-2xl border border-slate-700/40 p-6">
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="mt-2 w-full rounded-xl border border-slate-700/60 bg-ink-900/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-aurora-500/50 focus:outline-none"
                placeholder="ASTRA-BOOST"
              />
            </div>
            <button
              type="submit"
              disabled={redeeming}
              className="button-3d w-full rounded-xl bg-aurora-500/20 px-4 py-3 text-sm font-semibold text-aurora-200 hover:bg-aurora-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {redeeming ? "Redeeming..." : "Redeem"}
            </button>
          </form>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
          <p className="text-sm text-slate-400">Anti-abuse checks</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>✓ IP uniqueness enforced</li>
            <li>✓ Max uses and per-user limits</li>
            <li>✓ Auto-flag suspicious accounts</li>
          </ul>
        </div>
      </div>
      {redemptions.length > 0 && (
        <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
          <p className="text-sm text-slate-400">Recent redemptions</p>
          <div className="mt-4 grid gap-3 text-sm">
            {redemptions.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/60 bg-ink-950/60 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-100">{item.code}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(item.redeemed_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-aurora-200">+{item.coin_reward} coins</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
