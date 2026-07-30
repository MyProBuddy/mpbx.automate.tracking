export async function fetchDbStats() {
  const res = await fetch('/api/db-stats')
  if (!res.ok) return { firms: null, investors: null }
  return res.json()
}
