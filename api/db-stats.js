import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON)

  const [{ count: firms }, { count: investors }] = await Promise.all([
    supabase.from('firms').select('*', { count: 'exact', head: true }),
    supabase.from('investors').select('*', { count: 'exact', head: true }),
  ])

  return res.json({ firms, investors })
}
