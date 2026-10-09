import pg from 'pg'
import { verifySession, setCors } from './_lib.js'

const { Pool } = pg

let pool
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.CLIENT_ANALYTICS_DB_URL, ssl: { rejectUnauthorized: false } })
  return pool
}

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!verifySession(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { client, status } = req.body || {}
  if (!client || !status) return res.status(400).json({ error: 'client and status are required' })

  const db = getPool()

  try {
    // Ensure column exists
    await db.query(`ALTER TABLE "${client}".config ADD COLUMN IF NOT EXISTS status text DEFAULT 'Live'`)
    
    // Update it
    await db.query(`UPDATE "${client}".config SET status = $1`, [status])
    
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
