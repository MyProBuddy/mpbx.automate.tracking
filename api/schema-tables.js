import pg from 'pg'
import { verifySession, setCors } from './_lib.js'

const { Pool } = pg
let pool
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.CLIENT_ANALYTICS_DB_URL, ssl: { rejectUnauthorized: false } })
  return pool
}

const TABLES = ['config', 'conversation_log', 'investors', 'thread_tracking', 'tracking', 'updates']

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!verifySession(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { schema } = req.query
  if (!schema) return res.status(400).json({ error: 'schema is required' })

  const db = getPool()
  const result = {}

  for (const table of TABLES) {
    try {
      const r = await db.query(`SELECT * FROM "${schema}"."${table}" LIMIT 500`)
      result[table] = { columns: r.fields.map(f => f.name), rows: r.rows }
    } catch (e) {
      result[table] = { columns: [], rows: [], error: e.message }
    }
  }

  return res.status(200).json(result)
}
