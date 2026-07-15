import crypto from 'crypto'

const GIST_ID  = process.env.VITE_GIST_ID
const GH_TOKEN = process.env.VITE_GITHUB_TOKEN
const ENC_KEY  = process.env.VITE_ENCRYPT_KEY

const GIST_FILE = 'token.enc'
const ghHeaders = {
  Authorization: `Bearer ${GH_TOKEN}`,
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
}

function getKey() {
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

// ── Gist helpers ─────────────────────────────────────────────────────────────

async function gistGet() {
  const r    = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers: ghHeaders })
  const data = await r.json()
  return { content: data?.files?.[GIST_FILE]?.content || null, files: Object.keys(data?.files || {}) }
}

async function gistSet(content) {
  await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: ghHeaders,
    body: JSON.stringify({ files: { [GIST_FILE]: { content } } }),
  })
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    try {
      const { content: enc, files } = await gistGet()
      if (!enc) return res.json({ token: null, debug: { reason: 'no content in gist file', files, expectedFile: GIST_FILE, hasGistId: !!GIST_ID, hasGhToken: !!GH_TOKEN, hasEncKey: !!ENC_KEY } })
      try {
        const token = decrypt(enc)
        return res.json({ token })
      } catch (decryptErr) {
        return res.json({ token: null, debug: { reason: 'decrypt failed', error: decryptErr.message, contentLength: enc.length, contentPreview: enc.slice(0, 30) } })
      }
    } catch (e) {
      return res.json({ token: null, debug: { reason: 'gist fetch failed', error: e.message } })
    }
  }

  if (req.method === 'POST') {
    try {
      const { token } = req.body
      if (!token) return res.status(400).json({ error: 'missing token' })
      const enc = encrypt(token)
      await gistSet(enc)
      return res.json({ ok: true })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  res.status(405).end()
}
