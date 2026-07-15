export async function pushTokenToStore(token) {
  try {
    await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
  } catch {}
}

export async function pullTokenFromStore() {
  try {
    const r = await fetch('/api/token')
    const { token } = await r.json()
    return token || null
  } catch { return null }
}
