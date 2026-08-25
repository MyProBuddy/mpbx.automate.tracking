import { createClient } from '@supabase/supabase-js'
import { verifySession, setCors } from './_lib.js'

const sb = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  setCors(res, 'GET, POST, PATCH, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!verifySession(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { action } = req.query

  // ── ?action=config — return env-based config (no DB needed) ───────────────
  if (action === 'config') {
    if (req.method !== 'GET') return res.status(405).end()
    return res.json({
      googleClientId:  process.env.GOOGLE_CLIENT_ID,
      clientsFolderId: process.env.DRIVE_CLIENTS_FOLDER_ID,
      sheetsFolderId:  process.env.DRIVE_SHEETS_FOLDER_ID,
      templateSheetId: process.env.TEMPLATE_SHEET_ID,
    })
  }

  // ── ?action=data — paginated investors/firms table ────────────────────────
  if (action === 'data') {
    if (req.method !== 'GET') return res.status(405).end()
    const { type = 'investors', status = 'all', page = '1', country = 'all', fund_stage = 'all', has_email = 'all', batch = 'all', search = '' } = req.query
    const table = type === 'firms' ? 'firms' : 'investors'
    const pageNum = Math.max(1, parseInt(page))
    const pageSize = 5
    const from = (pageNum - 1) * pageSize
    let query = sb().from(table).select('*', { count: 'exact' }).range(from, from + pageSize - 1)
    if (table === 'investors') {
      if (status !== 'all') query = query.eq('activity_status', status)
      if (country !== 'all') query = query.eq('country', country)
      if (fund_stage !== 'all') query = query.eq('fund_stage', fund_stage)
      if (has_email === 'yes') query = query.not('email', 'is', null)
      if (has_email === 'no') query = query.is('email', null)
      if (batch === 'am') query = query.like('contact_id', 'AM%')
      if (batch === 'original') query = query.like('contact_id', 'i%')
      if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,firm_name_raw.ilike.%${search}%`)
    }
    const { data, count, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data, total: count, page: pageNum, pageSize })
  }

  // ── ?action=investor-stats — aggregate counts for filter UI ──────────────
  if (action === 'investor-stats') {
    if (req.method !== 'GET') return res.status(405).end()
    const supabase = sb()
    const [totalRes, activeRes, inactiveRes, withEmailRes, amRes, countryRes, stageRes] = await Promise.all([
      supabase.from('investors').select('contact_id', { count: 'exact', head: true }),
      supabase.from('investors').select('contact_id', { count: 'exact', head: true }).eq('activity_status', 'active'),
      supabase.from('investors').select('contact_id', { count: 'exact', head: true }).eq('activity_status', 'inactive'),
      supabase.from('investors').select('contact_id', { count: 'exact', head: true }).not('email', 'is', null),
      supabase.from('investors').select('contact_id', { count: 'exact', head: true }).like('contact_id', 'AM%'),
      supabase.from('investors').select('country').not('country', 'is', null).neq('country', '').limit(5000),
      supabase.from('investors').select('fund_stage').not('fund_stage', 'is', null).neq('fund_stage', '').limit(5000),
    ])
    const countryCounts = {}
    ;(countryRes.data || []).forEach(r => { countryCounts[r.country] = (countryCounts[r.country] || 0) + 1 })
    const stageCounts = {}
    ;(stageRes.data || []).forEach(r => { stageCounts[r.fund_stage] = (stageCounts[r.fund_stage] || 0) + 1 })
    const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([v, c]) => ({ value: v, count: c }))
    const topStages = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([v, c]) => ({ value: v, count: c }))
    return res.json({
      total: totalRes.count || 0,
      active: activeRes.count || 0,
      inactive: inactiveRes.count || 0,
      withEmail: withEmailRes.count || 0,
      amBatch: amRes.count || 0,
      countries: topCountries,
      stages: topStages,
    })
  }

  // ── ?action=states — get/set workflow state ───────────────────────────────
  if (action === 'states') {
    const supabase = sb()
    if (req.method === 'GET') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'id is required' })
      const { data, error } = await supabase.from('states').select('data').eq('id', id).single()
      if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message })
      return res.json(data.data)
    }
    if (req.method === 'POST') {
      const { id, data } = req.body || {}
      if (!id) return res.status(400).json({ error: 'id is required' })
      const { error } = await supabase.from('states').upsert({ id, data }, { onConflict: 'id' })
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ ok: true })
    }
    return res.status(405).end()
  }

  return res.status(400).json({ error: 'Missing or unknown ?action= parameter' })
}
