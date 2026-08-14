import apiFetch from './apiFetch.js'

export async function fetchDbStats() {
  try {
    const res = await apiFetch('/api/db-stats')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
