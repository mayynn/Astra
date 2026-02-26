import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../services/api.js"

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
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Create Access</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-100">Register</h2>
        <p className="mt-2 text-sm text-slate-400">Provision a secure AstraNodes profile.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-700/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="register-email" className="text-xs uppercase tracking-[0.3em] text-slate-500">Email</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-ink-900/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-neon-500/50 focus:outline-none focus:ring-1 focus:ring-neon-500/20"
            placeholder="you@astranodes.gg"
          />
        </div>
        <div>
          <label htmlFor="register-password" className="text-xs uppercase tracking-[0.3em] text-slate-500">Password</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-ink-900/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-neon-500/50 focus:outline-none focus:ring-1 focus:ring-neon-500/20"
            placeholder="Create a secure password"
          />
        </div>
        <div>
          <label htmlFor="register-confirm-password" className="text-xs uppercase tracking-[0.3em] text-slate-500">Confirm</label>
          <input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-ink-900/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-neon-500/50 focus:outline-none focus:ring-1 focus:ring-neon-500/20"
            placeholder="Repeat password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="button-3d w-full rounded-xl bg-neon-500/20 px-4 py-3 text-sm font-semibold text-neon-200 hover:bg-neon-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="text-sm text-slate-400">
        Already onboard?{" "}
        <Link className="text-neon-300 hover:text-neon-200" to="/login">
          Sign in
        </Link>
      </p>
    </div>
  )
}
