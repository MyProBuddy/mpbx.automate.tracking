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

const PARSE_CHUNK_SIZE = 25

async function geminiParseChunk(text, apiKey) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
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
  if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err?.error?.message || `Gemini error ${r.status}`) }
  const data = await r.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
  const clean = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  try {
    const rows = JSON.parse(clean)
    return Array.isArray(rows) ? rows : []
  } catch { return [] }
}

async function actionParse(req, res) {
  const { text } = req.body || {}
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' })
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_GEMINI_API_KEY not configured' })

  // Split text into lines, chunk by PARSE_CHUNK_SIZE rows, keep header on each chunk
  const lines = text.trim().split('\n')
  const header = lines[0]
  const dataLines = lines.slice(1).filter(l => l.trim())

  const sleep = (ms) => new Promise(r => setTimeout(r, ms))
  const allRows = []
  try {
    if (dataLines.length <= PARSE_CHUNK_SIZE) {
      // Small enough — single call
      const rows = await geminiParseChunk(text, apiKey)
      allRows.push(...rows)
    } else {
      // Chunk it
      for (let i = 0; i < dataLines.length; i += PARSE_CHUNK_SIZE) {
        const chunk = [header, ...dataLines.slice(i, i + PARSE_CHUNK_SIZE)].join('\n')
        const rows = await geminiParseChunk(chunk, apiKey)
        allRows.push(...rows)
        if (i + PARSE_CHUNK_SIZE < dataLines.length) await sleep(300)
      }
    }
  } catch (e) { return res.status(500).json({ error: e.message }) }

  for (const row of allRows) {
    if (!row['Last Name'] && row['First Name']?.includes(' ')) {
      const parts = row['First Name'].trim().split(' ')
      row['First Name'] = parts[0]
      row['Last Name'] = parts.slice(1).join(' ')
    }
  }
  return res.json({ rows: allRows })
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

// ── bulk-insert ───────────────────────────────────────────────────────────────
async function actionBulkInsert(req, res) {
  const { schema, rows } = req.body || {}
  if (!schema) return res.status(400).json({ error: 'schema required' })
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'rows array required' })

  const db = getPool()

  // Fetch existing emails in one query
  let existingEmails = new Set()
  try {
    const r = await db.query(`SELECT "Email" FROM "${schema}".investors WHERE "Email" IS NOT NULL AND "Email" != ''`)
    for (const row of r.rows) existingEmails.add(row['Email'].toLowerCase())
  } catch (e) { return res.status(500).json({ error: `Failed to fetch existing emails: ${e.message}` }) }

  // Get next sequence number in one query
  const prefix = schema.split('_').map(w => w[0]?.toUpperCase()).filter(Boolean).join('')
  let seq = 1
  try {
    const r = await db.query(`SELECT investor_id FROM "${schema}".investors WHERE investor_id LIKE $1`, [`${prefix}\\_%`])
    let max = 0
    for (const row of r.rows) {
      const num = parseInt(row.investor_id.split('_').pop(), 10)
      if (!isNaN(num) && num > max) max = num
    }
    seq = max + 1
  } catch { /* use seq=1 */ }

  let inserted = 0, dupes = 0, notz = 0, failed = 0
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    for (const row of rows) {
      const email = row['Email']?.trim()
      if (!email) { failed++; continue }
      if (existingEmails.has(email.toLowerCase())) { dupes++; continue }
      if (!row['timezone_offset']) { notz++; continue }

      const investor_id = `${prefix}_${String(seq).padStart(4, '0')}`
      seq++

      // Build investor insert
      const invRow = { investor_id, ...row }
      const invCols = Object.keys(invRow).filter(k => invRow[k] !== '' && invRow[k] !== null && invRow[k] !== undefined)
      const invColsSql = invCols.map(c => `"${c}"`).join(', ')
      const invValsSql = invCols.map((_, i) => `$${i + 1}`).join(', ')
      await client.query(`INSERT INTO "${schema}".investors (${invColsSql}) VALUES (${invValsSql})`, invCols.map(c => invRow[c]))

      // Insert tracking row
      await client.query(`INSERT INTO "${schema}".tracking (inv_id) VALUES ($1)`, [investor_id])

      existingEmails.add(email.toLowerCase())
      inserted++
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    return res.status(500).json({ error: `Insert failed: ${e.message}` })
  } finally {
    client.release()
  }

  return res.json({ inserted, dupes, notz, failed })
}

// ── timezone ──────────────────────────────────────────────────────────────────
const TIMEZONE_PROMPT = `You are a timezone inference assistant. Given a JSON array of investors with location info, infer the most likely timezone for each.

Return ONLY a JSON array, no markdown, no explanation:
[{"index": 0, "timezone_offset": "IST (UTC+5:30)", "timezone_num": 5.5}, ...]

Rules:
- timezone_offset format: "ABBR (UTC+X:XX)" e.g. "IST (UTC+5:30)", "PST (UTC-8:00)", "EST (UTC-5:00)"
- timezone_num = decimal offset e.g. 5.5, -8, -5, 8
- Use country and state to determine timezone; if missing, use location_hint
- Omit an entry from the array if timezone cannot be determined`

async function actionTimezone(req, res) {
  const { rows } = req.body || {}
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'rows array required' })
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_GEMINI_API_KEY not configured' })

  function cleanVal(v) {
    if (!v) return ''
    const s = String(v).trim()
    return ['—', '-', 'n/a', 'null', 'none'].includes(s.toLowerCase()) ? '' : s
  }

  const items = rows.map((row, i) => {
    const country = cleanVal(row['Company Country'])
    const state   = cleanVal(row['Company State'])
    const hint    = cleanVal(row['Description'] || row['Overview'] || row['Keywords'] || row['Company'] || row['Company Address'])
    return { index: i, country, state, location_hint: hint.slice(0, 200) }
  })

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: TIMEZONE_PROMPT }] },
          contents: [{ parts: [{ text: JSON.stringify(items) }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      }
    )
    if (!r.ok) { const err = await r.json().catch(() => ({})); return res.status(502).json({ error: err?.error?.message || 'Gemini API error' }) }
    const data = await r.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const clean = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    let results
    try { results = JSON.parse(clean) } catch { return res.status(500).json({ error: 'Failed to parse Gemini response', raw }) }
    if (!Array.isArray(results)) return res.status(500).json({ error: 'Unexpected response shape', raw })
    return res.json({ results })
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
  if (action === 'timezone')     return actionTimezone(req, res)
  if (action === 'bulk-insert')  return actionBulkInsert(req, res)
  return res.status(400).json({ error: 'action required: parse | validate | enrich | next-id | timezone | bulk-insert' })
}
