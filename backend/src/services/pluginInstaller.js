import axios from "axios"
import { pteroManage } from "./pteroManage.js"
import { env } from "../config/env.js"

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  Plugin / Mod Installer — Modrinth + CurseForge                           *
 * ═══════════════════════════════════════════════════════════════════════════ */

const MODRINTH_API = "https://api.modrinth.com/v2"
const CURSEFORGE_API = "https://api.curseforge.com/v1"
const CF_GAME_MINECRAFT = 432
const CF_CLASS_PLUGINS = 5   // Bukkit Plugins
const CF_CLASS_MODS = 6      // Mods (Forge / Fabric / NeoForge / Quilt)

/** Helper: build CurseForge headers (requires API key) */
function cfHeaders() {
  return { "x-api-key": env.CURSEFORGE_API_KEY, Accept: "application/json" }
}

/** Check if CurseForge is available (API key configured) */
function hasCurseForge() {
  return Boolean(env.CURSEFORGE_API_KEY)
}

/* ── Modrinth ─────────────────────────────────────────────────────────────── */

async function searchModrinth(query, type = "plugin", limit = 15) {
  const facets = type === "mod"
    ? [["project_type:mod"]]
    : [["project_type:plugin"]]

  const res = await axios.get(`${MODRINTH_API}/search`, {
    params: { query, limit, facets: JSON.stringify(facets), index: "relevance" },
    timeout: 10000
  })

  return res.data.hits.map((p) => ({
    source: "modrinth",
    id: p.slug,
    slug: p.slug,
    title: p.title,
    description: p.description,
    downloads: p.downloads,
    icon_url: p.icon_url,
    categories: p.categories,
    type
  }))
}

async function installFromModrinth(serverUuid, nodeId, slug, type = "plugin") {
  // 1. Fetch available versions
  const versionsRes = await axios.get(`${MODRINTH_API}/project/${slug}/version`, { timeout: 10000 })
  const versions = versionsRes.data
  if (!versions.length) {
    throw Object.assign(new Error("No versions found for this project"), { statusCode: 404 })
  }

  // Prefer compatible loaders based on type
  const loaders = type === "mod"
    ? ["forge", "fabric", "neoforge", "quilt"]
    : ["paper", "spigot", "purpur", "bukkit", "folia"]

  let target =
    versions.find((v) => v.loaders?.some((l) => loaders.includes(l.toLowerCase()))) ||
    versions[0]

  // Find the primary .jar file
  const jarFile =
    target.files?.find((f) => f.primary && f.filename.endsWith(".jar")) ||
    target.files?.find((f) => f.filename.endsWith(".jar"))

  if (!jarFile) {
    throw Object.assign(new Error("No .jar file found in the latest version"), { statusCode: 404 })
  }

  // 2. Download the jar binary
  const downloadRes = await axios.get(jarFile.url, { responseType: "arraybuffer", timeout: 120000 })

  // 3. Upload to correct directory
  const dir = type === "mod" ? "mods" : "plugins"
  try { await pteroManage.createDirectory(serverUuid, nodeId, "/", dir) } catch { /* exists */ }

  await pteroManage.uploadFile(serverUuid, nodeId, `/${dir}/${jarFile.filename}`, Buffer.from(downloadRes.data))

  return {
    success: true,
    source: "modrinth",
    name: slug,
    filename: jarFile.filename,
    version: target.version_number,
    type
  }
}

/* ── CurseForge ───────────────────────────────────────────────────────────── */

async function searchCurseForge(query, type = "plugin", limit = 15) {
  if (!hasCurseForge()) return []

  const classId = type === "mod" ? CF_CLASS_MODS : CF_CLASS_PLUGINS

  const res = await axios.get(`${CURSEFORGE_API}/mods/search`, {
    headers: cfHeaders(),
    params: {
      gameId: CF_GAME_MINECRAFT,
      classId,
      searchFilter: query,
      pageSize: limit,
      sortField: 2, // Popularity
      sortOrder: "desc"
    },
    timeout: 10000
  })

  return (res.data?.data || []).map((m) => ({
    source: "curseforge",
    id: String(m.id),
    slug: m.slug,
    title: m.name,
    description: m.summary,
    downloads: m.downloadCount,
    icon_url: m.logo?.thumbnailUrl || "",
    categories: m.categories?.map((c) => c.name) || [],
    type,
    // Needed for install
    _cfId: m.id,
    _cfLatestFileId: m.mainFileId || m.latestFiles?.[0]?.id
  }))
}

