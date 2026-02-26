import { Router } from "express"
import { z } from "zod"
import { validate } from "../middlewares/validate.js"
import { query, getOne, runSync } from "../config/db.js"
import { hashPassword, verifyPassword } from "../utils/password.js"
import { signToken } from "../utils/jwt.js"
import { pterodactyl } from "../services/pterodactyl.js"
import { authRateLimiter } from "../middlewares/rateLimit.js"
import { requireAuth } from "../middlewares/auth.js"
import { ok, fail } from "../utils/apiResponse.js"

const router = Router()

const authSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
})

router.post("/register", authRateLimiter, validate(authSchema), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase()
    const password = req.body.password

    const exists = await getOne("SELECT id FROM users WHERE email = ?", [email])
    if (exists) {
      return res.status(409).json({ error: "Email already registered" })
    }

    const username = email.split("@")[0]
    const pteroId = await pterodactyl.createUser({
      email,
      username,
      firstName: username,
      lastName: "User",
      password
    })

    const hash = await hashPassword(password)
    const ip = req.ip

    const info = await runSync(
      "INSERT INTO users (email, password_hash, ip_address, last_login_ip, pterodactyl_user_id) VALUES (?, ?, ?, ?, ?)",
      [email, hash, ip, ip, pteroId]
    )

    // Never SELECT * — keep password_hash out of memory
    const user = await getOne(
      "SELECT id, email, role, coins, balance FROM users WHERE id = ?",
      [info.lastID]
    )
    const token = signToken(user)

    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } })
  } catch (error) {
    next(error)
  }
})

router.post("/login", authRateLimiter, validate(authSchema), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase()
    const password = req.body.password

    const user = await getOne(
      "SELECT id, email, password_hash, role, coins, balance, flagged, pterodactyl_user_id FROM users WHERE email = ?",
      [email]
    )
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    await runSync("UPDATE users SET last_login_ip = ? WHERE id = ?", [req.ip, user.id])

    const token = signToken(user)
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
  } catch (error) {
    next(error)
  }
})

const resetPasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8)
  })
})

router.post("/reset-password", requireAuth, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (currentPassword === newPassword) {
      return fail(res, "New password must be different from current password", 400)
    }

    const user = await getOne("SELECT id, password_hash FROM users WHERE id = ?", [req.user.id])
    if (!user) return fail(res, "User not found", 404)

    const validCurrent = await verifyPassword(currentPassword, user.password_hash)
    if (!validCurrent) return fail(res, "Current password is incorrect", 401)

    const newHash = await hashPassword(newPassword)
    await runSync("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, req.user.id])

    return ok(res, "Password reset successfully")
  } catch (error) {
    next(error)
  }
})

export default router
