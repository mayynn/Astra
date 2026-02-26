import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import SectionHeader from "../components/SectionHeader.jsx"
import BannerAd from "../components/BannerAd.jsx"
import NativeAd from "../components/NativeAd.jsx"
import { api } from "../services/api.js"
import { detectAdBlock } from "../utils/adBlockDetector.js"

// Seconds the user must view ads before a claim token is issued
const AD_VIEW_SECONDS = 5

export default function Coins() {
  const [balance, setBalance]               = useState(0)
  const [coinsPerMinute, setCoinsPerMinute] = useState(1)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [claiming, setClaiming]             = useState(false)
  const [cooldown, setCooldown]             = useState(0)
  // "checking" | "blocked" | "clear"
  const [adblockStatus, setAdblockStatus]   = useState("checking")
  const [adViewCountdown, setAdViewCountdown] = useState(0)
  const [earnToken, setEarnToken]           = useState(null)
  const [fetchingToken, setFetchingToken]   = useState(false)
  const [justEarned, setJustEarned]         = useState(0)
  const [error, setError]                   = useState("")
  const [rechecking, setRechecking]         = useState(false)
  const navigate = useNavigate()

  // ── 1. Load balance + run adblock detection on mount ──────────────────────
  useEffect(() => {
    const jwt = localStorage.getItem("token")
    if (!jwt) { navigate("/login"); return }

    api.getBalance(jwt)
      .then(data => {
        setBalance(data.coins ?? 0)
        setCoinsPerMinute(1)
        if (data.last_claim_time) {
          const elapsed = Math.floor((Date.now() - new Date(data.last_claim_time).getTime()) / 1000)
          setCooldown(Math.max(0, 60 - elapsed))
        }
      })
      .catch(console.error)
      .finally(() => setBalanceLoading(false))

    detectAdBlock().then(blocked => {
      setAdblockStatus(blocked ? "blocked" : "clear")
      if (!blocked) setAdViewCountdown(AD_VIEW_SECONDS)
    })

    // Re-check every 15 seconds — catches users who enable adblock mid-session
    const recheck = setInterval(() => {
      detectAdBlock().then(blocked => {
        setAdblockStatus(blocked ? "blocked" : "clear")
        if (!blocked) setAdViewCountdown(prev => prev > 0 ? prev : 0)
      })
    }, 15_000)

    return () => clearInterval(recheck)
  }, [navigate])

  // ── Revoke earn token immediately when adblock becomes active ─────────────
  useEffect(() => {
    if (adblockStatus === "blocked") setEarnToken(null)
  }, [adblockStatus])

  // ── 2. Master tick every second ───────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setCooldown(prev     => Math.max(0, prev - 1))
      setAdViewCountdown(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  // ── 3. Fetch earn session token at START of ad-view countdown ─────────────
  // Token is fetched when countdown begins (adViewCountdown === AD_VIEW_SECONDS).
  // By the time the countdown reaches 0 and Claim is enabled, the token has
  // already been issued and is ready. This prevents the "token not yet valid" race.
  useEffect(() => {
    if (adblockStatus !== "clear") return
    // Trigger at countdown start (= AD_VIEW_SECONDS) OR when countdown already
    // at 0 and no token (fallback for page-fresh cases where cooldown=0 at mount)
    if (adViewCountdown !== AD_VIEW_SECONDS && adViewCountdown !== 0) return
    if (cooldown > 0)              return // don't fetch during active cooldown
    if (earnToken)                 return // already have a valid token
    if (fetchingToken)             return

    const jwt = localStorage.getItem("token")
    if (!jwt) return

    setFetchingToken(true)
    api.getEarnSession(jwt)
      .then(data => setEarnToken(data.earnToken))
      .catch(err  => setError(err.message || "Failed to prepare earn session"))
      .finally(() => setFetchingToken(false))
  }, [adblockStatus, adViewCountdown, cooldown, earnToken, fetchingToken])

  // ── 4. When cooldown ends, restart the ad-view cycle ─────────────────────
  useEffect(() => {
    if (cooldown === 0 && adblockStatus === "clear" && !earnToken && !fetchingToken && adViewCountdown === 0) {
      setAdViewCountdown(AD_VIEW_SECONDS)
    }
  }, [cooldown]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 5. Auto-clear success badge after 2s ─────────────────────────────────
  useEffect(() => {
    if (justEarned > 0) {
      const t = setTimeout(() => setJustEarned(0), 2000)
      return () => clearTimeout(t)
    }
  }, [justEarned])

  // ── Claim handler ─────────────────────────────────────────────────────────
  const handleClaim = async () => {
    if (claiming || cooldown > 0 || adblockStatus !== "clear") return
    if (!earnToken) {
      setError("Ads are still loading — please wait a moment.")
      return
    }

    setClaiming(true)
    setError("")
    const jwt = localStorage.getItem("token")

    try {
      const result = await api.claimCoins(jwt, earnToken)
      setBalance(prev => prev + result.earned)
      setJustEarned(result.earned)
      // Reload the page so fresh ads are served
      setTimeout(() => window.location.reload(), 800)
      return
    } catch (err) {
      const wait = err.waitSeconds ?? (err.message?.includes("Too many") ? 70 : 0)
      if (wait > 0) {
        setCooldown(wait)
        setEarnToken(null)
        setError("")
      } else {
        setError(err.message || "Claim failed. Please try again.")
        // Token expired/invalid — reset cycle
        setEarnToken(null)
        setAdViewCountdown(AD_VIEW_SECONDS)
      }
    } finally {
      setClaiming(false)
    }
  }

  // ── Computed UI state ─────────────────────────────────────────────────────
  const canClaim = !claiming && cooldown === 0 && adblockStatus === "clear" && !!earnToken && !fetchingToken

  const buttonLabel = () => {
    if (claiming)                  return "Claiming..."
    if (adblockStatus === "checking") return "Checking ads..."
    if (adblockStatus === "blocked")  return "AdBlock active"
    if (cooldown > 0)              return `Cooldown: ${cooldown}s`
    if (adViewCountdown > 0)       return `Viewing ads: ${adViewCountdown}s`
    if (fetchingToken)             return "Preparing..."
    if (!earnToken)                return "Loading..."
    return "Claim now"
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (balanceLoading) {
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
        subtitle="View ads to earn coins every 60 seconds. AdBlock must be disabled."
      />

      {/* ── Main claim card ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="glass rounded-2xl border border-slate-700/40 p-6 space-y-4">
          <div>
            <p className="text-sm text-slate-400">AFK earning rate</p>
            <p className="mt-1 text-3xl font-semibold text-neon-200">{coinsPerMinute} coin / min</p>
          </div>

          {/* Status message */}
          <div className="rounded-xl bg-ink-900/60 border border-slate-800/60 px-4 py-3 text-sm min-h-[44px] flex items-center">
            {adblockStatus === "checking" && (
              <p className="text-slate-400 animate-pulse">Checking for AdBlock…</p>
            )}
            {adblockStatus === "blocked" && (
              <p className="text-ember-300 font-medium">⚠ AdBlock detected — disable it to earn coins</p>
            )}
            {adblockStatus === "clear" && cooldown > 0 && (
              <p className="text-slate-300">Next claim in <span className="font-semibold text-aurora-200">{cooldown}s</span></p>
            )}
            {adblockStatus === "clear" && cooldown === 0 && adViewCountdown > 0 && (
              <p className="text-slate-300">Viewing ads… <span className="font-semibold text-neon-300">{adViewCountdown}s</span></p>
            )}
            {adblockStatus === "clear" && cooldown === 0 && adViewCountdown === 0 && fetchingToken && (
              <p className="text-slate-400 animate-pulse">Preparing session…</p>
            )}
            {adblockStatus === "clear" && cooldown === 0 && adViewCountdown === 0 && !fetchingToken && earnToken && (
              <p className="text-aurora-300 font-medium">✓ Ready to claim!</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleClaim}
              disabled={!canClaim}
              className="button-3d rounded-xl bg-neon-500/20 px-6 py-3 text-sm font-semibold text-neon-200 hover:bg-neon-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {buttonLabel()}
            </button>

            {justEarned > 0 && (
              <span className="animate-bounce inline-flex items-center rounded-full bg-aurora-500/20 px-3 py-1 text-sm font-bold text-aurora-200">
                +{justEarned} ₳
              </span>
            )}
          </div>
        </div>

        {/* Adblock warning */}
        {adblockStatus === "blocked" && (
          <div className="rounded-2xl border border-ember-400/40 bg-ember-500/10 p-6 space-y-3">
            <p className="font-semibold text-ember-200">⚠ Please disable AdBlock</p>
            <p className="text-sm text-ember-100 leading-relaxed">
              Ads fund this platform. Disable your blocker on this page and
              refresh to start earning coins.
            </p>
            <p className="text-xs text-ember-300/70">
              Detection uses three independent methods. Use the button below
              after disabling your blocker — no page refresh needed.
            </p>
            <button
              onClick={() => {
                setRechecking(true)
                detectAdBlock().then(blocked => {
                  setAdblockStatus(blocked ? "blocked" : "clear")
                  if (!blocked) {
                    setAdViewCountdown(AD_VIEW_SECONDS)
                    setEarnToken(null)
                  }
                }).finally(() => setRechecking(false))
              }}
              disabled={rechecking}
              className="mt-1 rounded-lg bg-ember-500/20 border border-ember-400/30 px-4 py-2 text-sm font-semibold text-ember-200 hover:bg-ember-500/30 disabled:opacity-50 transition-all"
            >
              {rechecking ? "Checking…" : "I've disabled AdBlock — re-check"}
            </button>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Balance</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">{balance.toLocaleString()} ₳</p>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Earn Rate</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">{coinsPerMinute} / min</p>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Next Claim</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">
            {cooldown > 0 ? `${cooldown}s` : adViewCountdown > 0 ? `${adViewCountdown}s` : "Ready"}
          </p>
        </div>
      </div>

      {/* ── Ad slots — only rendered when adblock is not active ── */}
      {adblockStatus !== "blocked" && (
        <>
          <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-4">Sponsored</p>
            <NativeAd />
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-4">Sponsored</p>
            <BannerAd />
          </div>
        </>
      )}
    </div>
  )
}
