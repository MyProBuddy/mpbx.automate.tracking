import crypto from 'crypto'

function makeJwt(secret) {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000) })).toString('base64url')
  const sig     = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const url    = process.env.N8N_SENT_MAIL_URL
  const secret = process.env.N8N_JWT_SECRET
  if (!url) return res.status(500).json({ error: 'N8N_SENT_MAIL_URL not configured' })
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${makeJwt(secret)}`,
    },
    body: JSON.stringify(req.body),
  })
  const data = await r.json()
  res.status(r.status).json(data)
}
