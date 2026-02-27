import { appApi } from "../config/ptero.js"
import { wingsRequest } from "../config/wingsClient.js"

function handleError(error, action) {
  console.error(`[PTERO-MANAGE] ${action} failed:`, {
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText
  })
  const err = new Error(`${action} failed. Please try again.`)
  err.statusCode = error.response?.status === 404 ? 404 : 502
  throw err
}

export const pteroManage = {
  /* ── Application API helpers ────────────────────────────────────────────── */

  /** Get server details (id, uuid, node, limits, allocations, container …) */
  async getServerDetails(pteroServerId) {
    try {
      const res = await appApi.get(`/servers/${pteroServerId}?include=allocations`)
      const a = res.data.attributes
      return {
        id: a.id,
        identifier: a.identifier,
        uuid: a.uuid,
        name: a.name,
        description: a.description,
        status: a.status,
        suspended: a.suspended,
        limits: a.limits,
        feature_limits: a.feature_limits,
        node: a.node,
        egg: a.egg,
        container: a.container,
        allocations:
          a.relationships?.allocations?.data?.map((al) => ({
            id: al.attributes.id,
            ip: al.attributes.ip,
            port: al.attributes.port,
            is_default: al.attributes.is_default
          })) || []
      }
    } catch (error) {
      handleError(error, "Get server details")
    }
  },

  /** Reinstall server */
  async reinstallServer(pteroServerId) {
    try {
      await appApi.post(`/servers/${pteroServerId}/reinstall`)
      return { success: true }
    } catch (error) {
      handleError(error, "Reinstall server")
    }
  },

  /* ── Wings Direct API helpers ───────────────────────────────────────────── */
  /*   All methods below talk to Wings daemon directly using the node's       */
  /*   daemon token — no Client API (PTLC_) key required.                     */

  /** Get live resource usage */
  async getResources(serverUuid, nodeId) {
    try {
      const res = await wingsRequest(nodeId, serverUuid, "GET", "")
      const d = res.data
      // Transform Wings format → Client API format (frontend compatibility)
      return {
        current_state: d.state,
        is_suspended: d.is_suspended,
        resources: {
          memory_bytes: d.utilization?.memory_bytes ?? 0,
          cpu_absolute: d.utilization?.cpu_absolute ?? 0,
          disk_bytes: d.utilization?.disk_bytes ?? 0,
          network_rx_bytes: d.utilization?.network?.rx_bytes ?? 0,
          network_tx_bytes: d.utilization?.network?.tx_bytes ?? 0,
          uptime: d.utilization?.uptime ?? 0
        }
      }
    } catch (error) {
      handleError(error, "Get server resources")
    }
  },

  /** Send a console command */
  async sendCommand(serverUuid, nodeId, command) {
    try {
      await wingsRequest(nodeId, serverUuid, "POST", "/commands", {
        data: { commands: [command] }
      })
      return { success: true }
    } catch (error) {
      handleError(error, "Send command")
    }
  },

  /** Power actions: start | stop | restart | kill */
  async sendPowerAction(serverUuid, nodeId, signal) {
    try {
      await wingsRequest(nodeId, serverUuid, "POST", "/power", {
        data: { action: signal }
      })
      return { success: true }
    } catch (error) {
      handleError(error, "Power action")
    }
  },

  /** List files in a directory */
  async listFiles(serverUuid, nodeId, directory = "/") {
    try {
      const res = await wingsRequest(nodeId, serverUuid, "GET", "/files/list-directory", {
        params: { directory }
      })
      // Wings returns a flat array; normalise field names
      return (res.data || []).map((f) => ({
        name: f.name,
        mode: f.mode,
        size: f.size,
        is_file: f.file,
        is_symlink: f.symlink,
        mimetype: f.mime,
        created_at: f.created,
        modified_at: f.modified
      }))
    } catch (error) {
      handleError(error, "List files")
    }
  },

  /** Read a file's text content */
  async getFileContents(serverUuid, nodeId, file) {
    try {
      const res = await wingsRequest(nodeId, serverUuid, "GET", "/files/contents", {
        params: { file },
        transformResponse: [(data) => data]
      })
      return res.data
    } catch (error) {
      handleError(error, "Get file contents")
    }
  },

  /** Write text content to a file */
  async writeFile(serverUuid, nodeId, file, content) {
    try {
      await wingsRequest(nodeId, serverUuid, "POST", "/files/write", {
        params: { file },
        data: content,
        contentType: "text/plain"
      })
      return { success: true }
    } catch (error) {
      handleError(error, "Write file")
    }
  },

  /** Delete files/folders */
  async deleteFiles(serverUuid, nodeId, root, files) {
    try {
      await wingsRequest(nodeId, serverUuid, "POST", "/files/delete", {
        data: { root, files }
      })
      return { success: true }
    } catch (error) {
      handleError(error, "Delete files")
    }
  },

  /** Create a directory */
  async createDirectory(serverUuid, nodeId, root, name) {
    try {
      await wingsRequest(nodeId, serverUuid, "POST", "/files/create-directory", {
        data: { name, path: root }
      })
      return { success: true }
    } catch (error) {
      handleError(error, "Create directory")
    }
  },

  /** Rename / move files */
  async renameFile(serverUuid, nodeId, root, files) {
    try {
      await wingsRequest(nodeId, serverUuid, "PUT", "/files/rename", {
        data: { root, files }
      })
      return { success: true }
    } catch (error) {
      handleError(error, "Rename file")
    }
  },

  /** Upload binary content to a file on the server via Wings write endpoint */
  async uploadFile(serverUuid, nodeId, filePath, buffer) {
    try {
      await wingsRequest(nodeId, serverUuid, "POST", "/files/write", {
        params: { file: filePath },
        data: buffer,
        contentType: "application/octet-stream",
        timeout: 120000
      })
      return { success: true }
    } catch (error) {
      handleError(error, "Upload file")
    }
  },

  /* ── Startup variables (Application API) ─────────────────────────────── */
  /*   Startup vars live in the Pterodactyl DB, not on Wings, so we use    */
  /*   the Application API with the admin PTLA_ key.                       */

  /** Get startup variables */
  async getStartupVariables(pteroServerId) {
    try {
      const res = await appApi.get(`/servers/${pteroServerId}?include=variables`)
      const vars = res.data.attributes.relationships?.variables?.data || []
      return vars.map((v) => ({
        name: v.attributes.name,
        description: v.attributes.description,
        env_variable: v.attributes.env_variable,
        default_value: v.attributes.default_value,
        server_value: v.attributes.server_value,
        is_editable: v.attributes.is_editable,
        rules: v.attributes.rules
      }))
    } catch (error) {
      handleError(error, "Get startup variables")
    }
  },

  /** Update a single startup variable */
  async updateStartupVariable(pteroServerId, key, value) {
    try {
      // Fetch current config so we can do a full PATCH
      const res = await appApi.get(`/servers/${pteroServerId}?include=variables`)
      const attrs = res.data.attributes
      const vars = attrs.relationships?.variables?.data || []

      // Build environment map from current values
      const environment = {}
      for (const v of vars) {
        const k = v.attributes.env_variable
        environment[k] = v.attributes.server_value ?? v.attributes.default_value ?? ""
      }
      // Apply the update
      environment[key] = value

      await appApi.patch(`/servers/${pteroServerId}/startup`, {
        startup: attrs.container.startup_command,
        egg: attrs.egg,
        image: attrs.container.image,
        environment,
        skip_scripts: false
      })
      return { success: true }
    } catch (error) {
      handleError(error, "Update startup variable")
    }
  }
}
