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

// Supported Modrinth project types
const PROJECT_TYPES = {
  plugin: { facet: "project_type:plugin", dir: "plugins", loaders: ["paper", "spigot", "purpur", "bukkit", "folia"] },
  mod: { facet: "project_type:mod", dir: "mods", loaders: ["forge", "fabric", "neoforge", "quilt"] },
  datapack: { facet: "project_type:datapack", dir: "world/datapacks", loaders: ["datapack"] },
  shader: { facet: "project_type:shader", dir: "shaderpacks", loaders: ["iris", "optifine", "canvas"] },
  resourcepack: { facet: "project_type:resourcepack", dir: "resourcepacks", loaders: ["minecraft"] },
  modpack: { facet: "project_type:modpack", dir: ".", loaders: ["forge", "fabric", "neoforge", "quilt"] }
}

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
  const projectType = PROJECT_TYPES[type] || PROJECT_TYPES.plugin
  const facets = [[projectType.facet]]

  const res = await axios.get(`${MODRINTH_API}/search`, {
    params: { query, limit, facets: JSON.stringify(facets), index: "relevance" },
    timeout: 10000
  })

  return res.data.hits.map((p) => ({
    source: "modrinth",
    id: p.slug,
    slug: p.slug,
    project_id: p.project_id,
    title: p.title,
    description: p.description,
    downloads: p.downloads,
    icon_url: p.icon_url,
    categories: p.categories,
    author: p.author,
    latest_version: p.latest_version,
    date_created: p.date_created,
    date_modified: p.date_modified,
    project_type: p.project_type,
    type
  }))
}

async function getModrinthVersions(slug) {
  const res = await axios.get(`${MODRINTH_API}/project/${slug}/version`, { timeout: 10000 })
  return res.data.map((v) => ({
    id: v.id,
    version_number: v.version_number,
    version_type: v.version_type, // release, beta, alpha
    name: v.name,
    changelog: v.changelog,
    date_published: v.date_published,
    downloads: v.downloads,
    game_versions: v.game_versions,
    loaders: v.loaders,
    files: v.files.map((f) => ({
      url: f.url,
      filename: f.filename,
      primary: f.primary,
      size: f.size,
      file_type: f.file_type
    })),
    dependencies: v.dependencies
  }))
}

async function installFromModrinth(serverUuid, nodeId, slug, type = "plugin", versionId = null) {
  // 1. Fetch available versions
  const versionsRes = await axios.get(`${MODRINTH_API}/project/${slug}/version`, { timeout: 10000 })
  const versions = versionsRes.data
  if (!versions.length) {
    throw Object.assign(new Error("No versions found for this project"), { statusCode: 404 })
  }

  // If specific version requested, use it; otherwise pick best compatible
  let target
  if (versionId) {
    target = versions.find((v) => v.id === versionId)
    if (!target) {
      throw Object.assign(new Error("Specified version not found"), { statusCode: 404 })
    }
  } else {
    // Prefer compatible loaders based on type
    const projectType = PROJECT_TYPES[type] || PROJECT_TYPES.plugin
    const loaders = projectType.loaders
    target =
      versions.find((v) => v.loaders?.some((l) => loaders.includes(l.toLowerCase()))) ||
      versions[0]
  }

  // Find the primary file (support .jar and .zip for datapacks/resourcepacks)
  const primaryFile =
    target.files?.find((f) => f.primary) ||
    target.files?.find((f) => f.filename.endsWith(".jar") || f.filename.endsWith(".zip")) ||
    target.files?.[0]

  if (!primaryFile) {
    throw Object.assign(new Error("No downloadable file found in this version"), { statusCode: 404 })
  }

  // 2. Download the file
  const downloadRes = await axios.get(primaryFile.url, { responseType: "arraybuffer", timeout: 120000 })

  // 3. Upload to correct directory based on project type
  const projectType = PROJECT_TYPES[type] || PROJECT_TYPES.plugin
  const dir = projectType.dir
  
  // Create directory structure if needed
  const dirParts = dir.split("/").filter(Boolean)
  let currentPath = "/"
  for (const part of dirParts) {
    try { await pteroManage.createDirectory(serverUuid, nodeId, currentPath, part) } catch { /* exists */ }
    currentPath += part + "/"
  }

  await pteroManage.uploadFile(serverUuid, nodeId, `/${dir}/${primaryFile.filename}`, Buffer.from(downloadRes.data))

  return {
    success: true,
    source: "modrinth",
    name: slug,
    filename: primaryFile.filename,
    version: target.version_number,
    version_id: target.id,
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
   * Search for plugins/mods/datapacks/etc across one or both sources.
   * @param {string} query
   * @param {object} opts - { type: "plugin"|"mod"|"datapack"|"shader"|"resourcepack"|"modpack", source: "modrinth"|"curseforge"|"all", limit }
   */
  async search(query, { type = "plugin", source = "all", limit = 15 } = {}) {
    const promises = []

    if (source === "modrinth" || source === "all") {
      promises.push(searchModrinth(query, type, limit).catch(() => []))
    }
    // CurseForge only supports plugins and mods
    if ((source === "curseforge" || source === "all") && hasCurseForge() && ["plugin", "mod"].includes(type)) {
      promises.push(searchCurseForge(query, type, limit).catch(() => []))
    }

    const arrays = await Promise.all(promises)
    return arrays.flat()
  },

  /**
   * Get all versions for a Modrinth project.
   * @param {string} slug - Project slug or ID
   */
  async getVersions(slug) {
    return getModrinthVersions(slug)
  },

  /**
   * Install a plugin/mod/datapack/etc from the specified source.
   * @param {string} serverUuid
   * @param {number} nodeId
   * @param {object} opts - { source, slug, projectId, fileId, versionId, type }
   */
  async install(serverUuid, nodeId, { source, slug, projectId, fileId, versionId, type = "plugin" }) {
    if (source === "curseforge") {
      return installFromCurseForge(serverUuid, nodeId, projectId, fileId, type)
    }
    // Default: modrinth
    return installFromModrinth(serverUuid, nodeId, slug, type, versionId)
  },

  // Keep backwards-compat aliases
  searchPlugins: (query, limit) => searchModrinth(query, "plugin", limit),
  installPlugin: (serverUuid, nodeId, slug) => installFromModrinth(serverUuid, nodeId, slug, "plugin")
}
