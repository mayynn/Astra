import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import SectionHeader from "../components/SectionHeader.jsx"
import BannerAd from "../components/BannerAd.jsx"
import NativeAd from "../components/NativeAd.jsx"
import { api } from "../services/api.js"

export default function Coins() {
  const [balance, setBalance] = useState(0)
  const [coinsPerMinute, setCoinsPerMinute] = useState(1)
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [adblockDetected, setAdblockDetected] = useState(false)
  const [lastClaim, setLastClaim] = useState(null)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }

    const loadBalance = async () => {
      try {
        const data = await api.getBalance(token)
        setBalance(data.coins)
        setLastClaim(data.last_claim_time)
        setCoinsPerMinute(1) // This would come from coin_settings in a full impl
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadBalance()

    // Adsterra Anti-Adblock detection — inject their sync script and check load/error
    const script = document.createElement("script")
    script.src = "https://environmenttalentrabble.com/b0/5e/61/b05e6168914992b1afb1a4d24555f90a.js"
    script.async = true
    script.onload = () => setAdblockDetected(false)
    script.onerror = () => setAdblockDetected(true)
    document.head.appendChild(script)

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script)
    }
  }, [navigate])

  useEffect(() => {
    if (!lastClaim) return

    const interval = setInterval(() => {
      const now = new Date()
      const last = new Date(lastClaim)
      const diffSeconds = Math.floor((now.getTime() - last.getTime()) / 1000)
      const remaining = Math.max(0, 60 - diffSeconds)
      setCooldown(remaining)
    }, 100)

    return () => clearInterval(interval)
  }, [lastClaim])

  const handleClaim = async () => {
    if (cooldown > 0) return

    setClaiming(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      const result = await api.claimCoins(token, adblockDetected)
      setBalance(balance + result.earned)
      setLastClaim(new Date().toISOString())
      setCooldown(60)
    } catch (err) {
      setError(err.message)
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Coins"
        subtitle="AFK earning is protected by adblock detection and rate limits."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="glass rounded-2xl border border-slate-700/40 p-6">
          <p className="text-sm text-slate-400">AFK earning</p>
          <p className="mt-3 text-3xl font-semibold text-neon-200">{coinsPerMinute} coin / minute</p>
          {cooldown > 0 ? (
            <p className="mt-3 text-sm text-slate-400">Next claim available in {cooldown}s.</p>
          ) : (
            <p className="mt-3 text-sm text-aurora-300">Ready to claim!</p>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleClaim}
              disabled={claiming || cooldown > 0 || adblockDetected}
              className="button-3d rounded-xl bg-neon-500/20 px-4 py-3 text-sm font-semibold text-neon-200 hover:bg-neon-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {claiming ? "Claiming..." : "Claim now"}
            </button>
            <button className="button-3d rounded-xl border border-slate-700/60 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">
              View history
            </button>
          </div>
        </div>
        {adblockDetected && (
          <div className="rounded-2xl border border-ember-400/40 bg-ember-500/10 p-6 text-sm text-ember-200">
            <p className="text-sm font-semibold">⚠️ AdBlock detected</p>
            <p className="mt-3 text-sm text-ember-100">
              Disable blockers to resume earning. Coins are paused until detection clears.
            </p>
          </div>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Current Balance</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">{balance.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Lifetime Earned</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">{(balance * 1.5).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Next Claim</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">
            {cooldown > 0 ? `${cooldown}s` : "Ready"}
          </p>
        </div>
      </div>
      
      {/* Native Ad Section */}
      <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-4">Sponsored</p>
        <NativeAd />
      </div>

      {/* Banner Ad Section */}
      <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-4">Sponsored</p>
        <BannerAd />
      </div>
    </div>
  )
}
