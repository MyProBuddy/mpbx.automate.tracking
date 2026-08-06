export default async function handler(req, res) {
  const url = process.env.N8N_ACCOUNTS_URL
  if (!url) return res.status(500).json({ error: 'N8N_ACCOUNTS_URL not configured' })
  const r = await fetch(url)
  const data = await r.json()
  res.status(r.status).json(data)
}
