const GIST_ID  = process.env.VITE_GIST_ID
const GH_TOKEN = process.env.VITE_GITHUB_TOKEN
const ENC_KEY  = process.env.VITE_ENCRYPT_KEY

const GIST_FILE = 'token.enc'
const ghHeaders = {
  Authorization: `Bearer ${GH_TOKEN}`,
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
}

// ── AES-GCM via Node crypto ──────────────────────────────────────────────────

const { subtle } = globalThis.crypto

async function getKey() {
  const raw = Buffer.from(ENC_KEY.padEnd(32).slice(0, 32))
  return subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encrypt(text) {
  const key = await getKey()
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const enc = await subtle.encrypt({ name: 'AES-GCM', iv }, key, Buffer.from(text))
  const buf = Buffer.concat([Buffer.from(iv), Buffer.from(enc)])
  return buf.toString('base64')
}

async function decrypt(b64) {
  const buf = Buffer.from(b64, 'base64')
  const iv  = buf.slice(0, 12)
  const enc = buf.slice(12)
  const key = await getKey()
  const dec = await subtle.decrypt({ name: 'AES-GCM', iv }, key, enc)
  return Buffer.from(dec).toString('utf8')
}

// ── Gist helpers ─────────────────────────────────────────────────────────────

async function gistGet() {
  const r    = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers: ghHeaders })
  const data = await r.json()
  return data?.files?.[GIST_FILE]?.content || null
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
      const enc = await gistGet()
      if (!enc || enc === 'empty') return res.json({ token: null })
      const token = await decrypt(enc)
      return res.json({ token })
    } catch { return res.json({ token: null }) }
  }

  if (req.method === 'POST') {
    try {
      const { token } = req.body
      if (!token) return res.status(400).json({ error: 'missing token' })
      const enc = await encrypt(token)
      await gistSet(enc)
      return res.json({ ok: true })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  res.status(405).end()
}
