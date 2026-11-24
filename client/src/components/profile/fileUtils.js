const TYPE_GROUPS = [
  { kind: "image", label: "Image", color: "#34d399", exts: ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp", "ico", "heic"] },
  { kind: "video", label: "Video", color: "#f87171", exts: ["mp4", "mov", "avi", "webm", "mkv", "m4v"] },
  { kind: "audio", label: "Audio", color: "#fbbf24", exts: ["mp3", "wav", "ogg", "flac", "m4a", "aac"] },
  { kind: "pdf", label: "PDF", color: "#fb7185", exts: ["pdf"] },
  { kind: "archive", label: "Archive", color: "#a78bfa", exts: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"] },
  { kind: "code", label: "Code", color: "#60a5fa", exts: ["js", "ts", "jsx", "tsx", "py", "go", "java", "cpp", "c", "h", "rb", "rs", "php", "cs", "html", "css", "json", "yml", "yaml", "sh"] },
  { kind: "doc", label: "Document", color: "#38bdf8", exts: ["doc", "docx", "txt", "md", "rtf", "odt", "csv", "xls", "xlsx", "ppt", "pptx"] },
]

export function fileExtension(name = "") {
  const parts = String(name).split(".")
  return parts.length > 1 ? parts.pop().toLowerCase() : ""
}

export function fileType(name) {
  const ext = fileExtension(name)
  const group = TYPE_GROUPS.find((g) => g.exts.includes(ext))
  return group
    ? { ...group, ext }
    : { kind: "file", label: ext ? ext.toUpperCase() : "File", color: "#9199a8", ext }
}

export function formatBytes(bytes) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

export function sizeInBytes(file) {
  if (file.sizeBytes) return file.sizeBytes
  const match = /^([\d.]+)\s*(bytes|B|KB|MB|GB)$/i.exec(String(file.size || "").trim())
  if (!match) return 0
  const unit = match[2].toUpperCase()
  const factor = unit === "KB" ? 1024 : unit === "MB" ? 1024 ** 2 : unit === "GB" ? 1024 ** 3 : 1
  return Math.round(parseFloat(match[1]) * factor)
}

const rtf = typeof Intl !== "undefined" && Intl.RelativeTimeFormat
  ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
  : null

export function relativeTime(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ""
  const seconds = Math.round((d.getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (!rtf) return d.toLocaleDateString()
  if (abs < 60) return "just now"
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute")
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour")
  if (abs < 86400 * 7) return rtf.format(Math.round(seconds / 86400), "day")
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" })
}

export function fullDate(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export const SORTS = {
  newest: { label: "Newest first", compare: (a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt) },
  oldest: { label: "Oldest first", compare: (a, b) => new Date(a.CreatedAt) - new Date(b.CreatedAt) },
  name: { label: "Name", compare: (a, b) => String(a.Filename).localeCompare(String(b.Filename), undefined, { numeric: true, sensitivity: "base" }) },
  largest: { label: "Largest first", compare: (a, b) => sizeInBytes(b) - sizeInBytes(a) },
  views: { label: "Most viewed", compare: (a, b) => (b.views || 0) - (a.views || 0) },
}

export function readPref(key, fallback, allowed) {
  try {
    const value = localStorage.getItem(`sf.${key}`)
    return value && (!allowed || allowed.includes(value)) ? value : fallback
  } catch {
    return fallback
  }
}

export function writePref(key, value) {
  try {
    localStorage.setItem(`sf.${key}`, value)
  } catch {}
}
