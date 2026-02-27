import axios from "axios"
import { env } from "./env.js"

const panelUrl = env.PTERODACTYL_URL.replace(/\/$/, "")

/**
 * Application API – admin operations (create/delete servers, manage users, etc.)
 * Uses the admin API key (PTLA_xxx) stored in PTERODACTYL_API_KEY.
 *
 * Server management (files, console, power) is handled by talking to Wings
 * directly via wingsClient.js — no Client API (PTLC_) key needed.
 */
export const appApi = axios.create({
  baseURL: `${panelUrl}/api/application`,
  headers: {
    Authorization: `Bearer ${env.PTERODACTYL_API_KEY}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  },
  timeout: 15000
})
