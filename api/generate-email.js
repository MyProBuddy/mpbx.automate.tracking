export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { investor_data, client_prompt } = req.body || {}
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
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

  const userMessage = `${client_prompt ? `Additional instructions from the user:\n${client_prompt}\n\n` : ''}<Investor_Data>\n${JSON.stringify(investor_data, null, 2)}\n</Investor_Data>`

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      return res.status(502).json({ error: 'Gemini API error', detail: err })
    }

    const geminiData = await geminiRes.json()
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    let parsed
    try { parsed = JSON.parse(raw) }
    catch { return res.status(200).json({ subject: '', body: raw, _raw: true }) }

    return res.json({ subject: parsed.subject || '', body: parsed.body || '', thinking: parsed._thinking || '' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
