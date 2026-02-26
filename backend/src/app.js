import express from "express"
import helmet from "helmet"
import morgan from "morgan"
import cors from "cors"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { env } from "./config/env.js"
import { rateLimiter } from "./middlewares/rateLimit.js"
import { errorHandler } from "./middlewares/errorHandler.js"
import routes from "./routes/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

// Trust exactly 1 proxy hop (nginx in production, Codespaces forwarder in dev).
// Using `true` is rejected by express-rate-limit as it allows IP spoofing.
app.set("trust proxy", 1)

// CORS Configuration
console.log(`[CORS INIT] NODE_ENV="${env.NODE_ENV}" FRONTEND_URL="${env.FRONTEND_URL}"`)

const corsOptions = {
  origin: function (origin, callback) {
    console.log(`[CORS] ← origin="${origin}" NODE_ENV="${env.NODE_ENV}" FRONTEND_URL="${env.FRONTEND_URL}"`)

    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) {
      console.log("[CORS] ✓ no-origin request allowed")
      return callback(null, true)
    }

    // Always allow GitHub Codespaces origins
    if (origin.endsWith(".app.github.dev")) {
      console.log("[CORS] ✓ Codespaces origin allowed")
      return callback(null, true)
    }

    // Always allow in non-production or when FRONTEND_URL is localhost
    if (env.NODE_ENV !== "production" || env.FRONTEND_URL.includes("localhost")) {
      console.log("[CORS] ✓ non-production / localhost allowed")
      return callback(null, true)
    }

    // Production: check against FRONTEND_URL (support multiple comma-separated)
    const allowedOrigins = env.FRONTEND_URL.split(",").map((u) => u.trim())
    if (allowedOrigins.includes(origin)) {
      console.log("[CORS] ✓ matched FRONTEND_URL allowed")
      return callback(null, true)
    }

    console.log(`[CORS] ✗ BLOCKED — origin="${origin}" not in allowedOrigins=${JSON.stringify(allowedOrigins)}`)
    callback(new Error("CORS not allowed"))
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Length", "X-JSON-Response"],
  optionsSuccessStatus: 200,
  maxAge: 86400,
  preflightContinue: false
}

app.use(cors(corsOptions))

// Helmet configuration with Adsterra CSP support
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === "development" ? false : {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://www.highperformanceformat.com",
        "https://pl28770653.effectivegatecpm.com",
        "https://pl28771198.effectivegatecpm.com",
        "https://environmenttalentrabble.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(express.json({ limit: "2mb" }))
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"))
app.use(rateLimiter)

// Serve uploaded assets statically (favicons/backgrounds/tickets)
const uploadsPath = join(__dirname, "../public/uploads")
app.use("/uploads", express.static(uploadsPath))
console.log("[Server] Serving static files from:", uploadsPath)

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "astranodes-api" })
})

app.use("/api", routes)

app.use(errorHandler)

export default app
