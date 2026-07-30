const MEMBERS = [
  { email: 'admin@example.com',  password: 'admin123',  role: 'admin'  },
  { email: 'member@example.com', password: 'member123', role: 'member' },
]

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'missing credentials' })

  if (email === process.env.SA_EMAIL && password === process.env.SA_PASSWORD) {
    return res.json({ role: 'superadmin' })
  }

  const match = MEMBERS.find(u => u.email === email && u.password === password)
  if (match) return res.json({ role: match.role })

  return res.status(401).json({ role: null })
}
