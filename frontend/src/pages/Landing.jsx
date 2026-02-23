import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { io } from "socket.io-client"
import {
  Zap, ShieldCheck, Coins, Server, ArrowRight, Package, Sparkles,
  Star, Crown, Shield, Rocket, Gift, Gem, Trophy, Clock,
  Globe, Lock, Cpu, HardDrive, Wifi, LifeBuoy, Circle, Check
} from "lucide-react"
import Logo from "../components/Logo.jsx"
import { api } from "../services/api.js"

// ─── Icon map used for features ──────────────────────────────────────────────
const ICON_MAP = {
  Zap, ShieldCheck, Coins, Server, Package, Sparkles, Star, Crown,
  Shield, Rocket, Gift, Gem, Trophy, Clock, Globe, Lock, Cpu,
  HardDrive, Wifi, LifeBuoy, Circle, Check
}

function DynamicIcon({ name, className }) {
  const Icon = ICON_MAP[name] || Zap
  return <Icon className={className} />
}

// ─── Default fallback content (shown while loading) ─────────────────────────
const DEFAULTS = {
  hero: {
    title: "Hosting crafted for Minecraft empires.",
    subtitle: "Launch servers in seconds, keep renewals automatic, and protect revenue with enterprise-grade abuse prevention.",
    primaryButtonText: "Launch Dashboard",
    primaryButtonLink: "/register",
    secondaryButtonText: "View Plans",
    secondaryButtonLink: "/plans",
    backgroundImage: ""
  },
  features: [
    { title: "Automated Renewal", description: "Coins or balance renewals execute automatically with 12h grace protection.", icon: "Zap" },
    { title: "Anti-Abuse Core", description: "IP-based coupon protection, flagging, and rate-limited endpoints.", icon: "ShieldCheck" },
    { title: "Coin Economy", description: "AFK earning, coin plans, and live usage insights in one dashboard.", icon: "Coins" },
    { title: "Pterodactyl Ready", description: "Server lifecycle actions handled securely via Admin API.", icon: "Server" }
  ],
  about: {
    heading: "Ready for production-grade hosting?",
    description: "Spin up a secure dashboard and keep every server in compliance."
  },
  stats: { activeServers: "500+", totalUsers: "1,200+", uptime: "99.9%" },
  footer: { text: "© 2026 AstraNodes. All rights reserved.", links: ["Privacy", "Terms", "Status"] }
}

// ─── Socket URL detection ────────────────────────────────────────────────────
function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL
  if (window.location.hostname.includes("app.github.dev")) {
    return window.location.origin.replace("-5173.", "-4000.").replace(/\/api$/, "")
  }
  return "http://localhost:4000"
}

