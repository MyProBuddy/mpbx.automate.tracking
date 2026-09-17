import pg from 'pg'
import { verifySession, setCors } from './_lib.js'

const { Pool } = pg

let pool

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.CLIENT_ANALYTICS_DB_URL, ssl: { rejectUnauthorized: false } })
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

  // Get only schemas that have all 6 required client tables
  const REQUIRED_TABLES = ['config', 'conversation_log', 'investors', 'thread_tracking', 'tracking', 'updates']
  let schemaRows
  try {
    const result = await db.query(
      `SELECT table_schema AS schema_name
       FROM information_schema.tables
       WHERE table_schema NOT IN (${EXCLUDED_SCHEMAS.map((_, i) => `$${i + 1}`).join(',')})
       AND table_schema NOT LIKE 'pg_%'
       AND table_name = ANY($${EXCLUDED_SCHEMAS.length + 1})
       GROUP BY table_schema
       HAVING COUNT(DISTINCT table_name) = $${EXCLUDED_SCHEMAS.length + 2}
       ORDER BY table_schema`,
      [...EXCLUDED_SCHEMAS, REQUIRED_TABLES, REQUIRED_TABLES.length]
    )
    schemaRows = result.rows
  } catch (e) {
    return res.status(500).json({ error: `DB query failed: ${e.message}` })
  }

  const clients = schemaRows.map(r => r.schema_name)

  if (req.query.type === 'clients') {
    return res.status(200).json({ clients })
  }

  // Detail view for a single client
  if (req.query.client) {
    const schema = req.query.client
    if (!clients.includes(schema)) return res.status(404).json({ error: 'Client not found' })
    try {
      const [funnelRes, result] = await Promise.all([
        db.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE "followup count" >= 1) AS contacted,
            COUNT(*) FILTER (WHERE "followup count" >= 2) AS in_followup,
            COUNT(*) FILTER (WHERE reply_timestamp IS NOT NULL AND reply_timestamp != 'N/A' AND reply_timestamp != '') AS replied,
            COUNT(*) FILTER (WHERE our_reply_sent_at IS NOT NULL AND our_reply_sent_at != 'N/A' AND our_reply_sent_at != '') AS mid_convo,
            COUNT(*) FILTER (WHERE escalation = true) AS escalated,
            COUNT(*) FILTER (WHERE not_interested_outreach = true) AS rejected,
            COUNT(*) FILTER (
              WHERE "followup timestamps"[1] != 'N/A'
              AND "followup timestamps"[1] != ''
              AND ("followup timestamps"[1])::timestamptz >= date_trunc('week', now())
            ) AS outreach_this_week,
            COUNT(*) FILTER (
              WHERE (
                ("followup timestamps"[2] != 'N/A' AND "followup timestamps"[2] != '' AND ("followup timestamps"[2])::timestamptz >= date_trunc('week', now()))
                OR ("followup timestamps"[3] != 'N/A' AND "followup timestamps"[3] != '' AND ("followup timestamps"[3])::timestamptz >= date_trunc('week', now()))
                OR ("followup timestamps"[4] != 'N/A' AND "followup timestamps"[4] != '' AND ("followup timestamps"[4])::timestamptz >= date_trunc('week', now()))
              )
            ) AS followups_this_week
          FROM "${schema}".tracking
        `),
        db.query(`
        SELECT
          i.investor_id,
          i."First Name", i."Last Name", i."Email", i."Company", i."Title",
          i."Fund focus", i."Fund stage", i."Check Size", i."Person Linkedin Url",
          t."followup count", t.reply_timestamp, t.not_interested_outreach,
          t.escalation, t."followup timestamps", t.conversation_summary
        FROM "${schema}".investors i
        LEFT JOIN "${schema}".tracking t ON t.inv_id = i.investor_id
        ORDER BY t."followup count" DESC NULLS LAST, i."First Name"
        `),
      ])
      const f = funnelRes.rows[0]
      const funnel = {
        total:      parseInt(f.total)      || 0,
        contacted:  parseInt(f.contacted)  || 0,
        in_followup: parseInt(f.in_followup) || 0,
        replied:    parseInt(f.replied)    || 0,
        mid_convo:  parseInt(f.mid_convo)  || 0,
        escalated:          parseInt(f.escalated)          || 0,
        rejected:           parseInt(f.rejected)           || 0,
        outreach_this_week: parseInt(f.outreach_this_week) || 0,
        followups_this_week: parseInt(f.followups_this_week) || 0,
      }
      return res.status(200).json({ investors: result.rows, funnel })
    } catch (e) {
      return res.status(500).json({ error: `Detail query failed: ${e.message}` })
    }
  }

  // Get stats for each client
  const stats = await Promise.all(clients.map(async (schema) => {
    try {
      const [invRes, trackRes, followupRes] = await Promise.all([
        db.query(`SELECT COUNT(*) AS total FROM "${schema}".investors`),
        db.query(`
          SELECT
            COUNT(*) FILTER (WHERE "followup count" > 0) AS contacted,
            COUNT(*) FILTER (WHERE reply_timestamp IS NOT NULL AND reply_timestamp != 'N/A' AND reply_timestamp != '') AS replied,
            COUNT(*) FILTER (WHERE not_interested_outreach = true) AS rejected,
            COUNT(*) FILTER (WHERE escalation = true) AS escalated
          FROM "${schema}".tracking
        `),
        db.query(`
          SELECT
            COUNT(*) FILTER (WHERE "followup count" >= 2) AS f1,
            COUNT(*) FILTER (WHERE "followup count" >= 3) AS f2,
            COUNT(*) FILTER (WHERE "followup count" >= 4) AS f3,
            COUNT(*) FILTER (WHERE "followup count" >= 5) AS f4
          FROM "${schema}".tracking
        `),
      ])
      const t = trackRes.rows[0]
      const f = followupRes.rows[0]
      const followups = {}
      for (let i = 1; i <= 4; i++) {
        const cnt = parseInt(f[`f${i}`]) || 0
        if (cnt > 0) followups[i] = cnt
      }
      return {
        client: schema,
        total_investors: parseInt(invRes.rows[0].total),
        contacted: parseInt(t.contacted) || 0,
        replied: parseInt(t.replied) || 0,
        rejected: parseInt(t.rejected) || 0,
        escalated: parseInt(t.escalated) || 0,
        followups,
      }
    } catch {
      return { client: schema, total_investors: 0, contacted: 0, replied: 0, rejected: 0, escalated: 0, total_followups: 0, followups: {} }
    }
  }))

  return res.status(200).json({ clients: stats })
}
