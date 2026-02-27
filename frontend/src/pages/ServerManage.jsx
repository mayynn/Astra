import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft, Terminal, FolderOpen, FileText, Globe,
  Puzzle, GitBranch, Settings, Users, Play, Square,
  RotateCcw, Skull, Loader2, ShieldCheck, Archive
} from "lucide-react"
import SectionHeader from "../components/SectionHeader.jsx"
import ConsoleTab from "../components/manage/ConsoleTab.jsx"
import FilesTab from "../components/manage/FilesTab.jsx"
import PropertiesTab from "../components/manage/PropertiesTab.jsx"
import WorldTab from "../components/manage/WorldTab.jsx"
import PluginsTab from "../components/manage/PluginsTab.jsx"
import VersionTab from "../components/manage/VersionTab.jsx"
import SettingsTab from "../components/manage/SettingsTab.jsx"
import PlayersTab from "../components/manage/PlayersTab.jsx"
import BackupsTab from "../components/manage/BackupsTab.jsx"
import { api } from "../services/api.js"

const tabs = [
  { id: "console",    label: "Console",    icon: Terminal },
  { id: "files",      label: "Files",      icon: FolderOpen },
  { id: "properties", label: "Properties", icon: FileText },
  { id: "world",      label: "World",      icon: Globe },
  { id: "plugins",    label: "Plugins",    icon: Puzzle },
  { id: "version",    label: "Version",    icon: GitBranch },
  { id: "backups",    label: "Backups",    icon: Archive },
  { id: "settings",   label: "Settings",   icon: Settings },
  { id: "players",    label: "Players",    icon: Users },
]

export default function ServerManage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [serverInfo, setServerInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("console")
  const [powerLoading, setPowerLoading] = useState("")
  const [eulaLoading, setEulaLoading] = useState(false)
  const [eulaAccepted, setEulaAccepted] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { navigate("/login"); return }

    api.getServerManage(token, id)
      .then((data) => setServerInfo(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handlePower = async (signal) => {
    setPowerLoading(signal)
    try {
      const token = localStorage.getItem("token")
      await api.serverPower(token, id, signal)
    } catch (err) {
      setError(err.message)
    } finally {
      setPowerLoading("")
    }
  }

  const handleAcceptEula = async () => {
    setEulaLoading(true)
    try {
      const token = localStorage.getItem("token")
      await api.serverAcceptEula(token, id)
      setEulaAccepted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setEulaLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error && !serverInfo) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/servers")} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to Servers
        </button>
        <div className="rounded-xl border border-red-700/30 bg-red-900/20 p-6 text-red-300">
          {error}
        </div>
      </div>
    )
  }

  const srv = serverInfo?.server
  const res = serverInfo?.resources
  const defaultAlloc = srv?.allocations?.find((a) => a.is_default) || srv?.allocations?.[0]

  const powerBtns = [
    { signal: "start",   icon: Play,      label: "Start",   cls: "text-green-300 border-green-700/40 bg-green-900/20 hover:bg-green-900/30" },
    { signal: "stop",    icon: Square,     label: "Stop",    cls: "text-orange-300 border-orange-700/40 bg-orange-900/20 hover:bg-orange-900/30" },
    { signal: "restart", icon: RotateCcw,  label: "Restart", cls: "text-blue-300 border-blue-700/40 bg-blue-900/20 hover:bg-blue-900/30" },
    { signal: "kill",    icon: Skull,      label: "Kill",    cls: "text-red-300 border-red-700/40 bg-red-900/20 hover:bg-red-900/30" },
  ]

  const tabContent = {
    console:    <ConsoleTab serverId={id} />,
    files:      <FilesTab serverId={id} />,
    properties: <PropertiesTab serverId={id} />,
    world:      <WorldTab serverId={id} />,
    plugins:    <PluginsTab serverId={id} />,
    version:    <VersionTab serverId={id} />,
    backups:    <BackupsTab serverId={id} />,
    settings:   <SettingsTab serverId={id} />,
    players:    <PlayersTab serverId={id} />,
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/servers")}
            className="rounded-lg border border-slate-700/40 p-2 text-slate-400 hover:text-slate-200 hover:border-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-100">{srv?.name}</h1>
            <p className="text-xs text-slate-500">
              {defaultAlloc ? `${defaultAlloc.ip}:${defaultAlloc.port}` : "No allocation"}{" "}
              · Node {srv?.node}
            </p>
          </div>
        </div>

        {/* Power buttons */}
        <div className="flex flex-wrap gap-2">
          {powerBtns.map((b) => {
            const Icon = b.icon
            const isLoading = powerLoading === b.signal
            return (
              <button
                key={b.signal}
                onClick={() => handlePower(b.signal)}
                disabled={!!powerLoading}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${b.cls}`}
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                {b.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Resource bar ────────────────────────────────────────────────── */}
      {res && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-slate-800/60 bg-ink-900/70 px-4 py-3 text-xs text-slate-400">
          <span>
            Status: <b className={res.current_state === "running" ? "text-green-300" : "text-orange-300"}>
              {res.current_state || "unknown"}
            </b>
          </span>
          <span>RAM: <b className="text-slate-200">{Math.round((res.resources?.memory_bytes || 0) / 1024 / 1024)}MB / {srv?.limits?.memory}MB</b></span>
          <span>CPU: <b className="text-slate-200">{(res.resources?.cpu_absolute || 0).toFixed(1)}%</b></span>
          <span>Disk: <b className="text-slate-200">{Math.round((res.resources?.disk_bytes || 0) / 1024 / 1024)}MB / {srv?.limits?.disk}MB</b></span>
        </div>
      )}

      {/* ── EULA Banner ───────────────────────────────────────────────── */}
      {!eulaAccepted && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow-700/30 bg-yellow-900/15 px-4 py-3 text-sm text-yellow-200">
          <span>
            <b>Minecraft EULA:</b> You must accept the{" "}
            <a href="https://www.minecraft.net/eula" target="_blank" rel="noreferrer" className="underline hover:text-yellow-100">
              Minecraft EULA
            </a>{" "}
            for the server to start. Clicking "Start" will auto-accept it.
          </span>
          <button
            onClick={handleAcceptEula}
            disabled={eulaLoading}
            className="flex items-center gap-1.5 rounded-lg border border-yellow-600/40 bg-yellow-900/30 px-3 py-1.5 text-xs font-semibold text-yellow-200 hover:bg-yellow-900/50 transition disabled:opacity-50"
          >
            {eulaLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Accept EULA
          </button>
        </div>
      )}
      {eulaAccepted && (
        <div className="rounded-xl border border-green-700/30 bg-green-900/15 px-4 py-2 text-xs text-green-300 font-semibold">
          ✓ EULA accepted — you can now start the server.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/20 border border-red-700/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── Tab navigation ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800/60 bg-ink-900/70 p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-neon-500/15 text-neon-200 border border-neon-400/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800/60 bg-ink-900/70 p-6">
        {tabContent[activeTab]}
      </div>
    </div>
  )
}
