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

  const { name } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name is required' })

  // sanitize: lowercase, spaces to underscores, only alphanumeric + underscore
  const schema = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  if (!schema) return res.status(400).json({ error: 'Invalid schema name' })

  const db = getPool()

  try {
    await db.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)

    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".config (
        weekly_sent_count integer DEFAULT 0,
        week_start_date timestamptz
      )
    `)
    await db.query(`INSERT INTO "${schema}".config (weekly_sent_count) VALUES (0)`)

    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".conversation_log (
        inv_id text,
        direction text,
        timestamp timestamptz DEFAULT now(),
        summary text
      )
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".investors (
        investor_id text NOT NULL,
        "First Name" text, "Last Name" text, "Title" text, "Company" text,
        "Email" text, "Corporate Phone" text, "Keywords" text,
        "Person Linkedin Url" text, "Website" text, "Company Address" text,
        "Company State" text, "Company Country" text, "Total Funding" text,
        "Latest Funding Amount" text, "Last Raised At" text, "Overview" text,
        "Primary Phone Number" text, "Crunchbase profile" text, "Fund stage" text,
        "Description" text, "Number of exists" text, "Number of Investments" text,
        "Portfolios" text, "Fund focus" text, "Check Size" text,
        "Fund description" text, "Portfolio Company's" text, "Sector focused" text,
        "Investment thesis" text, timezone_offset text, timezone_num text
      )
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".thread_tracking (
        inv_id text NOT NULL,
        email text,
        thread_ids text[],
        last_sent_at timestamptz
      )
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".tracking (
        inv_id text NOT NULL,
        "followup count" integer DEFAULT 0,
        "followup timestamps" text[] DEFAULT ARRAY['N/A','N/A','N/A','N/A'],
        reply_timestamp text DEFAULT 'N/A',
        not_interested_outreach boolean DEFAULT false,
        our_reply_sent_at text DEFAULT 'N/A',
        conversation_summary text DEFAULT '',
        post_reply_followup_count integer DEFAULT 0,
        post_reply_followup_sent_at text DEFAULT 'N/A',
        "admin notfication" boolean DEFAULT false,
        not_interested_reply boolean DEFAULT false,
        timezone text DEFAULT 'inactive',
        escalation boolean DEFAULT false
      )
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".updates (
        update text,
        timestamp timestamptz DEFAULT now()
      )
    `)

    return res.status(200).json({ ok: true, schema })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
