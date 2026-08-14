import crypto from 'crypto'
import { signSession, rateLimit, setCors } from './_lib.js'

// ── token helpers ──────────────────────────────────────────────────────────────
const GIST_ID  = process.env.GIST_ID
const GH_TOKEN = process.env.GITHUB_TOKEN
const ENC_KEY  = process.env.ENCRYPT_KEY
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const FILES = { token: 'token.enc', session: 'session.enc', refresh: 'refresh.enc' }
const ghHeaders = { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' }

function getKey() {
  if (!ENC_KEY) return Buffer.alloc(32)
  return Buffer.from(ENC_KEY.padEnd(32).slice(0, 32))
}
function encrypt(text) {
  const key = getKey(), iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64')
}
function decrypt(b64) {
  const buf = Buffer.from(b64, 'base64')
  const key = getKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, buf.slice(0, 12))
  decipher.setAuthTag(buf.slice(12, 28))
  return Buffer.concat([decipher.update(buf.slice(28)), decipher.final()]).toString('utf8')
}
async function gistGet(file) {
  if (!GIST_ID || !GH_TOKEN) return null
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers: ghHeaders })
  return (await r.json())?.files?.[file]?.content || null
}
async function gistSet(file, content) {
  if (!GIST_ID || !GH_TOKEN) return
  await fetch(`https://api.github.com/gists/${GIST_ID}`, { method: 'PATCH', headers: ghHeaders, body: JSON.stringify({ files: { [file]: { content } } }) })
}
async function getAccessTokenFromRefreshToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  if (!res.ok) throw new Error(`Failed to refresh token: ${await res.text()}`)
  return (await res.json()).access_token
}

export default async function handler(req, res) {
  setCors(res, 'GET, POST, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // ── Route: login (?action=login or default POST without action) ───────────
  if (!req.query.action || req.query.action === 'login') {
    if (req.method !== 'POST') return res.status(405).end()
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown'
    if (rateLimit(ip, 10, 15 * 60 * 1000)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'missing credentials' })
    if (email === process.env.SA_EMAIL && password === process.env.SA_PASSWORD) {
      const sessionToken = signSession({ role: 'superadmin', exp: Date.now() + 24 * 60 * 60 * 1000 })
      return res.json({ role: 'superadmin', sessionToken })
    }
    return res.status(401).json({ role: null })
  }

  // ── Route: token (?action=token) ─────────────────────────────────────────
  if (req.query.action === 'token') {
    const type = req.query?.type === 'session' ? 'session' : 'token'
    if (type === 'session') return res.status(400).json({ error: 'Session syncing is disabled' })
    const file = FILES[type]

    if (req.method === 'GET') {
      try {
        if (type === 'token' && req.query?.refresh === 'true') {
          const encRefresh = await gistGet(FILES.refresh)
          if (encRefresh) {
            const newAccessToken = await getAccessTokenFromRefreshToken(decrypt(encRefresh))
            if (newAccessToken) { await gistSet(FILES.token, encrypt(newAccessToken)); return res.json({ token: newAccessToken }) }
          }
        }
        const enc = await gistGet(file)
        if (!enc) {
          if (type === 'token') {
            const encRefresh = await gistGet(FILES.refresh)
            if (encRefresh) {
              const newAccessToken = await getAccessTokenFromRefreshToken(decrypt(encRefresh))
              if (newAccessToken) { await gistSet(FILES.token, encrypt(newAccessToken)); return res.json({ token: newAccessToken }) }
            }
          }
          return res.json({ [type]: null })
        }
        try { return res.json({ [type]: decrypt(enc) }) } catch { return res.json({ [type]: null }) }
      } catch { return res.json({ [type]: null }) }
    }

    if (req.method === 'POST') {
      try {
        if (type === 'token' && req.body?.code) {
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ code: req.body.code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: 'postmessage', grant_type: 'authorization_code' }),
          })
          if (!response.ok) return res.status(response.status).json({ error: await response.text() })
          const data = await response.json()
          if (data.access_token) await gistSet(FILES.token, encrypt(data.access_token))
          if (data.refresh_token) await gistSet(FILES.refresh, encrypt(data.refresh_token))
          return res.json({ token: data.access_token, refresh_token: data.refresh_token })
        }
        const value = req.body?.[type]
        if (!value) return res.status(400).json({ error: `missing ${type}` })
        await gistSet(file, encrypt(value))
        return res.json({ ok: true })
      } catch (e) { return res.status(500).json({ error: e.message }) }
    }

    if (req.method === 'DELETE') {
      try { await gistSet(file, 'empty'); return res.json({ ok: true }) }
      catch (e) { return res.status(500).json({ error: e.message }) }
    }
  }

  res.status(405).end()
}
