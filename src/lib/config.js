let _config = null

export async function getConfig() {
  if (_config) return _config
  const res = await fetch('/api/supabase?action=config')
  if (!res.ok) throw new Error('Failed to load config')
  _config = await res.json()
  return _config
}
