export async function pushTokenToStore(token) {
  try {
    await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
  } catch {}
}

export async function pullTokenFromStore(forceRefresh = false) {
  try {
    const url = forceRefresh ? '/api/token?refresh=true' : '/api/token'
    const r = await fetch(url)
    const { token } = await r.json()
    return token || null
  } catch { return null }
}

export async function pushSessionToStore(role) {
  try {
    await fetch('/api/token?type=session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: role }),
    })
  } catch {}
}

export async function pullSessionFromStore() {
  try {
    const r = await fetch('/api/token?type=session')
    const { session } = await r.json()
    return session || null
  } catch { return null }
}

export async function clearSessionFromStore() {
  try {
    await fetch('/api/token?type=session', { method: 'DELETE' })
  } catch {}
}
