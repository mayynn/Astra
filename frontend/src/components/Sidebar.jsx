import { NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, Package, Coins, Ticket, CreditCard, Server, Shield, LogOut, LifeBuoy, Layout, Star, Settings, SlidersHorizontal, Zap, MapPin, Users, BookOpen, Activity } from "lucide-react"
import Logo from "./Logo.jsx"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/plans", label: "Plans", icon: Package },
  { to: "/servers", label: "Servers", icon: Server },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/coins", label: "Coins", icon: Coins },
  { to: "/support", label: "Support", icon: LifeBuoy }
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
    <aside className="hidden w-64 flex-col gap-6 border-r border-white/10 bg-dark-800 px-5 py-6 lg:flex">
      <Logo size="lg" />
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-500/10 text-primary-400 border border-primary-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="space-y-3">
        {isAdmin && (
          <div className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-4">
            <NavLink
              to="/admin"
              className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary-300 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Admin panel
            </NavLink>
          </div>
        )}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 text-sm">
            <p className="font-medium text-white truncate">{user.email}</p>
            <p className="mt-1 text-xs text-slate-400">{isAdmin ? "Administrator" : "User"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
