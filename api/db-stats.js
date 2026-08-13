import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
const { Client } = pg

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  // Route: /api/db-stats?source=clients — returns per-schema outreach stats
  if (req.query.source === 'clients') {
    const client = new Client({ connectionString: process.env.SUPABASE_CLIENT_DB_URL })
    await client.connect()
    try {
      const schemaRes = await client.query(`
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name NOT IN (
          'information_schema','pg_catalog','pg_toast','auth','extensions',
          'graphql','graphql_public','pgbouncer','realtime','storage','vault','public',
          'client_schema_name'
        )
        AND schema_name NOT LIKE 'pg_%'
        ORDER BY schema_name
      `)
      const schemas = schemaRes.rows.map(r => r.schema_name)
      const clients = await Promise.all(schemas.map(async schema => {
        try {
          const [totalRes, trackRes] = await Promise.all([
            client.query(`SELECT COUNT(*) FROM "${schema}".investors`),
            client.query(`SELECT "followup count", reply_timestamp FROM "${schema}".tracking`),
          ])
          const total = parseInt(totalRes.rows[0].count, 10)
          let initialSent = 0, f1 = 0, f2 = 0, f3 = 0, replies = 0
          trackRes.rows.forEach(r => {
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

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const [
    { count: totalFirms },
    { count: activeFirms },
    { count: inactiveFirms },
    { count: totalInvestors },
    { count: activeInvestors },
    { count: inactiveInvestors },
    { count: enrichedToday },
    { count: enrichedWeek },
    { count: activeFoundToday },
    { count: inactiveFoundToday },
    { count: activeFoundWeek },
    { count: inactiveFoundWeek },
    { count: totalEnriched },
    { count: activeAllTime },
    { count: inactiveAllTime },
  ] = await Promise.all([
    supabase.from('firms').select('*', { count: 'exact', head: true }),
    supabase.from('firms').select('*', { count: 'exact', head: true }).eq('activity_status', 'active'),
    supabase.from('firms').select('*', { count: 'exact', head: true }).eq('activity_status', 'inactive'),
    supabase.from('investors').select('*', { count: 'exact', head: true }),
    supabase.from('investors').select('*', { count: 'exact', head: true }).eq('activity_status', 'active'),
    supabase.from('investors').select('*', { count: 'exact', head: true }).eq('activity_status', 'inactive'),
    supabase.from('antigravity_status').select('*', { count: 'exact', head: true }).gte('last_enrichment_date', todayStart.toISOString()),
    supabase.from('antigravity_status').select('*', { count: 'exact', head: true }).gte('last_enrichment_date', weekStart.toISOString()),
    supabase.from('antigravity_status').select('*', { count: 'exact', head: true }).gte('last_enrichment_date', todayStart.toISOString()).eq('activity_status', 'active'),
    supabase.from('antigravity_status').select('*', { count: 'exact', head: true }).gte('last_enrichment_date', todayStart.toISOString()).eq('activity_status', 'inactive'),
    supabase.from('antigravity_status').select('*', { count: 'exact', head: true }).gte('last_enrichment_date', weekStart.toISOString()).eq('activity_status', 'active'),
    supabase.from('antigravity_status').select('*', { count: 'exact', head: true }).gte('last_enrichment_date', weekStart.toISOString()).eq('activity_status', 'inactive'),
    supabase.from('antigravity_status').select('*', { count: 'exact', head: true }),
    supabase.from('antigravity_status').select('*', { count: 'exact', head: true }).eq('activity_status', 'active'),
    supabase.from('antigravity_status').select('*', { count: 'exact', head: true }).eq('activity_status', 'inactive'),
  ])

  return res.json({
    firms:      { total: totalFirms,     active: activeFirms,     inactive: inactiveFirms },
    investors:  { total: totalInvestors, active: activeInvestors, inactive: inactiveInvestors },
    antigravity: {
      totalEnriched,
      today:   { total: enrichedToday, active: activeFoundToday,  inactive: inactiveFoundToday },
      week:    { total: enrichedWeek,  active: activeFoundWeek,   inactive: inactiveFoundWeek },
      allTime: { total: totalEnriched, active: activeAllTime,     inactive: inactiveAllTime },
    },
  })
}
