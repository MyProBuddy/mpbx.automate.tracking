export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const url = process.env.N8N_SENT_MAIL_URL
  if (!url) return res.status(500).json({ error: 'N8N_SENT_MAIL_URL not configured' })
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  })
  const data = await r.json()
  res.status(r.status).json(data)
}
