import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

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
  ])

  return res.json({
    firms:      { total: totalFirms,     active: activeFirms,     inactive: inactiveFirms },
    investors:  { total: totalInvestors, active: activeInvestors, inactive: inactiveInvestors },
    antigravity: {
      totalEnriched,
      today: { total: enrichedToday,  active: activeFoundToday,  inactive: inactiveFoundToday },
      week:  { total: enrichedWeek,   active: activeFoundWeek,   inactive: inactiveFoundWeek },
    },
  })
}
