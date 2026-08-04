export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_GEMINI_API_KEY not configured' })

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      return res.status(502).json({ error: err?.error?.message || 'Failed to fetch models' })
    }
    const data = await r.json()
    const models = (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        value: m.name.replace('models/', ''),
        label: m.displayName || m.name.replace('models/', ''),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
    return res.json({ models })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
