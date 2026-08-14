export function getSessionToken() {
  return localStorage.getItem('session_token') || ''
}

export function saveSessionToken(t) {
  if (t) localStorage.setItem('session_token', t)
}

export function clearSessionToken() {
  localStorage.removeItem('session_token')
}

export default function apiFetch(url, opts = {}) {
  const token = getSessionToken()
  return fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
