import { useState } from "react"
import { ChevronDown, User, Settings, LogOut, Coins } from "lucide-react"

export default function Topbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const balance = user.coins || 0

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    window.location.href = "/login"
  }

  return (
    <header className="flex items-center justify-between gap-4 pb-6 border-b border-white/10">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Welcome back
        </h1>
        <p className="text-sm text-slate-400 mt-1">{user.email}</p>
      </div>
      <div className="flex items-center gap-4">
        {/* Balance Display */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 border border-white/10">
          <Coins className="h-4 w-4 text-primary-400" />
          <span className="text-sm font-medium text-white">{balance} Coins</span>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 border border-white/10 hover:bg-white/5 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary-400" />
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-dark-800 border border-white/10 shadow-xl overflow-hidden z-50">
              <a
                href="/settings"
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Account settings
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
