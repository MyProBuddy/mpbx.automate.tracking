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
    const { type = 'investors', status = 'all', page = '1', country = 'all' } = req.query
    const table = type === 'firms' ? 'firms' : 'investors'
    const pageNum = Math.max(1, parseInt(page))
    const pageSize = 5
    const from = (pageNum - 1) * pageSize
    let query = sb().from(table).select('*', { count: 'exact' }).range(from, from + pageSize - 1)
    if (status !== 'all') query = query.eq('activity_status', status)
    if (country !== 'all' && table === 'investors') query = query.eq('country', country)
    const { data, count, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data, total: count, page: pageNum, pageSize })
  }

  // ── ?action=investor-countries — distinct countries for dropdown ──────────
  if (action === 'investor-countries') {
    if (req.method !== 'GET') return res.status(405).end()
    const { data, error } = await sb().from('investors').select('country').not('country', 'is', null).neq('country', '').limit(10000)
    if (error) return res.status(500).json({ error: error.message })
    const counts = {}
    data.forEach(r => { counts[r.country] = (counts[r.country] || 0) + 1 })
    const countries = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }))
    return res.json({ countries })
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
