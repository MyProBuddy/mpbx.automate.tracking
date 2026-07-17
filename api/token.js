import crypto from 'crypto'

const GIST_ID  = process.env.VITE_GIST_ID
const GH_TOKEN = process.env.VITE_GITHUB_TOKEN
const ENC_KEY  = process.env.VITE_ENCRYPT_KEY

const FILES = { token: 'token.enc', session: 'session.enc' }

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

async function gistGet(file) {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers: ghHeaders })
  const data = await r.json()
  return data?.files?.[file]?.content || null
}

async function gistSet(file, content) {
  await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: ghHeaders,
    body: JSON.stringify({ files: { [file]: { content } } }),
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const type = req.query?.type === 'session' ? 'session' : 'token'
  const file = FILES[type]
  const field = type // 'token' or 'session'

  if (req.method === 'GET') {
    try {
      const enc = await gistGet(file)
      if (!enc) return res.json({ [field]: null })
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
