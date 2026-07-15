export async function pushTokenToStore(token) {
  try {
    const r = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await r.json()
    console.log('[tokenStore] push result:', data)
  } catch (e) {
    console.error('[tokenStore] push error:', e)
  }
}

export async function pullTokenFromStore() {
  try {
    console.log('[tokenStore] fetching /api/token ...')
    const r = await fetch('/api/token')
    console.log('[tokenStore] response status:', r.status)
    const text = await r.text()
    console.log('[tokenStore] response body:', text)
    const { token } = JSON.parse(text)
    console.log('[tokenStore] token found:', !!token)
    return token || null
  } catch (e) {
    console.error('[tokenStore] pull error:', e)
    return null
  }
}
