import { useAppUI } from "../context/AppUIContext.jsx"
import { getBackendBaseUrl } from "../services/api.js"

export default function Logo({ size = "md" }) {
  const sizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl"
  }
  const { siteSettings } = useAppUI()
  const name = siteSettings?.siteName || "AstraNodes"
  const logoPath = siteSettings?.logoPath
  const logoUrl = logoPath ? `${getBackendBaseUrl()}${logoPath}` : null
  const letter = name.charAt(0).toUpperCase()

  // Two-tone: split at last space, or halve when single word
  let first = name, last = ""
  const spaceIdx = name.lastIndexOf(" ")
  if (spaceIdx > 0) {
    first = name.slice(0, spaceIdx)
    last = name.slice(spaceIdx + 1)
  } else if (name.length > 4) {
    const half = Math.ceil(name.length / 2)
    first = name.slice(0, half)
    last = name.slice(half)
  }

  return (
    <div className="flex items-center gap-2">
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="h-9 w-9 rounded-xl object-contain" />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-800 text-neon-400 shadow-glow font-bold">
          {letter}
        </span>
      )}
      <div className={`font-semibold tracking-wide ${sizes[size] || sizes.md}`}>
        {first}<span className="text-neon-400">{last}</span>
      </div>
    </div>
  )
}
