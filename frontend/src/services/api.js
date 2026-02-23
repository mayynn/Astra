// Smart API URL detection for development and Codespaces
function getApiUrl() {
  // If explicitly set via .env, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // In development on Codespaces, construct the backend URL from the frontend URL
  if (window.location.hostname.includes("app.github.dev")) {
    const baseUrl = window.location.origin.replace("-5173.", "-4000.")
    return `${baseUrl}/api`
  }

  // Default to localhost
  return "http://localhost:4000/api"
}

const API_URL = getApiUrl()

export const api = {
  // Auth
  register: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
    if (!res.ok) throw new Error((await res.json()).error || "Registration failed")
    return res.json()
  },

  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
    if (!res.ok) throw new Error((await res.json()).error || "Login failed")
    return res.json()
  },

  // Plans
  getCoinPlans: async () => {
    const res = await fetch(`${API_URL}/plans/coin`)
    if (!res.ok) throw new Error("Failed to fetch coin plans")
    return res.json()
  },

  getRealPlans: async () => {
    const res = await fetch(`${API_URL}/plans/real`)
    if (!res.ok) throw new Error("Failed to fetch real plans")
    return res.json()
  },

  // Servers
  getUserServers: async (token) => {
    const res = await fetch(`${API_URL}/servers`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch servers")
    return res.json()
  },

  purchaseServer: async (token, planType, planId, serverName) => {
    const res = await fetch(`${API_URL}/servers/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ plan_type: planType, plan_id: planId, server_name: serverName })
    })
    if (!res.ok) throw new Error((await res.json()).error || "Purchase failed")
    return res.json()
  },

  renewServer: async (token, serverId) => {
    const res = await fetch(`${API_URL}/servers/renew`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ server_id: serverId })
    })
    if (!res.ok) throw new Error((await res.json()).error || "Renewal failed")
    return res.json()
  },

  // Coins
  getBalance: async (token) => {
    const res = await fetch(`${API_URL}/coins/balance`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch balance")
    return res.json()
  },

  claimCoins: async (token, earnToken) => {
    const res = await fetch(`${API_URL}/coins/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ earnToken })
    })
    if (!res.ok) {
      const data = await res.json()
      const err = new Error(data.error || "Claim failed")
      if (data.waitSeconds) err.waitSeconds = data.waitSeconds
      throw err
    }
    return res.json()
  },

  getEarnSession: async (token) => {
    const res = await fetch(`${API_URL}/coins/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to start earn session")
    }
    return res.json()
  },

  // Coupons
  redeemCoupon: async (token, code) => {
    const res = await fetch(`${API_URL}/coupons/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ code })
    })
    if (!res.ok) throw new Error((await res.json()).error || "Coupon redeem failed")
    return res.json()
  },

  getCouponHistory: async (token) => {
    const res = await fetch(`${API_URL}/coupons/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch coupon history")
    return res.json()
  },

  // Billing
  submitUTR: async (token, amount, utrNumber, screenshot) => {
    const formData = new FormData()
    formData.append("amount", amount)
    formData.append("utr_number", utrNumber)
    formData.append("screenshot", screenshot)

    const res = await fetch(`${API_URL}/billing/utr`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
    if (!res.ok) throw new Error((await res.json()).error || "UTR submission failed")
    return res.json()
  },

  getUTRSubmissions: async (token) => {
    const res = await fetch(`${API_URL}/billing/utr`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch UTR submissions")
    return res.json()
  },

  // Admin
  getUsers: async (token) => {
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch users")
    return res.json()
  },

  flagUser: async (token, userId, flagged) => {
    const res = await fetch(`${API_URL}/admin/users/${userId}/flag`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ flagged })
    })
    if (!res.ok) throw new Error("Failed to flag user")
    return res.json()
  },

  getServers: async (token) => {
    const res = await fetch(`${API_URL}/admin/servers`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch servers")
    return res.json()
  },

  suspendServer: async (token, serverId) => {
    const res = await fetch(`${API_URL}/admin/servers/${serverId}/suspend`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to suspend server")
    return res.json()
  },

  deleteServer: async (token, serverId) => {
    const res = await fetch(`${API_URL}/admin/servers/${serverId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to delete server")
    return res.json()
  },

  getUTRSubmissionsAdmin: async (token) => {
    const res = await fetch(`${API_URL}/admin/utr`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch UTR submissions")
    return res.json()
  },

  approveUTR: async (token, submissionId) => {
    const res = await fetch(`${API_URL}/admin/utr/${submissionId}/approve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to approve UTR")
    return res.json()
  },

  rejectUTR: async (token, submissionId) => {
    const res = await fetch(`${API_URL}/admin/utr/${submissionId}/reject`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to reject UTR")
    return res.json()
  },

  // Admin: Plan Management
  createCoinPlan: async (token, planData) => {
    const res = await fetch(`${API_URL}/admin/plans/coin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(planData)
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(errorData.error || "Failed to create coin plan")
    }
    return res.json()
  },

  createRealPlan: async (token, planData) => {
    const res = await fetch(`${API_URL}/admin/plans/real`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(planData)
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(errorData.error || "Failed to create real plan")
    }
    return res.json()
  },

  updateCoinPlan: async (token, planId, planData) => {
    const res = await fetch(`${API_URL}/admin/plans/coin/${planId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(planData)
    })
    if (!res.ok) throw new Error("Failed to update coin plan")
    return res.json()
  },

  updateRealPlan: async (token, planId, planData) => {
    const res = await fetch(`${API_URL}/admin/plans/real/${planId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(planData)
    })
    if (!res.ok) throw new Error("Failed to update real plan")
    return res.json()
  },

  deleteCoinPlan: async (token, planId) => {
    const res = await fetch(`${API_URL}/admin/plans/coin/${planId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to delete coin plan")
    return res.json()
  },

  deleteRealPlan: async (token, planId) => {
    const res = await fetch(`${API_URL}/admin/plans/real/${planId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to delete real plan")
    return res.json()
  },

  // Coupons (admin)
  getCoupons: async (token) => {
    const res = await fetch(`${API_URL}/admin/coupons`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch coupons")
    return res.json()
  },

  createCoupon: async (token, data) => {
    const res = await fetch(`${API_URL}/admin/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to create coupon")
    return res.json()
  },

  updateCoupon: async (token, id, data) => {
    const res = await fetch(`${API_URL}/admin/coupons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to update coupon")
    return res.json()
  },

  deleteCoupon: async (token, id) => {
    const res = await fetch(`${API_URL}/admin/coupons/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to delete coupon")
    return res.json()
  },

  // Ads
  getCoinsPageAds: async () => {
    const res = await fetch(`${API_URL}/ads/coins`)
    if (!res.ok) throw new Error("Failed to fetch ads")
    return res.json()
  },

  // Payment settings (UPI)
  getPaymentSettings: async () => {
    const res = await fetch(`${API_URL}/settings/payment`)
    if (!res.ok) return { upiId: null, upiName: null }
    return res.json()
  },

  // Tickets
  createTicket: async (token, data, imageFile) => {
    const formData = new FormData()
    formData.append("category", data.category)
    formData.append("subject", data.subject)
    formData.append("message", data.message)
    if (data.priority) formData.append("priority", data.priority)
    if (imageFile) formData.append("image", imageFile)

    const res = await fetch(`${API_URL}/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to create ticket")
    return res.json()
  },

  getMyTickets: async (token) => {
    const res = await fetch(`${API_URL}/tickets/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch tickets")
    return res.json()
  },

  getTicket: async (token, ticketId) => {
    const res = await fetch(`${API_URL}/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch ticket")
    return res.json()
  },

  replyToTicket: async (token, ticketId, message, imageFile) => {
    const formData = new FormData()
    formData.append("message", message)
    if (imageFile) formData.append("image", imageFile)

    const res = await fetch(`${API_URL}/tickets/${ticketId}/reply`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to send reply")
    return res.json()
  },

  // Admin Tickets
  getAllTickets: async (token, status) => {
    const url = status ? `${API_URL}/admin/tickets?status=${status}` : `${API_URL}/admin/tickets`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch tickets")
    return res.json()
  },

  getAdminTicket: async (token, ticketId) => {
    const res = await fetch(`${API_URL}/admin/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch ticket")
    return res.json()
  },

  adminReplyToTicket: async (token, ticketId, message, imageFile) => {
    const formData = new FormData()
    formData.append("message", message)
    if (imageFile) formData.append("image", imageFile)

    const res = await fetch(`${API_URL}/admin/tickets/${ticketId}/reply`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to send reply")
    return res.json()
  },

  updateTicketStatus: async (token, ticketId, status) => {
    const res = await fetch(`${API_URL}/admin/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    })
    if (!res.ok) throw new Error("Failed to update ticket status")
    return res.json()
  },

  deleteTicket: async (token, ticketId) => {
    const res = await fetch(`${API_URL}/admin/tickets/${ticketId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to delete ticket")
    return res.json()
  },

  // ─── Frontpage (public) ───────────────────────────────────────────────────

  getFrontpage: async () => {
    const res = await fetch(`${API_URL}/frontpage`)
    if (!res.ok) throw new Error("Failed to fetch frontpage content")
    return res.json()
  },

  getLandingPlans: async () => {
    const res = await fetch(`${API_URL}/frontpage/landing-plans`)
    if (!res.ok) throw new Error("Failed to fetch landing plans")
    return res.json()
  },

  getStats: async () => {
    const res = await fetch(`${API_URL}/stats`)
    if (!res.ok) throw new Error("Failed to fetch stats")
    return res.json()
  },

  // ─── Admin: Frontpage editor ──────────────────────────────────────────────

  getAdminFrontpage: async () => {
    const token = localStorage.getItem("token")
    const res = await fetch(`${API_URL}/admin/frontpage`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch frontpage content")
    return res.json()
  },

  updateFrontpageSection: async (section, content) => {
    const token = localStorage.getItem("token")
    const res = await fetch(`${API_URL}/admin/frontpage/${section}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to update section")
    return res.json()
  },

  // ─── Admin: Landing Plans ─────────────────────────────────────────────────

  getAdminLandingPlans: async () => {
    const token = localStorage.getItem("token")
    const res = await fetch(`${API_URL}/admin/frontpage/landing-plans`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch landing plans")
    return res.json()
  },

  createLandingPlan: async (planData) => {
    const token = localStorage.getItem("token")
    const res = await fetch(`${API_URL}/admin/frontpage/landing-plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(planData)
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to create plan")
    return res.json()
  },

  updateLandingPlan: async (id, planData) => {
    const token = localStorage.getItem("token")
    const res = await fetch(`${API_URL}/admin/frontpage/landing-plans/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(planData)
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to update plan")
    return res.json()
  },

  deleteLandingPlan: async (id) => {
    const token = localStorage.getItem("token")
    const res = await fetch(`${API_URL}/admin/frontpage/landing-plans/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete plan")
    return res.json()
  },

  toggleLandingPlanActive: async (id) => {
    const token = localStorage.getItem("token")
    const res = await fetch(`${API_URL}/admin/frontpage/landing-plans/${id}/toggle-active`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to toggle plan status")
    return res.json()
  },

  toggleLandingPlanPopular: async (id) => {
    const token = localStorage.getItem("token")
    const res = await fetch(`${API_URL}/admin/frontpage/landing-plans/${id}/toggle-popular`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to toggle popular status")
    return res.json()
  }
}

export default api
