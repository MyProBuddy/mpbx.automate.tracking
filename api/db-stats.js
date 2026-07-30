import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON)

  const [
    { count: totalFirms },
    { count: activeFirms },
    { count: inactiveFirms },
    { count: totalInvestors },
    { count: activeInvestors },
    { count: inactiveInvestors },
    { data: geoRows },
  ] = await Promise.all([
    supabase.from('firms').select('*', { count: 'exact', head: true }),
    supabase.from('firms').select('*', { count: 'exact', head: true }).eq('activity_status', 'active'),
    supabase.from('firms').select('*', { count: 'exact', head: true }).eq('activity_status', 'inactive'),
    supabase.from('investors').select('*', { count: 'exact', head: true }),
    supabase.from('investors').select('*', { count: 'exact', head: true }).eq('activity_status', 'active'),
    supabase.from('investors').select('*', { count: 'exact', head: true }).eq('activity_status', 'inactive'),
    supabase.from('investors').select('geography_focus').not('geography_focus', 'is', null),
  ])

  // Count geography density
  const geoCounts = {}
  for (const row of geoRows || []) {
    const parts = row.geography_focus.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean)
    for (const part of parts) {
      if (part.length > 1) geoCounts[part] = (geoCounts[part] || 0) + 1
    }
  }

  const topGeo = Object.entries(geoCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  return res.json({
    firms:           { total: totalFirms,     active: activeFirms,     inactive: inactiveFirms },
    investors:       { total: totalInvestors, active: activeInvestors, inactive: inactiveInvestors },
    topGeographies:  topGeo,
  })
}
