import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import SectionHeader from "../components/SectionHeader.jsx"
import ButtonSpinner from "../components/ButtonSpinner.jsx"
import { useAppUI } from "../context/AppUIContext.jsx"
import { api } from "../services/api.js"
import { User, Lock, X } from "lucide-react"

function ResetPasswordModal({ open, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { showSuccess, showError } = useAppUI()

  useEffect(() => {
    if (!open) {
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showError("New password and confirmation do not match")
      return
    }
    if (newPassword.length < 8) {
      showError("New password must be at least 8 characters")
      return
    }
    setLoading(true)
    try {
      await api.resetPassword(currentPassword, newPassword)
      showSuccess("Password changed successfully")
      onClose()
    } catch (err) {
      showError(err.message || "Password reset failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" />
      <div className="relative glass w-full max-w-md rounded-3xl border border-slate-700/50 p-8 shadow-soft animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neon-500/30 bg-neon-900/30">
            <Lock className="h-5 w-5 text-neon-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-100">Reset Password</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="input mt-2 w-full"
              placeholder="Your current password"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="input mt-2 w-full"
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="input mt-2 w-full"
              placeholder="Repeat new password"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="button-3d flex-1 rounded-xl border border-slate-700/60 py-2.5 text-sm font-semibold text-slate-300"
            >
              Cancel
            </button>
            <ButtonSpinner
              type="submit"
              loading={loading}
              className="button-3d flex-1 rounded-xl bg-neon-500/20 border border-neon-500/30 py-2.5 text-sm font-semibold text-neon-200 hover:bg-neon-500/30"
            >
              Change Password
            </ButtonSpinner>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AccountSettings() {
  const [user, setUser] = useState(null)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }
    const stored = localStorage.getItem("user")
    if (stored) setUser(JSON.parse(stored))
  }, [navigate])

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Account Settings"
        subtitle="Manage your profile and security settings."
      />

      <div className="glass rounded-2xl border border-slate-700/40 p-6 space-y-4 max-w-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/50">
            <User className="h-5 w-5 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-100">Profile</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Email</p>
            <p className="mt-1 font-medium text-slate-200">{user?.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Role</p>
            <p className="mt-1 font-medium text-slate-200 capitalize">{user?.role || "user"}</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl border border-slate-700/40 p-6 space-y-4 max-w-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neon-500/30 bg-neon-900/30">
            <Lock className="h-5 w-5 text-neon-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-100">Security</h3>
        </div>
        <p className="text-sm text-slate-400">
          Change your account password. You'll need to enter your current password to confirm.
        </p>
        <button
          onClick={() => setPasswordModalOpen(true)}
          className="button-3d rounded-xl bg-neon-500/20 border border-neon-500/30 px-5 py-2.5 text-sm font-semibold text-neon-200 hover:bg-neon-500/30"
        >
          Reset Password
        </button>
      </div>

      <ResetPasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </div>
  )
}