export default function Landing() {
  const [content, setContent] = useState(null)
  const [plans, setPlans] = useState([])
  const [loadingContent, setLoadingContent] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [liveStats, setLiveStats] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    // Load initial data in parallel
    api.getFrontpage()
      .then(setContent)
      .catch(() => {})
      .finally(() => setLoadingContent(false))

    api.getLandingPlans()
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoadingPlans(false))

    api.getStats()
      .then(setLiveStats)
      .catch(() => {})

    // Real-time socket updates
    const socket = io(getSocketUrl(), { transports: ["websocket", "polling"] })
    socketRef.current = socket

    socket.on("frontpage:update", ({ section, data }) => {
      setContent((prev) => ({
        ...(prev || {}),
        [section]: { data }
      }))
    })

    socket.on("plans:update", (updatedPlans) => {
      setPlans(updatedPlans)
    })

    return () => socket.disconnect()
  }, [])

  // Resolve a section: use API content if available, else fallback defaults
  const resolve = (section) => {
    if (!content) return DEFAULTS[section]
    const s = content[section]
    return s?.data ?? s ?? DEFAULTS[section]
  }

  const hero = resolve("hero")
  const features = resolve("features")
  const about = resolve("about")
  const stats = resolve("stats")
  const footer = resolve("footer")

  return (
    <div className="min-h-screen bg-ink-950 text-slate-100">
      <div className="relative overflow-hidden">
        {hero.backgroundImage && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{ backgroundImage: `url(${hero.backgroundImage})` }}
          />
        )}
        <div className="absolute inset-0 grid-noise opacity-30" />

        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-6 py-10">

          {/* ── Header ── */}
          <header className="flex flex-wrap items-center justify-between gap-4">
            <Logo size="lg" />
            <div className="flex items-center gap-4 text-sm">
              <Link to="/login" className="text-slate-300 hover:text-slate-100">Login</Link>
              <Link
                to={hero.primaryButtonLink || "/register"}
                className="button-3d rounded-xl bg-neon-500/20 px-4 py-2 font-semibold text-neon-200"
              >
                Get Started
              </Link>
            </div>
          </header>

          {/* ── Hero ── */}
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.5em] text-slate-500">AstraNodes</p>

              {loadingContent ? (
                <div className="space-y-3">
                  <div className="h-10 w-3/4 animate-pulse rounded-xl bg-slate-800/60" />
                  <div className="h-6 w-full animate-pulse rounded-xl bg-slate-800/40" />
                  <div className="h-6 w-5/6 animate-pulse rounded-xl bg-slate-800/40" />
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-semibold leading-tight text-slate-100 sm:text-5xl">
                    {hero.title}
                  </h1>
                  <p className="max-w-xl text-lg text-slate-400">{hero.subtitle}</p>
                </>
              )}

              <div className="flex flex-wrap gap-4">
                <Link
                  to={hero.primaryButtonLink || "/register"}
                  className="button-3d inline-flex items-center gap-2 rounded-xl bg-neon-500/20 px-5 py-3 text-sm font-semibold text-neon-200"
                >
                  {hero.primaryButtonText || "Launch Dashboard"} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to={hero.secondaryButtonLink || "/plans"}
                  className="button-3d inline-flex items-center gap-2 rounded-xl border border-slate-700/60 px-5 py-3 text-sm font-semibold text-slate-200"
                >
                  {hero.secondaryButtonText || "View Plans"}
                </Link>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-4 text-sm sm:flex sm:gap-6">
                <div>
                  <p className="text-3xl font-semibold text-slate-100">{liveStats?.activeServers ?? stats.activeServers ?? "500+"}</p>
                  <p className="text-slate-400">Active Servers</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-slate-100">{liveStats?.totalUsers ?? stats.totalUsers ?? "1,200+"}</p>
                  <p className="text-slate-400">Total Users</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-slate-100">{stats.uptime || "99.9%"}</p>
                  <p className="text-slate-400">Uptime</p>
                </div>
              </div>
            </div>

            {/* Preview card */}
            <div className="glass relative rounded-3xl border border-slate-700/40 p-8 shadow-soft">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-neon-500/20 blur-3xl" />
              <div className="space-y-5">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Live Snapshot</p>
                <div className="space-y-4 rounded-2xl border border-slate-800/60 bg-ink-900/80 p-6">
                  <p className="text-sm text-slate-400">Coins balance</p>
                  <p className="text-4xl font-semibold text-neon-200">12,480</p>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>AFK rate</span>
                    <span className="text-slate-200">1 coin / min</span>
                  </div>
                </div>
                <div className="grid gap-3 text-sm text-slate-300">
                  {[
                    ["Active servers", liveStats?.activeServers ?? stats.activeServers ?? "—"],
                    ["Total users", liveStats?.totalUsers ?? stats.totalUsers ?? "—"],
                    ["Uptime", stats.uptime || "99.9%"]
                  ].map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-ink-900/70 px-4 py-3">
                      <span>{label}</span>
                      <span className="font-semibold">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Features ── */}
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {loadingContent
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-800/40" />
                ))
              : (Array.isArray(features) ? features : []).map((feature, i) => (
                  <div key={i} className="glass rounded-2xl border border-slate-700/40 p-6 shadow-soft">
                    <DynamicIcon name={feature.icon} className="h-6 w-6 text-neon-300" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-100">{feature.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
                  </div>
                ))}
          </section>

          {/* ── Landing Plans ── */}
          {(loadingPlans || plans.length > 0) && (
            <section className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-semibold text-slate-100">Choose Your Plan</h2>
                <p className="mt-2 text-slate-400">Simple pricing. No hidden fees.</p>
              </div>

              {loadingPlans ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-800/40" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`glass relative rounded-2xl border p-6 shadow-soft transition hover:-translate-y-0.5 ${
                        plan.popular
                          ? "border-neon-500/50 ring-1 ring-neon-500/20"
                          : "border-slate-700/40"
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                          <span className="flex items-center gap-1 rounded-full border border-neon-500/50 bg-neon-900/90 px-3 py-0.5 text-xs font-semibold text-neon-200">
                            <Star className="h-3 w-3" /> Most Popular
                          </span>
                        </div>
                      )}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-100">{plan.name}</h3>
                          <p className="mt-1">
                            <span className="text-3xl font-bold text-neon-200">₹{plan.price}</span>
                            <span className="text-sm text-slate-400">/month</span>
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {[["RAM", `${plan.ram} GB`], ["CPU", `${plan.cpu}`], ["Storage", `${plan.storage} GB`]].map(([k, v]) => (
                            <div key={k} className="rounded-lg bg-ink-900/60 px-2 py-2 text-center">
                              <p className="font-semibold text-slate-100">{v}</p>
                              <p className="text-slate-500">{k}</p>
                            </div>
                          ))}
                        </div>
                        {Array.isArray(plan.features) && plan.features.length > 0 && (
                          <ul className="space-y-1.5">
                            {plan.features.map((f, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                <Check className="h-3.5 w-3.5 flex-shrink-0 text-neon-400" />{f}
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link
                          to="/register"
                          className={`button-3d mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                            plan.popular
                              ? "bg-neon-500/25 border border-neon-500/30 text-neon-200"
                              : "border border-slate-700/60 text-slate-200 hover:border-slate-600"
                          }`}
                        >
                          Get Started <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── About / CTA ── */}
          <section className="glass rounded-3xl border border-slate-700/40 p-10 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-semibold text-slate-100">{about.heading}</h2>
                <p className="mt-2 text-slate-400">{about.description}</p>
              </div>
              <Link
                to="/register"
                className="button-3d inline-flex items-center gap-2 rounded-xl bg-neon-500/20 px-6 py-3 text-sm font-semibold text-neon-200"
              >
                Build my stack <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          {/* ── Footer ── */}
          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/60 py-6 text-xs text-slate-500">
            <p>{footer.text}</p>
            <div className="flex items-center gap-4">
              {(Array.isArray(footer.links) ? footer.links : ["Privacy", "Terms", "Status"]).map((link) => (
                <span key={link}>{link}</span>
              ))}
            </div>
          </footer>

        </div>
      </div>
    </div>
  )
}

