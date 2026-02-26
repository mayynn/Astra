import { Router } from "express"
import { z } from "zod"
import { validate } from "../middlewares/validate.js"
import { requireAuth } from "../middlewares/auth.js"
import { query, getOne, runSync } from "../config/db.js"
import { addDays, getDurationDays } from "../utils/durations.js"
import { pterodactyl } from "../services/pterodactyl.js"
import { getLimits } from "../cron/expiryCron.js"

const router = Router()

const purchaseSchema = z.object({
  body: z.object({
    plan_type: z.enum(["coin", "real"]),
    plan_id: z.number().int().positive(),
    server_name: z.string().min(3).max(60),
    location: z.string().max(80).optional(),
    node_id: z.number().int().positive().optional()
  })
})

const renewSchema = z.object({
  body: z.object({
    server_id: z.number().int().positive()
  })
})

async function getPlan(planType, planId) {
  const table = planType === "coin" ? "plans_coin" : "plans_real"
  return await getOne(`SELECT * FROM ${table} WHERE id = ?`, [planId])
}

function getPrice(planType, plan) {
  return planType === "coin" ? plan.coin_price : plan.price
}

function getBalanceField(planType) {
  return planType === "coin" ? "coins" : "balance"
}

// Return live available Pterodactyl nodes for location picker
router.get("/nodes", requireAuth, async (req, res, next) => {
  try {
    const nodes = await pterodactyl.getAvailableNodes()
    res.json(nodes)
  } catch (error) {
    next(error)
  }
})

router.get("/", requireAuth, async (req, res, next) => {
  try {
    // Only fetch servers that are not deleted
    const servers = await query(
      "SELECT * FROM servers WHERE user_id = ? AND status != 'deleted' ORDER BY created_at DESC",
      [req.user.id]
    )
    const enriched = await Promise.all(
      servers.map(async (server) => {
        const plan = await getPlan(server.plan_type, server.plan_id)
        return {
          ...server,
          plan: plan?.name || "Unknown Plan"
        }
      })
    )
    res.json(enriched)
  } catch (error) {
    next(error)
  }
})

router.post("/purchase", requireAuth, validate(purchaseSchema), async (req, res, next) => {
  try {
    // Only fetch the balance columns needed — never load password_hash
    const user = await getOne(
      "SELECT id, coins, balance, pterodactyl_user_id FROM users WHERE id = ?",
      [req.user.id]
    )
    const { plan_type: planType, plan_id: planId, server_name: serverName, location, node_id: nodeId } = req.body
    const plan = await getPlan(planType, planId)

    if (!plan) {
      return res.status(404).json({ error: "Plan not found" })
    }

    if (plan.limited_stock && (!plan.stock_amount || plan.stock_amount <= 0)) {
      return res.status(400).json({ error: "Plan out of stock" })
    }

    if (planType === "coin" && plan.one_time_purchase) {
      const existing = await getOne(
        "SELECT id FROM servers WHERE user_id = ? AND plan_type = 'coin' AND plan_id = ? AND status != 'deleted'",
        [req.user.id, planId]
      )
      if (existing) {
        return res.status(400).json({ error: "You already have an active server with this one-time purchase plan. You can renew it but cannot purchase it again." })
      }
    }

    const price = getPrice(planType, plan)
    const balanceField = getBalanceField(planType)
    if (user[balanceField] < price) {
      return res.status(400).json({ error: "Insufficient balance" })
    }

    const durationDays = getDurationDays(plan.duration_type, plan.duration_days)
    const expiresAt = addDays(null, durationDays)

    const pteroServerId = await pterodactyl.createServer({
      name: serverName,
      userId: user.pterodactyl_user_id,
      limits: getLimits(plan),
      nodeId: nodeId || null
    })

    try {
      // Perform operations as a sequence (simulating transaction)
      await runSync(
        "INSERT INTO servers (user_id, name, plan_type, plan_id, pterodactyl_server_id, expires_at, status, location) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)",
        [req.user.id, serverName, planType, planId, pteroServerId, expiresAt, location || ""]
      )

      await runSync(
        `UPDATE users SET ${balanceField} = ${balanceField} - ? WHERE id = ?`,
        [price, req.user.id]
      )

      if (plan.limited_stock) {
        await runSync(
          `UPDATE ${planType === "coin" ? "plans_coin" : "plans_real"} SET stock_amount = stock_amount - 1 WHERE id = ?`,
          [planId]
        )
      }
    } catch (error) {
      await pterodactyl.deleteServer(pteroServerId)
      throw error
    }

    res.status(201).json({ message: "Server created", expires_at: expiresAt })
  } catch (error) {
    next(error)
  }
})

router.post("/renew", requireAuth, validate(renewSchema), async (req, res, next) => {
  try {
    const now = new Date()
    const server = await getOne(
      "SELECT * FROM servers WHERE id = ? AND user_id = ?",
      [req.body.server_id, req.user.id]
    )

    if (!server) {
      return res.status(404).json({ error: "Server not found" })
    }

    if (server.status === "deleted") {
      return res.status(400).json({ error: "Server deleted" })
    }

    if (server.status === "suspended" && server.grace_expires_at) {
      if (new Date(server.grace_expires_at) <= now) {
        return res.status(400).json({ error: "Grace period expired" })
      }
    }

    const plan = await getPlan(server.plan_type, server.plan_id)
    const user = await getOne(
      "SELECT id, coins, balance, pterodactyl_user_id FROM users WHERE id = ?",
      [req.user.id]
    )

    if (!plan || !user) {
      return res.status(404).json({ error: "Missing data" })
    }

    const price = getPrice(server.plan_type, plan)
    const balanceField = getBalanceField(server.plan_type)

    if (user[balanceField] < price) {
      return res.status(400).json({ error: "Insufficient balance" })
    }

    if (server.status === "suspended") {
      await pterodactyl.unsuspendServer(server.pterodactyl_server_id)
    }

    const durationDays = getDurationDays(plan.duration_type, plan.duration_days)
    const baseDate = new Date(server.expires_at)
    const base = baseDate > now ? server.expires_at : now.toISOString()
    const nextExpiry = addDays(base, durationDays)

    // Perform operations as a sequence
    await runSync(
      `UPDATE users SET ${balanceField} = ${balanceField} - ? WHERE id = ?`,
      [price, req.user.id]
    )

    await runSync(
      "UPDATE servers SET expires_at = ?, status = 'active', suspended_at = NULL, grace_expires_at = NULL WHERE id = ? AND status != 'deleted'",
      [nextExpiry, server.id]
    )

    res.json({ message: "Renewed", expires_at: nextExpiry })
  } catch (error) {
    next(error)
  }
})

export default router
