import { verifySession } from './_lib.js'

export default function handler(req, res) {
  if (!verifySession(req)) return res.status(401).json({ error: 'Unauthorized' })
  const vars = Object.entries(process.env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  res.setHeader('Content-Type', 'text/plain')
  res.send(vars)
}
