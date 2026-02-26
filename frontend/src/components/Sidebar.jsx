import { NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, Package, Coins, Ticket, CreditCard, Server, Shield, LogOut, LifeBuoy, Layout, Star, Settings, SlidersHorizontal, Zap, MapPin, Users, BookOpen, Activity } from "lucide-react"
import Logo from "./Logo.jsx"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/plans", label: "Plans", icon: Package },
  { to: "/coins", label: "Coins", icon: Coins },
  { to: "/coupons", label: "Redeem", icon: Ticket },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/servers", label: "My Servers", icon: Server },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: Settings }
]

export default function Sidebar() {
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const isAdmin = user.role === "admin"
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/login")
  }

  return (
    <aside className="hidden w-72 flex-col gap-8 border-r border-slate-800/60 bg-ink-950/80 px-6 py-8 lg:flex">
      <Logo size="lg" />
      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-neon-500/15 text-neon-200"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="space-y-3">
        {isAdmin && (
          <div className="rounded-2xl border border-neon-500/30 bg-neon-500/10 p-4 text-sm text-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-neon-300" />
              <span className="font-semibold">Admin Panel</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Secure tooling for plans, coupons, and server actions.
            </p>
            <NavLink
              to="/admin"
              className="button-3d mt-3 inline-flex rounded-lg border border-neon-400/40 px-3 py-2 text-xs font-semibold text-neon-200"
            >
              Open Admin
            </NavLink>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <NavLink
                to="/admin/frontpage"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/40 px-2 py-1.5 text-xs text-slate-400 hover:border-neon-500/30 hover:text-neon-300"
              >
                <Layout className="h-3 w-3" /> Front Page
              </NavLink>
              <NavLink
                to="/admin/landing-plans"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/40 px-2 py-1.5 text-xs text-slate-400 hover:border-neon-500/30 hover:text-neon-300"
              >
                <Star className="h-3 w-3" /> Land. Plans
              </NavLink>
              <NavLink
                to="/admin/plans"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/40 px-2 py-1.5 text-xs text-slate-400 hover:border-neon-500/30 hover:text-neon-300"
              >
                <Package className="h-3 w-3" /> Plans
              </NavLink>
              <NavLink
                to="/admin/features"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/40 px-2 py-1.5 text-xs text-slate-400 hover:border-neon-500/30 hover:text-neon-300"
              >
                <Zap className="h-3 w-3" /> Features
              </NavLink>
              <NavLink
                to="/admin/locations"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/40 px-2 py-1.5 text-xs text-slate-400 hover:border-neon-500/30 hover:text-neon-300"
              >
                <MapPin className="h-3 w-3" /> Locations
              </NavLink>
              <NavLink
                to="/admin/about"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/40 px-2 py-1.5 text-xs text-slate-400 hover:border-neon-500/30 hover:text-neon-300"
              >
                <Users className="h-3 w-3" /> About
              </NavLink>
              <NavLink
                to="/admin/knowledgebase"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/40 px-2 py-1.5 text-xs text-slate-400 hover:border-neon-500/30 hover:text-neon-300"
              >
                <BookOpen className="h-3 w-3" /> Knowledgebase
              </NavLink>
              <NavLink
                to="/admin/status"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/40 px-2 py-1.5 text-xs text-slate-400 hover:border-neon-500/30 hover:text-neon-300"
              >
                <Activity className="h-3 w-3" /> Status
              </NavLink>
              <NavLink
                to="/admin/site-settings"
                className="col-span-2 flex items-center gap-1.5 rounded-lg border border-slate-700/40 px-2 py-1.5 text-xs text-slate-400 hover:border-neon-500/30 hover:text-neon-300"
              >
                <SlidersHorizontal className="h-3 w-3" /> Site Settings
              </NavLink>
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-4">
          <div className="mb-3 text-xs text-slate-400">
            <p className="font-semibold text-slate-300">{user.email}</p>
            <p className="mt-1">{isAdmin ? "Administrator" : "User"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="button-3d flex w-full items-center justify-center gap-2 rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-900/30"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}
