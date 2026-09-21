import { verifySession, setCors } from './_lib.js'

const HUNTER_KEY = () => process.env.HUNTER_API_KEY

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!verifySession(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { emails } = req.body || {}
  if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'emails array required' })

  const apiKey = HUNTER_KEY()
  if (!apiKey) return res.status(500).json({ error: 'HUNTER_API_KEY not configured' })

  const results = {}
  for (const email of emails) {
    if (!email) continue
    try {
      const r = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`)
      const d = await r.json()
      const data = d?.data || {}
      results[email] = {
        status: data.status || 'unknown',          // valid | invalid | accept_all | webmail | disposable | unknown
        score: data.score ?? null,
        regexp: data.regexp ?? null,
        gibberish: data.gibberish ?? false,
        disposable: data.disposable ?? false,
        webmail: data.webmail ?? false,
        mx_records: data.mx_records ?? null,
      }
    } catch {
      results[email] = { status: 'unknown' }
    }
  }

  return res.json({ results })
}
