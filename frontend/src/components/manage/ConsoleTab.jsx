import { useState, useEffect, useRef, useCallback } from "react"
import { io } from "socket.io-client"
import { getBackendBaseUrl } from "../../services/api.js"
import { Send, Wifi, WifiOff, Loader2 } from "lucide-react"

const MAX_LINES = 500

export default function ConsoleTab({ serverId }) {
  const [lines, setLines] = useState([])
  const [command, setCommand] = useState("")
  const [status, setStatus] = useState("connecting") // connecting | connected | offline | error
  const [stats, setStats] = useState(null)
  const [error, setError] = useState("")
  const scrollRef = useRef(null)
  const socketRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return

    const backendUrl = getBackendBaseUrl()
    console.log("[ConsoleTab] Connecting Socket.io to:", backendUrl)

    const socket = io(backendUrl, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000
    })
    socketRef.current = socket

    socket.on("connect", () => {
      console.log("[ConsoleTab] Socket.io connected, id:", socket.id)
      setStatus("connecting")
      setError("")
      socket.emit("console:join", { serverId: Number(serverId) })
    })

    socket.on("connect_error", (err) => {
      console.error("[ConsoleTab] Socket.io connect_error:", err.message)
      setError(`Connection failed: ${err.message}`)
      setStatus("error")
    })

    // Timeout if connection never establishes
    const connectTimeout = setTimeout(() => {
      if (!socket.connected) {
        console.error("[ConsoleTab] Connection timed out after 15s")
        setError("Console connection timed out. Check browser console (F12) for details.")
        setStatus("error")
      }
    }, 15000)

    socket.on("console:connected", () => {
      clearTimeout(connectTimeout)
      setStatus("connected")
      setError("")
    })

    socket.on("console:output", ({ line }) => {
      setLines((prev) => {
        const next = [...prev, line]
        return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next
      })
    })

    socket.on("console:status", ({ status: s }) => {
      setStatus(s === "running" ? "connected" : "offline")
    })

    socket.on("console:stats", (s) => setStats(s))

    socket.on("console:error", ({ message }) => {
      setError(message)
      setStatus("error")
    })

    socket.on("console:disconnected", () => {
      setStatus("offline")
    })

    socket.on("disconnect", () => {
      setStatus("offline")
    })

    return () => {
      clearTimeout(connectTimeout)
      socket.emit("console:leave")
      socket.disconnect()
    }
  }, [serverId])

  // Auto-scroll when new lines arrive
  useEffect(() => {
    scrollToBottom()
  }, [lines, scrollToBottom])

  const sendCommand = (e) => {
    e.preventDefault()
    if (!command.trim() || !socketRef.current) return
    socketRef.current.emit("console:command", { command: command.trim() })
    setCommand("")
    inputRef.current?.focus()
  }

  const statusColor = {
    connecting: "text-yellow-300",
    connected: "text-green-300",
    offline: "text-slate-500",
    error: "text-red-300"
  }

  const StatusIcon = status === "connected" ? Wifi : status === "connecting" ? Loader2 : WifiOff

  return (
    <div className="space-y-3">
      {/* ── Status / Stats bar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className={`flex items-center gap-1.5 font-semibold ${statusColor[status]}`}>
          <StatusIcon className={`h-3.5 w-3.5 ${status === "connecting" ? "animate-spin" : ""}`} />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {stats && (
          <>
            <span className="text-slate-500">
              RAM: <b className="text-slate-300">{Math.round((stats.memory_bytes || 0) / 1024 / 1024)}MB</b>
            </span>
            <span className="text-slate-500">
              CPU: <b className="text-slate-300">{(stats.cpu_absolute || 0).toFixed(1)}%</b>
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/20 border border-red-700/30 p-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* ── Console output ──────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="h-[400px] overflow-y-auto rounded-lg bg-[#0c0c0c] border border-slate-800/60 p-3 font-mono text-xs leading-relaxed text-slate-300 scroll-smooth"
      >
        {lines.length === 0 && status === "connected" && (
          <p className="text-slate-600 italic">Waiting for console output…</p>
        )}
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all hover:bg-slate-800/30">
            {line}
          </div>
        ))}
      </div>

      {/* ── Command input ───────────────────────────────────────────────── */}
      <form onSubmit={sendCommand} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-mono text-sm">&gt;</span>
          <input
            ref={inputRef}
            id="console-command"
            name="command"
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Type a command…"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-700/40 bg-ink-950 py-2 pl-8 pr-4 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:border-neon-500/50 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!command.trim()}
          className="rounded-lg border border-neon-400/40 bg-neon-500/15 px-4 py-2 text-sm font-semibold text-neon-200 transition hover:bg-neon-500/25 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
