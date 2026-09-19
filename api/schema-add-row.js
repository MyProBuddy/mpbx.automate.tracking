import pg from 'pg'
import { verifySession, setCors } from './_lib.js'

const { Pool } = pg
let pool
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.CLIENT_ANALYTICS_DB_URL, ssl: { rejectUnauthorized: false } })
  return pool
}

const ALLOWED_TABLES = ['investors', 'tracking', 'updates', 'conversation_log', 'thread_tracking', 'config']

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!verifySession(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { schema, table, row } = req.body || {}
  if (!schema || !table || !row) return res.status(400).json({ error: 'schema, table, row required' })
  if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' })

  const db = getPool()

  const cols = Object.keys(row).filter(k => row[k] !== '' && row[k] !== null && row[k] !== undefined)
  if (cols.length === 0) return res.status(400).json({ error: 'No data to insert' })

  const colsSql = cols.map(c => `"${c}"`).join(', ')
  const valsSql = cols.map((_, i) => `$${i + 1}`).join(', ')
  const vals    = cols.map(c => row[c])

  try {
    await db.query(`INSERT INTO "${schema}"."${table}" (${colsSql}) VALUES (${valsSql})`, vals)
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
