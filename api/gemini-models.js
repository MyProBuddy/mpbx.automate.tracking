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
    const EXCLUDE = ['tts', 'image', 'audio', 'live', 'lyria', 'veo', 'imagen', 'robotics', 'embedding', 'computer-use', 'antigravity', 'deep-research', 'gemma', 'nano-banana', 'translate', 'aqa']
    const models = (data.models || [])
      .filter(m => {
        const name = m.name.toLowerCase()
        if (!m.supportedGenerationMethods?.includes('generateContent')) return false
        return EXCLUDE.every(kw => !name.includes(kw))
      })
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
