import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, X } from "lucide-react"
import Logo from "./Logo.jsx"

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/locations", label: "Locations" },
  { to: "/about", label: "About" },
  { to: "/status", label: "Status" },
  { to: "/knowledgebase", label: "Docs" },
  { to: "/contact", label: "Contact" },
]

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isLoggedIn = Boolean(localStorage.getItem("token"))
  const { pathname } = useLocation()

  return (
    <header className="mb-12">
      {/* Desktop / tablet row */}
      <div className="flex items-center justify-between gap-4">
        <Logo size="lg" />

        {/* Center nav — hidden on small screens */}
        <nav className="hidden md:flex items-center gap-1 text-sm text-slate-400">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                pathname === to
                  ? "text-slate-100 bg-slate-800/60"
                  : "hover:text-slate-200 hover:bg-slate-800/30"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side auth buttons */}
        <div className="hidden md:flex items-center gap-3 text-sm">
          {isLoggedIn ? (
            <Link
              to="/dashboard"
              className="button-3d rounded-xl bg-neon-500/20 px-4 py-2 font-semibold text-neon-200 hover:bg-neon-500/30 transition-colors"
            >
              My Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5">
                Login
              </Link>
              <Link
                to="/register"
                className="button-3d rounded-xl bg-neon-500/20 px-4 py-2 font-semibold text-neon-200 hover:bg-neon-500/30 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Hamburger — visible on mobile only */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden mt-3 rounded-2xl border border-slate-700/40 bg-ink-900/95 backdrop-blur p-4 shadow-xl">
          <nav className="flex flex-col gap-1 mb-4">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm transition-colors ${
                  pathname === to
                    ? "bg-slate-800/80 text-slate-100 font-medium"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-800/60 pt-4 flex flex-col gap-2">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="button-3d rounded-xl bg-neon-500/20 px-4 py-2.5 text-center text-sm font-semibold text-neon-200"
              >
                My Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-slate-700/40 px-4 py-2.5 text-center text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800/40 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="button-3d rounded-xl bg-neon-500/20 px-4 py-2.5 text-center text-sm font-semibold text-neon-200"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
