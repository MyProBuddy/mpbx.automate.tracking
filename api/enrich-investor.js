import { verifySession, setCors } from './_lib.js'

const PERPLEXITY_KEY = () => process.env.PERPLEXITY_API_KEY

const SYSTEM_PROMPT = `You are an investment research assistant. Given an investor's name, firm, and title, return ONLY a raw JSON object — no markdown, no explanation, no code fences.

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

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!verifySession(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { name, firm, title, email } = req.body || {}
  if (!name && !firm) return res.status(400).json({ error: 'name or firm required' })

  const apiKey = PERPLEXITY_KEY()
  if (!apiKey) return res.status(500).json({ error: 'PERPLEXITY_API_KEY not configured' })

  const userMsg = `Research this investor: ${name || 'Unknown'}${title ? `, ${title}` : ''}${firm ? ` at ${firm}` : ''}${email ? ` (email: ${email})` : ''}. Find their LinkedIn, firm website, investment thesis, sector focus, check size, notable portfolio companies, and keywords.`

  const payload = {
    model: 'sonar',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.1,
    max_tokens: 400,
    search_recency_filter: 'year',
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms))

  // 1 retry on 429 or 5xx, wait 3s before retry (matches ~50 req/min rate limit)
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

      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        return res.status(502).json({ error: err?.error?.message || 'Perplexity API error' })
      }

      const data = await r.json()
      let content = data?.choices?.[0]?.message?.content?.trim() || '{}'
      if (content.startsWith('```')) {
        content = content.split('```')[1]
        if (content.startsWith('json')) content = content.slice(4)
      }
      let enriched
      try { enriched = JSON.parse(content.trim()) } catch { return res.status(500).json({ error: 'Failed to parse response', raw: content }) }
      return res.json({ enriched })

    } catch (e) {
      if (attempt === 1) { await sleep(3000); continue }
      return res.status(500).json({ error: e.message })
    }
  }
}
