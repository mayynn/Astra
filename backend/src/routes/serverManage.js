import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middlewares/auth.js"
import { validate } from "../middlewares/validate.js"
import { getOne } from "../config/db.js"
import { pteroManage } from "../services/pteroManage.js"
import { pluginInstaller } from "../services/pluginInstaller.js"

const router = Router()

/* ── Middleware: look up the server + resolve Pterodactyl identifier ──────── */

async function resolveServer(req, res, next) {
  const serverId = Number(req.params.serverId)
  if (!serverId || isNaN(serverId)) {
    return res.status(400).json({ error: "Invalid server ID" })
  }

  const server = await getOne(
    "SELECT * FROM servers WHERE id = ? AND user_id = ? AND status != 'deleted'",
    [serverId, req.user.id]
  )
  if (!server) {
    return res.status(404).json({ error: "Server not found or access denied" })
  }

  try {
    const details = await pteroManage.getServerDetails(server.pterodactyl_server_id)
    req.server = server
    req.ptero = details
    next()
  } catch {
    return res.status(502).json({ error: "Failed to reach server panel" })
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  1. MANAGE — overview                                                      *
 * ═══════════════════════════════════════════════════════════════════════════ */

router.get("/:serverId/manage", requireAuth, resolveServer, async (req, res, next) => {
  try {
    let resources = null
    try {
      resources = await pteroManage.getResources(req.ptero.uuid, req.ptero.node)
    } catch {
      /* non-fatal */
    }
    res.json({
      server: {
        id: req.server.id,
        name: req.server.name,
        status: req.server.status,
        pterodactyl_id: req.ptero.id,
        identifier: req.ptero.identifier,
        node: req.ptero.node,
        limits: req.ptero.limits,
        feature_limits: req.ptero.feature_limits,
        allocations: req.ptero.allocations,
        is_suspended: req.ptero.suspended
      },
      resources
    })
  } catch (error) {
    next(error)
  }
})

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  2. COMMAND                                                                 *
 * ═══════════════════════════════════════════════════════════════════════════ */

const commandSchema = z.object({
  body: z.object({ command: z.string().min(1).max(512) })
})

router.post(
  "/:serverId/command",
  requireAuth,
  resolveServer,
  validate(commandSchema),
  async (req, res, next) => {
    try {
      await pteroManage.sendCommand(req.ptero.uuid, req.ptero.node, req.body.command)
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  }
)

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  3. POWER                                                                   *
 * ═══════════════════════════════════════════════════════════════════════════ */

const powerSchema = z.object({
  body: z.object({ signal: z.enum(["start", "stop", "restart", "kill"]) })
})

router.post(
  "/:serverId/power",
  requireAuth,
  resolveServer,
  validate(powerSchema),
  async (req, res, next) => {
    try {
      // Auto-accept EULA before starting/restarting
      if (req.body.signal === "start" || req.body.signal === "restart") {
        try {
          await pteroManage.writeFile(
            req.ptero.uuid,
            req.ptero.node,
            "/eula.txt",
            "# Auto-accepted by AstraNodes\neula=true\n"
          )
        } catch {
          /* eula.txt write is best-effort; don't block the power action */
        }
      }

      await pteroManage.sendPowerAction(req.ptero.uuid, req.ptero.node, req.body.signal)
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  }
)

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  3b. EULA                                                                   *
 * ═══════════════════════════════════════════════════════════════════════════ */

router.post("/:serverId/eula", requireAuth, resolveServer, async (req, res, next) => {
  try {
    await pteroManage.writeFile(
      req.ptero.uuid,
      req.ptero.node,
      "/eula.txt",
      "# Accepted via AstraNodes\neula=true\n"
    )
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  4. FILES                                                                   *
 * ═══════════════════════════════════════════════════════════════════════════ */

router.get("/:serverId/files", requireAuth, resolveServer, async (req, res, next) => {
  try {
    const directory = req.query.path || "/"
    const files = await pteroManage.listFiles(req.ptero.uuid, req.ptero.node, directory)
    res.json(files)
  } catch (error) {
    next(error)
  }
})

router.get("/:serverId/file", requireAuth, resolveServer, async (req, res, next) => {
  try {
    const filePath = req.query.path
    if (!filePath) return res.status(400).json({ error: "File path required" })
    const content = await pteroManage.getFileContents(req.ptero.uuid, req.ptero.node, filePath)
    res.type("text/plain").send(content)
  } catch (error) {
    next(error)
  }
})

const writeSchema = z.object({
  body: z.object({
    path: z.string().min(1).max(512),
    content: z.string().max(5 * 1024 * 1024)
  })
})

router.post(
  "/:serverId/file/write",
  requireAuth,
  resolveServer,
  validate(writeSchema),
  async (req, res, next) => {
    try {
      await pteroManage.writeFile(req.ptero.uuid, req.ptero.node, req.body.path, req.body.content)
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  }
)

const deleteFileSchema = z.object({
  body: z.object({
    root: z.string().default("/"),
    files: z.array(z.string().min(1)).min(1).max(50)
  })
})

router.post(
  "/:serverId/file/delete",
  requireAuth,
  resolveServer,
  validate(deleteFileSchema),
  async (req, res, next) => {
    try {
      await pteroManage.deleteFiles(req.ptero.uuid, req.ptero.node, req.body.root, req.body.files)
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  }
)

const createFolderSchema = z.object({
  body: z.object({
    root: z.string().default("/"),
    name: z.string().min(1).max(255)
  })
})

router.post(
  "/:serverId/file/create-folder",
  requireAuth,
  resolveServer,
  validate(createFolderSchema),
  async (req, res, next) => {
    try {
      await pteroManage.createDirectory(req.ptero.uuid, req.ptero.node, req.body.root, req.body.name)
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  }
)

const renameSchema = z.object({
  body: z.object({
    root: z.string().default("/"),
    files: z
      .array(z.object({ from: z.string().min(1), to: z.string().min(1) }))
      .min(1)
      .max(50)
  })
})

router.post(
  "/:serverId/file/rename",
  requireAuth,
  resolveServer,
  validate(renameSchema),
  async (req, res, next) => {
    try {
      await pteroManage.renameFile(req.ptero.uuid, req.ptero.node, req.body.root, req.body.files)
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  }
)

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  5. SERVER.PROPERTIES                                                       *
 * ═══════════════════════════════════════════════════════════════════════════ */

router.get("/:serverId/properties", requireAuth, resolveServer, async (req, res, next) => {
  try {
    const content = await pteroManage.getFileContents(
      req.ptero.uuid,
      req.ptero.node,
      "/server.properties"
    )
    const properties = {}
    for (const line of content.split("\n")) {
      const t = line.trim()
      if (!t || t.startsWith("#")) continue
      const eq = t.indexOf("=")
      if (eq > 0) properties[t.substring(0, eq).trim()] = t.substring(eq + 1).trim()
    }
    res.json({ raw: content, properties })
  } catch (error) {
    next(error)
  }
})

const propsSchema = z.object({
  body: z.object({ content: z.string().min(1).max(100_000) })
})

router.put(
  "/:serverId/properties",
  requireAuth,
  resolveServer,
  validate(propsSchema),
  async (req, res, next) => {
    try {
      await pteroManage.writeFile(
        req.ptero.uuid,
        req.ptero.node,
        "/server.properties",
        req.body.content
      )
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  }
)

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  6. WORLD MANAGER                                                           *
 * ═══════════════════════════════════════════════════════════════════════════ */

const worldSchema = z.object({
  body: z.object({ world_name: z.string().min(1).max(100).default("world") })
})

router.post(
  "/:serverId/world/delete",
  requireAuth,
  resolveServer,
  validate(worldSchema),
  async (req, res, next) => {
    try {
      const w = req.body.world_name
      const all = await pteroManage.listFiles(req.ptero.uuid, req.ptero.node, "/")
      const targets = [w, `${w}_nether`, `${w}_the_end`]
      const existing = all.filter((f) => !f.is_file && targets.includes(f.name)).map((f) => f.name)
      if (existing.length) await pteroManage.deleteFiles(req.ptero.uuid, req.ptero.node, "/", existing)
      res.json({ success: true, deleted: existing })
    } catch (error) {
      next(error)
    }
  }
)

router.post(
  "/:serverId/world/reset",
  requireAuth,
  resolveServer,
  validate(worldSchema),
  async (req, res, next) => {
    try {
      const w = req.body.world_name

      // Stop server
      await pteroManage.sendPowerAction(req.ptero.uuid, req.ptero.node, "stop")
      await new Promise((r) => setTimeout(r, 5000))

      // Delete world folders
      const all = await pteroManage.listFiles(req.ptero.uuid, req.ptero.node, "/")
      const targets = [w, `${w}_nether`, `${w}_the_end`]
      const existing = all.filter((f) => !f.is_file && targets.includes(f.name)).map((f) => f.name)
      if (existing.length) await pteroManage.deleteFiles(req.ptero.uuid, req.ptero.node, "/", existing)

      // Restart — world will regenerate
      await pteroManage.sendPowerAction(req.ptero.uuid, req.ptero.node, "start")

      res.json({ success: true, message: "World reset initiated. Server is restarting." })
    } catch (error) {
      next(error)
    }
  }
)

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  7. PLUGINS                                                                 *
 * ═══════════════════════════════════════════════════════════════════════════ */

/** GET /plugins/sources — which sources are available */
router.get("/:serverId/plugins/sources", requireAuth, resolveServer, (req, res) => {
  res.json({
    modrinth: true,
    curseforge: pluginInstaller.hasCurseForge()
  })
})

/** GET /plugins/search?q=...&type=plugin|mod|datapack|shader|resourcepack|modpack&source=modrinth|curseforge|all */
router.get("/:serverId/plugins/search", requireAuth, resolveServer, async (req, res, next) => {
  try {
    const q = req.query.q || ""
    const validTypes = ["plugin", "mod", "datapack", "shader", "resourcepack", "modpack"]
    const type = validTypes.includes(req.query.type) ? req.query.type : "plugin"
    const source = ["modrinth", "curseforge", "all"].includes(req.query.source) ? req.query.source : "all"
    
    // If no query, return popular/featured items instead of empty array
    const searchQuery = q.length < 2 ? (type === "mod" ? "fabric" : type === "datapack" ? "vanilla" : "essentials") : q
    const results = await pluginInstaller.search(searchQuery, { type, source })
    res.json(results)
  } catch (error) {
    next(error)
  }
})

/** GET /plugins/:slug/versions — get all versions for a Modrinth project */
router.get("/:serverId/plugins/:slug/versions", requireAuth, resolveServer, async (req, res, next) => {
  try {
    const { slug } = req.params
    const versions = await pluginInstaller.getVersions(slug)
    res.json(versions)
  } catch (error) {
    next(error)
  }
})

const installSchema = z.object({
  body: z.object({
    source: z.enum(["modrinth", "curseforge"]),
    slug: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/).optional(),
    projectId: z.union([z.string(), z.number()]).optional(),
    fileId: z.union([z.string(), z.number()]).optional(),
    versionId: z.string().optional(),
    type: z.enum(["plugin", "mod", "datapack", "shader", "resourcepack", "modpack"]).default("plugin")
  }).refine(
    (d) => (d.source === "modrinth" && d.slug) || (d.source === "curseforge" && d.projectId),
    { message: "modrinth requires slug; curseforge requires projectId" }
  )
})

router.post(
  "/:serverId/plugins/install",
  requireAuth,
  resolveServer,
  validate(installSchema),
  async (req, res, next) => {
    try {
      const { source, slug, projectId, fileId, versionId, type } = req.body
      const result = await pluginInstaller.install(req.ptero.uuid, req.ptero.node, {
        source, slug, projectId: projectId ? Number(projectId) : undefined,
        fileId: fileId ? Number(fileId) : undefined, versionId, type
      })
      res.json(result)
    } catch (error) {
      next(error)
    }
  }
)

/** GET /plugins?type=plugin|mod — list installed jars */
router.get("/:serverId/plugins", requireAuth, resolveServer, async (req, res, next) => {
  try {
    const type = req.query.type === "mod" ? "mod" : "plugin"
    const dir = type === "mod" ? "/mods" : "/plugins"
    const files = await pteroManage.listFiles(req.ptero.uuid, req.ptero.node, dir)
    res.json(files.filter((f) => f.is_file && f.name.endsWith(".jar")))
  } catch (error) {
    if (error.statusCode === 404) return res.json([])
    next(error)
  }
})

const deletePluginSchema = z.object({
  body: z.object({
    filename: z.string().min(1).max(255),
    type: z.enum(["plugin", "mod", "datapack", "shader", "resourcepack", "modpack"]).default("plugin")
  })
})

router.post(
  "/:serverId/plugins/delete",
  requireAuth,
  resolveServer,
  validate(deletePluginSchema),
  async (req, res, next) => {
    try {
      const dir = req.body.type === "mod" ? "/mods" : "/plugins"
      await pteroManage.deleteFiles(req.ptero.uuid, req.ptero.node, dir, [req.body.filename])
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  }
)

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  8. VERSION CHANGER                                                         *
 * ═══════════════════════════════════════════════════════════════════════════ */

const versionSchema = z.object({
  body: z.object({ version: z.string().min(1).max(20) })
})

router.post(
  "/:serverId/version",
  requireAuth,
  resolveServer,
  validate(versionSchema),
  async (req, res, next) => {
    try {
      await pteroManage.updateStartupVariable(
        req.server.pterodactyl_server_id,
        "MINECRAFT_VERSION",
        req.body.version
      )
      await pteroManage.reinstallServer(req.server.pterodactyl_server_id)
      res.json({
        success: true,
        message: `Version change to ${req.body.version} initiated. Server is reinstalling.`
      })
    } catch (error) {
      next(error)
    }
  }
)

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  9. SETTINGS + STARTUP VARIABLES                                            *
 * ═══════════════════════════════════════════════════════════════════════════ */

router.get("/:serverId/settings", requireAuth, resolveServer, async (req, res, next) => {
  try {
    let resources = null
    try {
      resources = await pteroManage.getResources(req.ptero.uuid, req.ptero.node)
    } catch {
      /* non-fatal */
    }
    let variables = []
    try {
      variables = await pteroManage.getStartupVariables(req.server.pterodactyl_server_id)
    } catch {
      /* non-fatal */
    }
    res.json({
      name: req.ptero.name,
      identifier: req.ptero.identifier,
      uuid: req.ptero.uuid,
      node: req.ptero.node,
      limits: req.ptero.limits,
      feature_limits: req.ptero.feature_limits,
      allocations: req.ptero.allocations,
      suspended: req.ptero.suspended,
      resources,
      startup_variables: variables
    })
  } catch (error) {
    next(error)
  }
})

router.get("/:serverId/startup", requireAuth, resolveServer, async (req, res, next) => {
  try {
    const vars = await pteroManage.getStartupVariables(req.server.pterodactyl_server_id)
    res.json(vars)
  } catch (error) {
    next(error)
  }
})

const startupVarSchema = z.object({
  body: z.object({ key: z.string().min(1).max(128), value: z.string().max(1024) })
})

router.put(
  "/:serverId/startup",
  requireAuth,
  resolveServer,
  validate(startupVarSchema),
  async (req, res, next) => {
    try {
      await pteroManage.updateStartupVariable(req.server.pterodactyl_server_id, req.body.key, req.body.value)
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  }
)

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  10. PLAYER MANAGER                                                         *
 * ═══════════════════════════════════════════════════════════════════════════ */

const playerSchema = z.object({
  body: z.object({
    action: z.enum(["list", "kick", "ban", "op", "deop", "pardon"]),
    player: z.string().max(32).optional()
  })
})

router.post(
  "/:serverId/players",
  requireAuth,
  resolveServer,
  validate(playerSchema),
  async (req, res, next) => {
    try {
      const { action, player } = req.body
      if (action !== "list" && !player) {
        return res.status(400).json({ error: "Player name required" })
      }
      const command = action === "list" ? "list" : `${action} ${player}`
      await pteroManage.sendCommand(req.ptero.uuid, req.ptero.node, command)
      res.json({ success: true, command })
    } catch (error) {
      next(error)
    }
  }
)

export default router
