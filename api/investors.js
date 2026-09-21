import pg from 'pg'
import { verifySession, setCors } from './_lib.js'

const { Pool } = pg
let pool
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.CLIENT_ANALYTICS_DB_URL, ssl: { rejectUnauthorized: false } })
  return pool
}

// ── parse ─────────────────────────────────────────────────────────────────────
const PARSE_PROMPT = `You are a data parser. The user will paste raw text containing investor/contact data in any format — could be tab-separated, CSV, space-aligned columns, or a mix.

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

async function actionParse(req, res) {
  const { text, model } = req.body || {}
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' })
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_GEMINI_API_KEY not configured' })
  const geminiModel = model || 'gemini-3.1-flash-lite'
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: PARSE_PROMPT }] },
          contents: [{ parts: [{ text }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      }
    )
    if (!r.ok) { const err = await r.json().catch(() => ({})); return res.status(502).json({ error: err?.error?.message || 'Gemini API error' }) }
    const data = await r.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const clean = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    let rows
    try { rows = JSON.parse(clean) } catch { return res.status(500).json({ error: 'Failed to parse Gemini response', raw }) }
    if (!Array.isArray(rows)) return res.status(500).json({ error: 'Unexpected response shape', raw })
    for (const row of rows) {
      if (!row['Last Name'] && row['First Name']?.includes(' ')) {
        const parts = row['First Name'].trim().split(' ')
        row['First Name'] = parts[0]
        row['Last Name'] = parts.slice(1).join(' ')
      }
    }
    return res.json({ rows })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}

// ── validate ──────────────────────────────────────────────────────────────────
async function actionValidate(req, res) {
  const { emails } = req.body || {}
  if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'emails array required' })
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'HUNTER_API_KEY not configured' })
  const results = {}
  for (const email of emails) {
    if (!email) continue
    try {
      const r = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`)
      const d = await r.json()
      const data = d?.data || {}
      results[email] = {
        status: data.status || 'unknown',
        score: data.score ?? null,
        regexp: data.regexp ?? null,
        gibberish: data.gibberish ?? false,
        disposable: data.disposable ?? false,
        webmail: data.webmail ?? false,
        mx_records: data.mx_records ?? null,
      }
    } catch { results[email] = { status: 'unknown' } }
  }
  return res.json({ results })
}

// ── enrich ────────────────────────────────────────────────────────────────────
const ENRICH_PROMPT = `You are an investment research assistant. Given an investor's name, firm, and title, return ONLY a raw JSON object — no markdown, no explanation, no code fences.

Return this exact structure (use null if not found):
{
  "linkedin": "full LinkedIn profile URL or null",
  "website": "firm website URL or null",
  "sector_focus": "comma-separated sectors e.g. SaaS, Fintech, Healthcare or null",
  "fund_stage": "comma-separated stages e.g. Pre-seed, Seed, Series A or null",
  "check_size": "e.g. $250K-$2M or null",
  "fund_description": "2-3 sentence description of the fund or null",
  "investment_thesis": "1-2 sentence thesis or null",
  "overview": "1-2 sentence overview of the investor or null",
  "notable_portfolios": "comma-separated notable portfolio companies or null",
  "keywords": "comma-separated keywords describing this investor or null"
}`

async function actionEnrich(req, res) {
  const { name, firm, title, email } = req.body || {}
  if (!name && !firm) return res.status(400).json({ error: 'name or firm required' })
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'PERPLEXITY_API_KEY not configured' })
  const userMsg = `Research this investor: ${name || 'Unknown'}${title ? `, ${title}` : ''}${firm ? ` at ${firm}` : ''}${email ? ` (email: ${email})` : ''}. Find their LinkedIn, firm website, investment thesis, sector focus, check size, notable portfolio companies, and keywords.`
  const payload = {
    model: 'sonar',
    messages: [{ role: 'system', content: ENRICH_PROMPT }, { role: 'user', content: userMsg }],
    temperature: 0.1, max_tokens: 400, search_recency_filter: 'year',
  }
  const sleep = (ms) => new Promise(r => setTimeout(r, ms))
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (r.status === 429 || r.status >= 500) {
        if (attempt === 1) { await sleep(3000); continue }
        const err = await r.json().catch(() => ({}))
        return res.status(502).json({ error: err?.error?.message || `Perplexity error ${r.status}` })
      }
      if (!r.ok) { const err = await r.json().catch(() => ({})); return res.status(502).json({ error: err?.error?.message || 'Perplexity API error' }) }
      const data = await r.json()
      let content = data?.choices?.[0]?.message?.content?.trim() || '{}'
      if (content.startsWith('```')) { content = content.split('```')[1]; if (content.startsWith('json')) content = content.slice(4) }
      let enriched
      try { enriched = JSON.parse(content.trim()) } catch { return res.status(500).json({ error: 'Failed to parse response', raw: content }) }
      return res.json({ enriched })
    } catch (e) {
      if (attempt === 1) { await sleep(3000); continue }
      return res.status(500).json({ error: e.message })
    }
  }
}

// ── next-id ───────────────────────────────────────────────────────────────────
async function actionNextId(req, res) {
  const { schema } = req.query
  if (!schema) return res.status(400).json({ error: 'schema required' })
  const prefix = schema.split('_').map(w => w[0]?.toUpperCase()).filter(Boolean).join('')
  const db = getPool()
  try {
    const r = await db.query(`SELECT investor_id FROM "${schema}".investors WHERE investor_id LIKE $1`, [`${prefix}\\_%`])
    let max = 0
    for (const row of r.rows) {
      const parts = row.investor_id.split('_')
      const num = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(num) && num > max) max = num
    }
    return res.json({ prefix, next: max + 1 })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}

// ── router ────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(res, 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!verifySession(req)) return res.status(401).json({ error: 'Unauthorized' })

  const action = req.query.action
  if (action === 'parse')    return actionParse(req, res)
  if (action === 'validate') return actionValidate(req, res)
  if (action === 'enrich')   return actionEnrich(req, res)
  if (action === 'next-id')  return actionNextId(req, res)
  return res.status(400).json({ error: 'action required: parse | validate | enrich | next-id' })
}
