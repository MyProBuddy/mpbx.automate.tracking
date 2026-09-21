import { verifySession, setCors } from './_lib.js'

const GEMINI_KEY = () => process.env.GOOGLE_GEMINI_API_KEY

const SYSTEM_PROMPT = `You are a data parser. The user will paste raw text containing investor/contact data in any format — could be tab-separated, CSV, space-aligned columns, or a mix.

Extract each person as a JSON object. Return ONLY a JSON array, no markdown, no explanation.

Map fields to these exact keys (leave as empty string "" if not found):
- "First Name"
- "Last Name"
- "Email"
- "Company"
- "Title"
- "Company Country"
- "Company State"
- "Person Linkedin Url"
- "Website"
- "Keywords"
- "Fund focus"
- "Fund stage"
- "Check Size"
- "Overview"
- "Description"

Rules:
- ALWAYS split names: first word → "First Name", remaining words → "Last Name". Example: "Raghav Mahajan" → First Name "Raghav", Last Name "Mahajan". "John van der Berg" → First Name "John", Last Name "van der Berg"
- Single word name like "Krieattisak" → First Name "Krieattisak", Last Name ""
- NEVER put a full name like "Raghav Mahajan" entirely into "First Name" — always split
- Email must be a valid email address or empty string
- Strip any leading/trailing whitespace from values
- Ignore rows that have no email and no name
- Return an empty array [] if no valid rows found

Example output:
[{"First Name":"Raghav","Last Name":"Mahajan","Email":"rmahajan@asiaalt.com","Company":"Asia Alternatives","Title":"","Company Country":"California","Company State":"","Person Linkedin Url":"","Website":"","Keywords":"","Fund focus":"","Fund stage":"","Check Size":"","Overview":"","Description":""}]`

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!verifySession(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { text, model } = req.body || {}
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' })

  const apiKey = GEMINI_KEY()
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_GEMINI_API_KEY not configured' })

  const geminiModel = model || 'gemini-3.1-flash-lite'

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      }
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      return res.status(502).json({ error: err?.error?.message || 'Gemini API error' })
    }
    const data = await r.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    // strip markdown code fences if model added them
    const clean = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    let rows
    try { rows = JSON.parse(clean) } catch { return res.status(500).json({ error: 'Failed to parse Gemini response', raw }) }
    if (!Array.isArray(rows)) return res.status(500).json({ error: 'Unexpected response shape', raw })
    // fallback: if Last Name empty but First Name has multiple words, split
    for (const row of rows) {
      if (!row['Last Name'] && row['First Name']?.includes(' ')) {
        const parts = row['First Name'].trim().split(' ')
        row['First Name'] = parts[0]
        row['Last Name'] = parts.slice(1).join(' ')
      }
    }
    return res.json({ rows })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
