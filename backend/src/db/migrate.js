import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { getOne, runSync } from "../config/db.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const sqlPath = path.join(__dirname, "init.sql")

const DEFAULT_SITE_CONTENT = [
  {
    section_name: "hero",
    content_json: JSON.stringify({
      title: "Hosting crafted for Minecraft empires.",
      subtitle: "Launch servers in seconds, keep renewals automatic, and protect revenue with enterprise-grade abuse prevention. Built on Pterodactyl with a modern finance engine.",
      primaryButtonText: "Launch Dashboard",
      primaryButtonLink: "/register",
      secondaryButtonText: "View Plans",
      secondaryButtonLink: "/plans",
      backgroundImage: ""
    })
  },
  {
    section_name: "features",
    content_json: JSON.stringify([
      { title: "Automated Renewal", description: "Coins or balance renewals execute automatically with 12h grace protection.", icon: "Zap" },
      { title: "Anti-Abuse Core", description: "IP-based coupon protection, flagging, and rate-limited endpoints.", icon: "ShieldCheck" },
      { title: "Coin Economy", description: "AFK earning, coin plans, and live usage insights in one dashboard.", icon: "Coins" },
      { title: "Pterodactyl Ready", description: "Server lifecycle actions handled securely via Admin API.", icon: "Server" }
    ])
  },
  {
    section_name: "about",
    content_json: JSON.stringify({
      heading: "Ready for production-grade hosting?",
      description: "Spin up a secure dashboard and keep every server in compliance."
    })
  },
  {
    section_name: "stats",
    content_json: JSON.stringify({
      activeServers: "500+",
      totalUsers: "1,200+",
      uptime: "99.9%"
    })
  },
  {
    section_name: "footer",
    content_json: JSON.stringify({
      text: "© 2026 AstraNodes. All rights reserved.",
      links: ["Privacy", "Terms", "Status"]
    })
  }
]

export default async function migrate() {
  try {
    console.log("[Migration] Reading init.sql from:", sqlPath)
    const sql = fs.readFileSync(sqlPath, "utf-8")
    console.log("[Migration] Executing SQL statements...")

    // Execute all SQL statements
    const statements = sql.split(";")
    let executedCount = 0
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          await runSync(stmt)
          executedCount++
        } catch (error) {
          console.warn("[Migration] Statement error (may be expected):", error.message)
        }
      }
    }
    
    console.log(`[Migration] Executed ${executedCount} SQL statements`)

    // Ensure coin_settings exists
    console.log("[Migration] Checking coin_settings...")
    const existing = await getOne("SELECT id FROM coin_settings WHERE id = 1 LIMIT 1").catch(
      () => null
    )

    if (!existing) {
      console.log("[Migration] Creating default coin_settings...")
      await runSync("INSERT INTO coin_settings (id, coins_per_minute) VALUES (1, 1)", [])
    } else {
      console.log("[Migration] coin_settings already exists")
    }

    // Add name column to servers if not present (fresh installs have it via init.sql)
    try {
      await runSync("ALTER TABLE servers ADD COLUMN name TEXT NOT NULL DEFAULT ''")
      console.log("[Migration] ✓ Added name column to servers")
    } catch {
      // Column already exists — safe to ignore
    }

    // Add location column to servers if not present
    try {
      await runSync("ALTER TABLE servers ADD COLUMN location TEXT DEFAULT ''")
      console.log("[Migration] ✓ Added location column to servers")
    } catch {
      // Column already exists — safe to ignore
    }

    // Add software column to servers if not present
    try {
      await runSync("ALTER TABLE servers ADD COLUMN software TEXT NOT NULL DEFAULT 'minecraft'")
      console.log("[Migration] ✓ Added software column to servers")
    } catch {
      // Column already exists — safe to ignore
    }

    // Add egg_id column to servers if not present
    try {
      await runSync("ALTER TABLE servers ADD COLUMN egg_id INTEGER")
      console.log("[Migration] ✓ Added egg_id column to servers")
    } catch {
      // Column already exists — safe to ignore
    }

    // Seed default site_content sections
    console.log("[Migration] Seeding default site_content...")
    for (const section of DEFAULT_SITE_CONTENT) {
      const exists = await getOne("SELECT id FROM site_content WHERE section_name = ?", [section.section_name]).catch(() => null)
      if (!exists) {
        await runSync(
          "INSERT INTO site_content (section_name, content_json) VALUES (?, ?)",
          [section.section_name, section.content_json]
        ).catch((e) => console.warn("[Migration] site_content seed warn:", e.message))
        console.log(`[Migration] ✓ Seeded site_content: ${section.section_name}`)
      }
    }

    // Seed default site_settings singleton row
    console.log("[Migration] Seeding default site_settings...")
    const existingSettings = await getOne("SELECT id FROM site_settings ORDER BY id ASC LIMIT 1").catch(() => null)
    if (!existingSettings) {
      await runSync(
        `INSERT INTO site_settings (
          site_name,
          background_image,
          background_overlay_opacity,
          favicon_path,
          hero_title,
          hero_subtitle,
          maintenance_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          "AstraNodes",
          "",
          0.45,
          "",
          "Hosting crafted for Minecraft empires.",
          "Launch servers in seconds with premium infrastructure.",
          0
        ]
      ).catch((e) => console.warn("[Migration] site_settings seed warn:", e.message))
      console.log("[Migration] ✓ Seeded site_settings")
    }

    console.log("[Migration] ✓ Database migrated successfully")
  } catch (error) {
    console.error("[Migration] ✗ Critical error:", error)
    throw error
  }
}

// Self-invoke only when run directly (not when imported by server.js)
// __filename is already a resolved path (set above), so compare directly
if (process.argv[1] === __filename) {
  migrate().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
