import WebSocket from "ws"
import { pteroManage } from "./pteroManage.js"
import { createWingsToken } from "../config/wingsClient.js"
import { getOne } from "../config/db.js"
import { env } from "../config/env.js"

/** socketId → { ws, uuid, nodeId, pteroServerId } */
const activeSessions = new Map()

/**
 * Attach console-proxy event handlers to the existing Socket.io server.
 * Called once from initSocket after io is ready.
 */
export function setupConsoleProxy(io) {
  io.on("connection", (socket) => {
    console.log(`[ConsoleProxy] New socket ${socket.id}, authenticated=${socket.data.authenticated}`)
    
    // Console features require an authenticated socket
    if (!socket.data.authenticated) return

    /* ── Join a server's console ───────────────────────────────────────── */
    socket.on("console:join", async ({ serverId }) => {
      console.log(`[ConsoleProxy] console:join received for serverId=${serverId} from socket ${socket.id}`)
      try {
        // Verify the authenticated user owns this server
        const server = await getOne(
          "SELECT pterodactyl_server_id FROM servers WHERE id = ? AND user_id = ? AND status != 'deleted'",
          [serverId, socket.data.user.sub]
        )
        if (!server) {
          socket.emit("console:error", { message: "Server not found or access denied" })
          return
        }

        // Tear down any previous session on this socket
        cleanupSession(socket.id)

        // Resolve uuid + node from the Application API
        const details = await pteroManage.getServerDetails(server.pterodactyl_server_id)
        const { uuid, node: nodeId } = details

        // Generate a Wings JWT and get the WebSocket URL
        const creds = await createWingsToken(nodeId, uuid)

        console.log("[ConsoleProxy] Connecting to Wings WS:", creds.socket)

        // Connect directly to Wings WebSocket
        // The Authorization header is required for Wings' API auth middleware
        const pteroWs = new WebSocket(creds.socket, {
          headers: {
            Authorization: `Bearer ${creds.bearerToken}`,
            Origin: env.PTERODACTYL_URL || ""
          },
          rejectUnauthorized: false, // Wings may use self-signed certs
          handshakeTimeout: 10000
        })

        activeSessions.set(socket.id, {
          ws: pteroWs,
          uuid,
          nodeId,
          pteroServerId: server.pterodactyl_server_id
        })

        pteroWs.on("open", () => {
          console.log("[ConsoleProxy] WS opened, sending auth token")
          pteroWs.send(JSON.stringify({ event: "auth", args: [creds.token] }))
        })

        pteroWs.on("message", (raw) => {
          try {
            const msg = JSON.parse(raw.toString())
            switch (msg.event) {
              case "auth success":
                console.log("[ConsoleProxy] Wings auth success for", uuid)
                socket.emit("console:connected")
                break
              case "console output":
                socket.emit("console:output", { line: msg.args?.[0] ?? "" })
                break
              case "status":
                socket.emit("console:status", { status: msg.args?.[0] ?? "" })
                break
              case "stats":
                try {
                  socket.emit("console:stats", JSON.parse(msg.args?.[0] ?? "{}"))
                } catch {
                  /* ignore bad JSON */
                }
                break
              case "token expiring":
              case "token expired":
                console.log("[ConsoleProxy] Token expiring, refreshing for", uuid)
                refreshToken(socket, uuid, nodeId)
                break
              case "jwt error":
                console.error("[ConsoleProxy] JWT auth rejected by Wings:", msg.args?.[0])
                socket.emit("console:error", { message: "Authentication rejected by server daemon" })
                cleanupSession(socket.id)
                break
              default:
                break
            }
          } catch {
            /* ignore unparseable frames */
          }
        })

        pteroWs.on("close", (code, reason) => {
          console.log("[ConsoleProxy] WS closed:", code, reason?.toString())
          socket.emit("console:disconnected")
          activeSessions.delete(socket.id)
        })

        pteroWs.on("error", (err) => {
          console.error("[ConsoleProxy] WS error:", err.message)
          socket.emit("console:error", { message: "Console connection lost" })
          cleanupSession(socket.id)
        })

        pteroWs.on("unexpected-response", (req, res) => {
          let body = ""
          res.on("data", (chunk) => { body += chunk })
          res.on("end", () => {
            console.error(`[ConsoleProxy] WS upgrade rejected: ${res.statusCode} ${res.statusMessage}`, body.substring(0, 200))
            socket.emit("console:error", {
              message: `Daemon rejected connection (${res.statusCode}). Check Wings configuration.`
            })
            cleanupSession(socket.id)
          })
        })
      } catch (err) {
        console.error("[ConsoleProxy] join error:", err.message)
        socket.emit("console:error", { message: err.message || "Failed to connect" })
      }
    })

    /* ── Send a command ────────────────────────────────────────────────── */
    socket.on("console:command", ({ command }) => {
      const s = activeSessions.get(socket.id)
      if (!s?.ws || s.ws.readyState !== WebSocket.OPEN) {
        socket.emit("console:error", { message: "Console not connected" })
        return
      }
      s.ws.send(JSON.stringify({ event: "send command", args: [command] }))
    })

    /* ── Power signal via WS ───────────────────────────────────────────── */
    socket.on("console:power", ({ signal }) => {
      const s = activeSessions.get(socket.id)
      if (!s?.ws || s.ws.readyState !== WebSocket.OPEN) {
        socket.emit("console:error", { message: "Console not connected" })
        return
      }
      s.ws.send(JSON.stringify({ event: "set state", args: [signal] }))
    })

    /* ── Leave / disconnect ────────────────────────────────────────────── */
    socket.on("console:leave", () => cleanupSession(socket.id))
    socket.on("disconnect", () => cleanupSession(socket.id))
  })

  console.log("[ConsoleProxy] ✓ Console proxy initialized")
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

async function refreshToken(socket, uuid, nodeId) {
  try {
    const { token } = await createWingsToken(nodeId, uuid)
    const s = activeSessions.get(socket.id)
    if (s?.ws?.readyState === WebSocket.OPEN) {
      s.ws.send(JSON.stringify({ event: "auth", args: [token] }))
    }
  } catch (err) {
    console.error("[ConsoleProxy] token refresh failed:", err.message)
  }
}

function cleanupSession(socketId) {
  const s = activeSessions.get(socketId)
  if (s?.ws) {
    try {
      s.ws.close()
    } catch {
      /* already closed */
    }
  }
  activeSessions.delete(socketId)
}
