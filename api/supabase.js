import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

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
    const { type = 'investors', status = 'all', page = '1' } = req.query
    const table = type === 'firms' ? 'firms' : 'investors'
    const pageNum = Math.max(1, parseInt(page))
    const pageSize = 5
    const from = (pageNum - 1) * pageSize
    let query = sb().from(table).select('*', { count: 'exact' }).range(from, from + pageSize - 1)
    if (status !== 'all') query = query.eq('activity_status', status)
    const { data, count, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data, total: count, page: pageNum, pageSize })
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
