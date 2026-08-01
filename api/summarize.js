export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { text } = req.body || {}
  if (!text) return res.status(400).json({ error: 'No text provided' })

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_GEMINI_API_KEY not configured' })

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `Summarize the following company update in one concise sentence (max 20 words). Return only the sentence, no preamble:\n\n${text}` }] }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    )

    const data = await geminiRes.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    return res.json({ summary })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
