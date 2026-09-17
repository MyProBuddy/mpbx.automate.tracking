import pg from 'pg'
import { verifySession, setCors } from './_lib.js'

const { Pool } = pg

let pool

function getPool() {
  if (!pool) {
    pool = new Pool({
      host:     'aws-0-ap-southeast-1.pooler.supabase.com',
      port:     5432,
      database: 'postgres',
      user:     'postgres.rlylvkeasllpgtnvsrcp',
      password: 'AnishKrishnanAmrish@2026!',
      ssl:      { rejectUnauthorized: false },
    })
  }
  return pool
}

const EXCLUDED_SCHEMAS = ['auth', 'extensions', 'realtime', 'storage', 'vault', 'public']

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!verifySession(req)) return res.status(401).json({ error: 'Unauthorized' })

  if (!process.env.CLIENT_ANALYTICS_DB_URL) {
    return res.status(500).json({ error: 'CLIENT_ANALYTICS_DB_URL env var is not set' })
  }

  let db
  try {
    db = getPool()
  } catch (e) {
    return res.status(500).json({ error: `Pool init failed: ${e.message}` })
  }

  // Get all client schemas
  let schemaRows
  try {
    const result = await db.query(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name NOT IN (${EXCLUDED_SCHEMAS.map((_, i) => `$${i + 1}`).join(',')})
       AND schema_name NOT LIKE 'pg_%'
       ORDER BY schema_name`,
      EXCLUDED_SCHEMAS
    )
    schemaRows = result.rows
  } catch (e) {
    return res.status(500).json({ error: `DB query failed: ${e.message}` })
  }

  const clients = schemaRows.map(r => r.schema_name)

  if (req.query.type === 'clients') {
    return res.status(200).json({ clients })
  }

  // Get stats for each client
  const stats = await Promise.all(clients.map(async (schema) => {
    try {
      const [invRes, trackRes] = await Promise.all([
        db.query(`SELECT COUNT(*) AS total FROM "${schema}".investors`),
        db.query(`
          SELECT
            COUNT(*) FILTER (WHERE "followup count" > 0) AS contacted,
            COUNT(*) FILTER (WHERE reply_timestamp IS NOT NULL) AS replied,
            COUNT(*) FILTER (WHERE not_interested_outreach = true) AS rejected,
            COUNT(*) FILTER (WHERE escalation = true) AS escalated
          FROM "${schema}".tracking
        `),
      ])
      const t = trackRes.rows[0]
      return {
        client: schema,
        total_investors: parseInt(invRes.rows[0].total),
        contacted: parseInt(t.contacted) || 0,
        replied: parseInt(t.replied) || 0,
        rejected: parseInt(t.rejected) || 0,
        escalated: parseInt(t.escalated) || 0,
      }
    } catch {
      return { client: schema, total_investors: 0, contacted: 0, replied: 0, rejected: 0, escalated: 0 }
    }
  }))

  return res.status(200).json({ clients: stats })
}
