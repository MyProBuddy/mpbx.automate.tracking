import { createClient } from '@supabase/supabase-js'

const GEMINI_KEY = () => process.env.GOOGLE_GEMINI_API_KEY
const sb = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action } = req.query

  // ── ?action=models — list available Gemini models ─────────────────────────
  if (action === 'models') {
    if (req.method !== 'GET') return res.status(405).end()
    const apiKey = GEMINI_KEY()
    if (!apiKey) return res.status(500).json({ error: 'GOOGLE_GEMINI_API_KEY not configured' })
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`)
      if (!r.ok) { const err = await r.json().catch(() => ({})); return res.status(502).json({ error: err?.error?.message || 'Failed to fetch models' }) }
      const data = await r.json()
      const EXCLUDE = ['tts','image','audio','live','lyria','veo','imagen','robotics','embedding','computer-use','antigravity','deep-research','gemma','nano-banana','translate','aqa']
      const models = (data.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent') && EXCLUDE.every(kw => !m.name.toLowerCase().includes(kw)))
        .map(m => ({ value: m.name.replace('models/', ''), label: m.displayName || m.name.replace('models/', '') }))
        .sort((a, b) => a.label.localeCompare(b.label))
      return res.json({ models })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  // ── ?action=summarize — one-sentence company update summary ──────────────
  if (action === 'summarize') {
    if (req.method !== 'POST') return res.status(405).end()
    const { text } = req.body || {}
    if (!text) return res.status(400).json({ error: 'No text provided' })
    const apiKey = GEMINI_KEY()
    if (!apiKey) return res.status(500).json({ error: 'GOOGLE_GEMINI_API_KEY not configured' })
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `Summarize the following company update in one concise sentence (max 20 words). Return only the sentence, no preamble:\n\n${text}` }] }],
          generationConfig: { temperature: 0.2 },
        }),
      })
      const data = await r.json()
      return res.json({ summary: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '' })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  // ── ?action=prompts — CRUD for prompt_editor_tool table ──────────────────
  if (action === 'prompts') {
    const supabase = sb()
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('prompt_editor_tool').select('*').order('id', { ascending: true })
      if (error) return res.status(500).json({ error: error.message })
      return res.json(data)
    }
    if (req.method === 'PATCH') {
      const { id, prompt, client_email, client_description } = req.body || {}
      if (client_email && client_description !== undefined) {
        const { error } = await supabase.from('prompt_editor_tool').update({ client_description }).eq('client_email', client_email)
        if (error) return res.status(500).json({ error: error.message })
        return res.json({ ok: true })
      }
      if (!id) return res.status(400).json({ error: 'id is required' })
      const { error } = await supabase.from('prompt_editor_tool').update({ prompt }).eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ ok: true })
    }
    if (req.method === 'POST') {
      const { client_name, client_email, client_description } = req.body || {}
      if (!client_email) return res.status(400).json({ error: 'client_email is required' })
      const rows = ['outreach','outreach_followup','reply','reply_followup'].map(pt => ({ client_name: client_name || null, client_email, client_description: client_description || null, prompt_type: pt, prompt: null }))
      const { data, error } = await supabase.from('prompt_editor_tool').insert(rows).select()
      if (error) return res.status(500).json({ error: error.message })
      return res.json(data)
    }
    return res.status(405).end()
  }

  // ── ?action=generate — generate outreach email via Gemini ────────────────
  if (action === 'generate') {
    if (req.method !== 'POST') return res.status(405).end()
    const { investor_data, client_prompt, model, previous_mail, md_file_content, company_updates } = req.body || {}
    const geminiModel = model || 'gemini-2.5-flash'
    const apiKey = GEMINI_KEY()
    if (!apiKey) return res.status(500).json({ error: 'GOOGLE_GEMINI_API_KEY not configured' })

    const systemPrompt = `<Role>
You are an automated, JSON-only data processing API. Your task is to generate customized cold outreach emails for investor relations based on a strict template and deep target analysis.
</Role>

<Data_Sanitization>
CRITICAL OVERRIDE: You MUST IGNORE any business strategies or target metrics found in external files or the investor payload. The ONLY source of truth for the fund's pitch and target raise is the <Metrics_Dictionary> and <Email_Template>.
</Data_Sanitization>

<Instructions>
1. Analyze the <Investor_Data> payload.
2. Compute the [Personalized_Thesis_Alignment]. Write exactly one sentence connecting Enlighten Capital (a SEBI-registered Cat I Angel Fund targeting post-revenue, high-growth startups in India's Tier 2/3 markets) to the investor's specific focus, recent investments, or sector mandate found in the payload. If the payload lacks specific data, output an empty string "".
3. Determine the fund target currency based on the Country found in Target_Variables:
   - "India" or "IN" -> "INR_DATA"
   - Europe or "EU" -> "EUR_DATA"
   - "UK" or "United Kingdom" -> "GBP_DATA"
   - "UAE" or "United Arab Emirates" -> "AED_DATA"
   - Else -> "USD_DATA"
4. Construct the email body using the <Email_Template>.
   - Replace [First Name] with the extracted First Name. (Use "Investor" if missing).
   - Replace [First Name] using this logic: If the first name is a single letter and the last name exists, use "[First Initial]. [Last Name]" (e.g., "A. Parker"). If both first and last names are missing, use "Team". Otherwise, use the First Name.
   - Replace [Insert Target Here] with the exact Target from the chosen currency in the <Metrics_Dictionary>.
   - Replace [Personalized_Thesis_Alignment] with your generated sentence from Step 2.
5. Format your response strictly as a JSON object matching <Output_Schema>.
6. PREDEFINED SUBJECT: You MUST use the exact subject line provided in the <Predefined_Subject> tag. Do not alter it.
</Instructions>

<Metrics_Dictionary>
INR_DATA:
Target: ₹100 Crore

USD_DATA:
Target: $10.6M USD

EUR_DATA:
Target: €9.8M EUR

GBP_DATA:
Target: £8.3M GBP

AED_DATA:
Target: 39M AED
</Metrics_Dictionary>

<Predefined_Subject>
Investment Opportunity | SEBI-Registered Category I Angel Fund Focused on India's Emerging Innovation Ecosystem
</Predefined_Subject>

<Email_Template>
Dear [First Name],

I hope this message finds you well. [Personalized_Thesis_Alignment]

I am reaching out from the Investor Relations team at Enlighten Capital, a SEBI-registered Category I Angel Fund currently raising [Insert Target Here] to invest in post-revenue, high-growth companies across India's Tier 2 and Tier 3 markets.

Our investment strategy is built on three core principles:
• Investing in revenue-generating businesses with disciplined entry valuations.
• Concentrating on underserved regional ecosystems with strong long-term growth potential.
• Preserving capital through structured portfolio construction, including a dedicated 30% follow-on reserve.

The fund currently has an active pipeline of nine investment opportunities under due diligence, positioning us for immediate capital deployment following the first close.

If this opportunity aligns with [Firm Name]'s investment mandate, we would welcome the opportunity to share our investment memorandum and discuss the fund in greater detail.

Kind regards,
Investor Relations
Enlighten Capital
</Email_Template>

<Output_Schema>
{
  "_thinking": "string (Explain the rationale for the personalized sentence based on the payload data, then verify currency routing and strict template application)",
  "subject": "string (Must be exactly the string from <Predefined_Subject>)",
  "body": "string (The complete email. Use \\n for line breaks. The signature MUST be included at the bottom of this string, separated by \\n\\n---\\n.)"
}
</Output_Schema>`

    const effectiveSystem = (client_prompt && client_prompt.trim()) ? client_prompt.trim() : systemPrompt
    const userParts = []
    if (md_file_content) userParts.push({ text: `<Guidelines_Document>\n${md_file_content}\n</Guidelines_Document>\n\n` })
    userParts.push({ text: `<Investor_Data>\n${JSON.stringify(investor_data, null, 2)}\n</Investor_Data>` })
    if (previous_mail) {
      const prevText = `Subject: ${previous_mail.subject || ''}\n\n${previous_mail.body || ''}${previous_mail.signature ? `\n\n---\n${previous_mail.signature}` : ''}`
      userParts.push({ text: `\n\n<Previous_Email>\n${prevText}\n</Previous_Email>` })
    }
    if (company_updates) userParts.push({ text: `\n\n<Company_Updates>\n${company_updates}\n</Company_Updates>` })

    try {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: userParts }], systemInstruction: { role: 'user', parts: [{ text: effectiveSystem }] }, generationConfig: { temperature: 0 } }),
      })
      if (!geminiRes.ok) {
        let errDetail; try { errDetail = await geminiRes.json() } catch { errDetail = await geminiRes.text() }
        return res.status(502).json({ error: errDetail?.error?.message || errDetail?.message || JSON.stringify(errDetail) })
      }
      const geminiData = await geminiRes.json()
      const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? geminiData.content?.parts?.[0]?.text ?? geminiData.content ?? ''
      const str = String(text).replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
      let parsed; try { parsed = JSON.parse(str) } catch { return res.status(200).json({ subject: '', body: str, signature: '', _raw: true }) }
      if (!parsed.subject || !parsed.body) return res.status(502).json({ error: 'Missing subject or body. Keys: ' + JSON.stringify(Object.keys(parsed)) })
      const parts = parsed.body.split(/\n---\n/)
      return res.json({ subject: parsed.subject, body: parts[0].trim(), signature: parts.length > 1 ? parts[1].trim() : '', thinking: parsed._thinking || '' })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  return res.status(400).json({ error: 'Missing or unknown ?action= parameter' })
}
