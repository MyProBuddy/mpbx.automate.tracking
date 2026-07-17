import crypto from 'crypto'

const GIST_ID  = process.env.VITE_GIST_ID
const GH_TOKEN = process.env.VITE_GITHUB_TOKEN
const ENC_KEY  = process.env.VITE_ENCRYPT_KEY

const CLIENT_ID     = process.env.VITE_GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET

const FILES = {
  token: 'token.enc',
  session: 'session.enc',
  refresh: 'refresh.enc'
}

const ghHeaders = {
  Authorization: `Bearer ${GH_TOKEN}`,
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
}

function getKey() {
  if (!ENC_KEY) return Buffer.alloc(32)
  return Buffer.from(ENC_KEY.padEnd(32).slice(0, 32))
}

function encrypt(text) {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function decrypt(b64) {
  const buf = Buffer.from(b64, 'base64')
  const iv = buf.slice(0, 12)
  const tag = buf.slice(12, 28)
  const encrypted = buf.slice(28)
  const key = getKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

async function gistGet(file) {
  if (!GIST_ID || !GH_TOKEN) return null
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers: ghHeaders })
  const data = await r.json()
  return data?.files?.[file]?.content || null
}

async function gistSet(file, content) {
  if (!GIST_ID || !GH_TOKEN) return
  await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: ghHeaders,
    body: JSON.stringify({ files: { [file]: { content } } }),
  })
}

async function getAccessTokenFromRefreshToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    throw new Error(`Failed to refresh token: ${await res.text()}`)
  }
  const data = await res.json()
  return data.access_token
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const type = req.query?.type === 'session' ? 'session' : 'token'
  if (type === 'session') {
    return res.status(400).json({ error: 'Session syncing is disabled' })
  }
  const file = FILES[type]
  const field = type // 'token' or 'session'

  if (req.method === 'GET') {
    try {
      // If we need a refresh of the Google Token
      if (type === 'token' && req.query?.refresh === 'true') {
        const encRefresh = await gistGet(FILES.refresh)
        if (encRefresh) {
          const refreshToken = decrypt(encRefresh)
          const newAccessToken = await getAccessTokenFromRefreshToken(refreshToken)
          if (newAccessToken) {
            await gistSet(FILES.token, encrypt(newAccessToken))
            return res.json({ token: newAccessToken })
          }
        }
      }

      const enc = await gistGet(file)
      if (!enc) {
        // Fallback: if token is missing but refresh token exists, fetch a new token
        if (type === 'token') {
          const encRefresh = await gistGet(FILES.refresh)
          if (encRefresh) {
            const refreshToken = decrypt(encRefresh)
            const newAccessToken = await getAccessTokenFromRefreshToken(refreshToken)
            if (newAccessToken) {
              await gistSet(FILES.token, encrypt(newAccessToken))
              return res.json({ token: newAccessToken })
            }
          }
        }
        return res.json({ [field]: null })
      }

      try {
        return res.json({ [field]: decrypt(enc) })
      } catch {
        return res.json({ [field]: null })
      }
    } catch {
      return res.json({ [field]: null })
    }
  }

  if (req.method === 'POST') {
    try {
      // Check if we are doing code exchange for Google OAuth
      if (type === 'token' && req.body?.code) {
        const code = req.body.code
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: 'postmessage',
            grant_type: 'authorization_code',
          }),
        })

        if (!response.ok) {
          return res.status(response.status).json({ error: await response.text() })
        }

        const data = await response.json()
        
        // Save the access token to the Gist
        if (data.access_token) {
          await gistSet(FILES.token, encrypt(data.access_token))
        }

        // Save the refresh token to the Gist if returned
        if (data.refresh_token) {
          await gistSet(FILES.refresh, encrypt(data.refresh_token))
        }

        return res.json({
          token: data.access_token,
          refresh_token: data.refresh_token,
        })
      }

      const value = req.body?.[field]
      if (!value) return res.status(400).json({ error: `missing ${field}` })
      await gistSet(file, encrypt(value))
      return res.json({ ok: true })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await gistSet(file, 'empty')
      return res.json({ ok: true })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
