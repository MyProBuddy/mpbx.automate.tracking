import crypto from 'crypto'

function makeJwt(secret) {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000) })).toString('base64url')
  const sig     = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

export default async function handler(req, res) {
  const url    = process.env.N8N_ACCOUNTS_URL
  const secret = process.env.N8N_JWT_SECRET
  if (!url) return res.status(500).json({ error: 'N8N_ACCOUNTS_URL not configured' })
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${makeJwt(secret)}` },
  })
  const data = await r.json()
  res.status(r.status).json(data)
}
