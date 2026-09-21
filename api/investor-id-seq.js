import pg from 'pg'
import { verifySession, setCors } from './_lib.js'

const { Pool } = pg
let pool
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.CLIENT_ANALYTICS_DB_URL, ssl: { rejectUnauthorized: false } })
  return pool
}

export function schemaPrefix(schema) {
  return schema.split('_').map(w => w[0]?.toUpperCase()).filter(Boolean).join('')
}

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!verifySession(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { schema } = req.query
  if (!schema) return res.status(400).json({ error: 'schema required' })

  const prefix = schemaPrefix(schema)
  const db = getPool()

  try {
    const r = await db.query(
      `SELECT investor_id FROM "${schema}".investors WHERE investor_id LIKE $1`,
      [`${prefix}\\_%`]
    )
    let max = 0
    for (const row of r.rows) {
      const parts = row.investor_id.split('_')
      const num = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(num) && num > max) max = num
    }
    return res.json({ prefix, next: max + 1 })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
