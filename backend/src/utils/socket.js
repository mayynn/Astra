/**
 * Socket.io singleton — import `io` anywhere in routes to emit real-time events
 */
import { Server } from "socket.io"

let io = null

export function initSocket(httpServer, corsOrigin) {
  // corsOrigin can be true (allow all), an array, or a function
  const originValue = corsOrigin === true ? "*" : corsOrigin

  io = new Server(httpServer, {
    cors: {
      origin: originValue,
      credentials: originValue !== "*",
      methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"]
  })

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)
    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`)
    })
  })

  console.log("[Socket] ✓ Socket.io initialized")
  return io
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized — call initSocket first")
  return io
}
