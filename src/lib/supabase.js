export async function fetchDbStats() {
  try {
    const res = await fetch('/api/db-stats')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
