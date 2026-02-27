import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../services/api.js"
import Logo from "../components/Logo.jsx"
import { Lock, Mail, UserPlus, AlertCircle } from "lucide-react"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const { token, user } = await api.register(email, password)
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))
      navigate("/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-100">
            Create your account
          </h1>
          <p className="text-sm text-slate-400">
            Get started with your free account today.
          </p>
        </div>

        {/* Main Form Container */}
        <div className="rounded-2xl border border-dark-700 bg-dark-900 p-8 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400 mb-1">Error</p>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="register-email" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Mail size={16} /> Email
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 rounded-lg border border-dark-700 bg-dark-800 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Lock size={16} /> Password
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 rounded-lg border border-dark-700 bg-dark-800 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Lock size={16} /> Confirm password
            </label>
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full h-12 rounded-lg border border-dark-700 bg-dark-800 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg bg-primary-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-elegant"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Creating account...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Create account
              </>
            )}
          </button>
        </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link className="text-primary-400 hover:text-primary-300 transition-colors font-medium" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
