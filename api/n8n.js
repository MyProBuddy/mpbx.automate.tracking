import crypto from 'crypto'

function makeJwt(secret) {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000) })).toString('base64url')
  const sig     = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const secret = process.env.N8N_JWT_SECRET
  const type   = req.query.type

  // ?type=accounts — fetch n8n accounts (GET)
  if (type === 'accounts') {
    const url = process.env.N8N_ACCOUNTS_URL
    if (!url) return res.status(500).json({ error: 'N8N_ACCOUNTS_URL not configured' })
    const r = await fetch(url, { headers: { Authorization: `Bearer ${makeJwt(secret)}` } })
    return res.status(r.status).json(await r.json())
  }

  // ?type=sent-mail — proxy sent mail check (POST)
  if (type === 'sent-mail') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const url = process.env.N8N_SENT_MAIL_URL
    if (!url) return res.status(500).json({ error: 'N8N_SENT_MAIL_URL not configured' })
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${makeJwt(secret)}` },
      body: JSON.stringify(req.body),
    })
    return res.status(r.status).json(await r.json())
  }

  return res.status(400).json({ error: 'Missing ?type= parameter' })
}
