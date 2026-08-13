import pg from 'pg'
const { Client } = pg

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  const client = new Client({ connectionString: process.env.SUPABASE_CLIENT_DB_URL })
  await client.connect()

  try {
    // Get all client schemas (exclude system schemas)
    const schemaRes = await client.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN (
        'information_schema','pg_catalog','pg_toast','auth','extensions',
        'graphql','graphql_public','pgbouncer','realtime','storage','vault','public'
      )
      AND schema_name NOT LIKE 'pg_%'
      ORDER BY schema_name
    `)
    const schemas = schemaRes.rows.map(r => r.schema_name)

    // For each schema (client), compute outreach stats
    const clients = await Promise.all(schemas.map(async schema => {
      try {
        const [totalRes, trackRes] = await Promise.all([
          client.query(`SELECT COUNT(*) FROM "${schema}".investors`),
          client.query(`
            SELECT
              "followup count",
              reply_timestamp
            FROM "${schema}".tracking
          `),
        ])

        const total = parseInt(totalRes.rows[0].count, 10)
        const rows = trackRes.rows

        let initialSent = 0, f1 = 0, f2 = 0, f3 = 0, replies = 0
        rows.forEach(r => {
          const count = parseInt(r['followup count'], 10) || 0
          const hasReply = r.reply_timestamp && r.reply_timestamp.trim() !== '' && r.reply_timestamp.toUpperCase() !== 'N/A'
          if (count >= 1) initialSent++
          if (count >= 2) f1++
          if (count >= 3) f2++
          if (count >= 4) f3++
          if (hasReply) replies++
        })

        return { schema, total, initialSent, f1, f2, f3, replies }
      } catch {
        return { schema, error: true, total: 0, initialSent: 0, f1: 0, f2: 0, f3: 0, replies: 0 }
      }
    }))

    return res.json({ clients })
  } finally {
    await client.end()
  }
}
