import axios from "axios"
import { env } from "../config/env.js"
import { selectBestNode, getAvailableNodes } from "../utils/selectBestNode.js"

const client = axios.create({
  baseURL: `${env.PTERODACTYL_URL.replace(/\/$/, "")}/api/application`,
  headers: {
    Authorization: `Bearer ${env.PTERODACTYL_API_KEY}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  },
  timeout: 15000
})

function parseEnv() {
  try {
    return JSON.parse(env.PTERODACTYL_DEFAULT_ENV || "{}")
  } catch (error) {
    const err = new Error("Invalid PTERODACTYL_DEFAULT_ENV JSON")
    err.statusCode = 500
    throw err
  }
}

function handleError(error, action) {
  console.error(`[PTERODACTYL] ✗ ${action} failed:`, {
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data
  })
  
  const detail = error.response?.data?.errors?.[0]?.detail
  const message = detail || error.message || "Unknown error"
  const err = new Error(`Pterodactyl ${action} failed: ${message}`)
  err.statusCode = 502
  throw err
}

export const pterodactyl = {
  async getAvailableAllocation(nodeId) {
    try {
      console.log("[PTERODACTYL] Fetching available allocations for node:", nodeId)
      
      const response = await client.get(`/nodes/${nodeId}/allocations`, {
        params: { per_page: 100 }
      })
      
      const allocations = response.data.data
      const available = allocations.find(a => !a.attributes.assigned)
      
      if (!available) {
        console.error("[PTERODACTYL] ✗ No available allocations found on node", nodeId)
        const err = new Error("No available allocations on the node. Please create more allocations in Pterodactyl panel.")
        err.statusCode = 500
        throw err
      }
      
      console.log("[PTERODACTYL] ✓ Found available allocation:", {
        id: available.attributes.id,
        ip: available.attributes.ip,
        port: available.attributes.port
      })
      
      return available.attributes.id
    } catch (error) {
      if (error.statusCode === 500) throw error
      handleError(error, "allocation fetch")
    }
  },

  async createUser({ email, username, firstName, lastName, password }) {
    try {
      console.log("[PTERODACTYL] Creating user:", { email, username })
      
      const response = await client.post("/users", {
        email,
        username,
        first_name: firstName,
        last_name: lastName,
        password,
        language: "en"
      })
      
      console.log("[PTERODACTYL] ✓ User created with ID:", response.data.attributes.id)
      return response.data.attributes.id
    } catch (error) {
      handleError(error, "user creation")
    }
  },

  async createServer({ name, userId, limits, nodeId: preferredNodeId = null }) {
    try {
      // Dynamically select the best node based on real-time resource availability.
      // If the user picked a specific node (preferredNodeId), that node is used
      // directly (still verified for capacity + free allocations).
      const { nodeId, allocationId } = await selectBestNode(limits.memory, limits.disk, preferredNodeId)

      console.log("[PTERODACTYL] Creating server:", {
        name,
        userId,
        limits,
        node: nodeId,
        egg: env.PTERODACTYL_DEFAULT_EGG,
        allocation: allocationId
      })
      
      const payload = {
        name,
        user: userId,
        egg: env.PTERODACTYL_DEFAULT_EGG,
        node: nodeId,
        allocation: {
          default: allocationId
        },
        docker_image: env.PTERODACTYL_DEFAULT_DOCKER_IMAGE,
        startup: env.PTERODACTYL_DEFAULT_STARTUP,
        environment: parseEnv(),
        limits: {
          memory: limits.memory,
          swap: 0,
          disk: limits.disk,
          io: 500,
          cpu: limits.cpu * 100
        },
        feature_limits: {
          databases: 0,
          allocations: 0,
          backups: 0
        },
        start_on_completion: true
      }
      
      console.log("[PTERODACTYL] Request payload:", JSON.stringify(payload, null, 2))
      
      const response = await client.post("/servers", payload)
      
      console.log("[PTERODACTYL] ✓ Server created with ID:", response.data.attributes.id)
      return response.data.attributes.id
    } catch (error) {
      handleError(error, "server creation")
    }
  },

  async suspendServer(serverId) {
    try {
      await client.post(`/servers/${serverId}/suspend`)
    } catch (error) {
      handleError(error, "suspension")
    }
  },

  async unsuspendServer(serverId) {
    try {
      await client.post(`/servers/${serverId}/unsuspend`)
    } catch (error) {
      handleError(error, "unsuspend")
    }
  },

  async deleteServer(serverId) {
    try {
      await client.delete(`/servers/${serverId}`)
    } catch (error) {
      handleError(error, "delete")
    }
  },

  async deleteUser(pteroUserId) {
    try {
      await client.delete(`/users/${pteroUserId}`)
      console.log("[PTERODACTYL] ✓ Panel user deleted:", pteroUserId)
    } catch (error) {
      // 404 means user already gone from panel — not an error
      if (error.response?.status === 404) {
        console.log("[PTERODACTYL] Panel user already gone (404):", pteroUserId)
        return
      }
      handleError(error, "user deletion")
    }
  },

  getAvailableNodes
}
