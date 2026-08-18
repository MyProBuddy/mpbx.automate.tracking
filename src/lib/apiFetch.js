export function getSessionToken() {
  return localStorage.getItem('session_token') || ''
}

export function saveSessionToken(t) {
  if (t) localStorage.setItem('session_token', t)
}

export function clearSessionToken() {
  localStorage.removeItem('session_token')
}

export default async function apiFetch(url, opts = {}) {
  const token = getSessionToken()
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (res.status === 401) {
    clearSessionToken()
    localStorage.removeItem('wf_auth')
    window.location.href = '/login'
    return res
  }
  return res
}
