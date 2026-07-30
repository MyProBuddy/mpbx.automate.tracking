import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON)

  const { type = 'investors', status = 'all', page = '1', limit = '20' } = req.query
  const table = type === 'firms' ? 'firms' : 'investors'
  const pageNum = Math.max(1, parseInt(page))
  const pageSize = Math.min(50, Math.max(1, parseInt(limit)))
  const from = (pageNum - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase.from(table).select('*', { count: 'exact' }).range(from, to)
  if (status !== 'all') query = query.eq('activity_status', status)

  const { data, count, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  return res.json({ data, total: count, page: pageNum, pageSize })
}
