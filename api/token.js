const KV_URL   = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

async function kvGet(key) {
  const r = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  })
  const { result } = await r.json()
  return result || null
}

async function kvSet(key, value, exSeconds) {
  await fetch(`${KV_URL}/set/${key}/${encodeURIComponent(value)}/ex/${exSeconds}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const token = await kvGet('g_token')
    return res.json({ token })
  }

  if (req.method === 'POST') {
    const { token } = req.body
    if (!token) return res.status(400).json({ error: 'missing token' })
    await kvSet('g_token', token, 3500) // store for ~1h
    return res.json({ ok: true })
  }

  res.status(405).end()
}