async function installFromCurseForge(serverUuid, nodeId, projectId, fileId, type = "plugin") {
  if (!hasCurseForge()) {
    throw Object.assign(new Error("CurseForge API key not configured"), { statusCode: 400 })
  }

  // 1. If no fileId provided, get latest file
  if (!fileId) {
    const filesRes = await axios.get(`${CURSEFORGE_API}/mods/${projectId}/files`, {
      headers: cfHeaders(),
      params: { pageSize: 10 },
      timeout: 10000
    })
    const files = filesRes.data?.data || []
    if (!files.length) {
      throw Object.assign(new Error("No files found for this project"), { statusCode: 404 })
    }
    fileId = files[0].id
  }

  // 2. Get download URL
  const fileRes = await axios.get(`${CURSEFORGE_API}/mods/${projectId}/files/${fileId}`, {
    headers: cfHeaders(),
    timeout: 10000
  })
  const fileData = fileRes.data?.data
  if (!fileData) {
    throw Object.assign(new Error("File not found"), { statusCode: 404 })
  }

  let downloadUrl = fileData.downloadUrl
  // Some mods don't expose downloadUrl — construct from CDN manually
  if (!downloadUrl) {
    const idStr = String(fileData.id)
    const part1 = idStr.substring(0, 4)
    const part2 = idStr.substring(4)
    downloadUrl = `https://edge.forgecdn.net/files/${part1}/${part2}/${fileData.fileName}`
  }

  // 3. Download
  const downloadRes = await axios.get(downloadUrl, { responseType: "arraybuffer", timeout: 120000 })

  // 4. Upload to correct directory
  const dir = type === "mod" ? "mods" : "plugins"
  try { await pteroManage.createDirectory(serverUuid, nodeId, "/", dir) } catch { /* exists */ }

  await pteroManage.uploadFile(serverUuid, nodeId, `/${dir}/${fileData.fileName}`, Buffer.from(downloadRes.data))

  return {
    success: true,
    source: "curseforge",
    name: fileData.displayName || fileData.fileName,
    filename: fileData.fileName,
    version: fileData.displayName || String(fileData.id),
    type
  }
}

/* ── Unified API ──────────────────────────────────────────────────────────── */

export const pluginInstaller = {
  /** Check if CurseForge is available */
  hasCurseForge,

  /**
   * Search for plugins/mods across one or both sources.
   * @param {string} query
   * @param {object} opts - { type: "plugin"|"mod", source: "modrinth"|"curseforge"|"all", limit }
   */
  async search(query, { type = "plugin", source = "all", limit = 15 } = {}) {
    const promises = []

    if (source === "modrinth" || source === "all") {
      promises.push(searchModrinth(query, type, limit).catch(() => []))
    }
    if ((source === "curseforge" || source === "all") && hasCurseForge()) {
      promises.push(searchCurseForge(query, type, limit).catch(() => []))
    }

    const arrays = await Promise.all(promises)
    return arrays.flat()
  },

  /**
   * Install a plugin/mod from the specified source.
   * @param {string} serverUuid
   * @param {number} nodeId
   * @param {object} opts - { source, slug, projectId, fileId, type }
   */
  async install(serverUuid, nodeId, { source, slug, projectId, fileId, type = "plugin" }) {
    if (source === "curseforge") {
      return installFromCurseForge(serverUuid, nodeId, projectId, fileId, type)
    }
    // Default: modrinth
    return installFromModrinth(serverUuid, nodeId, slug, type)
  },

  // Keep backwards-compat aliases
  searchPlugins: (query, limit) => searchModrinth(query, "plugin", limit),
  installPlugin: (serverUuid, nodeId, slug) => installFromModrinth(serverUuid, nodeId, slug, "plugin")
}
