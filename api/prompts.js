import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('prompt_editor_tool')
      .select('*')
      .order('id', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'PATCH') {
    const { id, prompt, client_email, client_description } = req.body || {}
    // update description for all rows of a client
    if (client_email && client_description !== undefined) {
      const { error } = await supabase.from('prompt_editor_tool').update({ client_description }).eq('client_email', client_email)
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ ok: true })
    }
    if (!id) return res.status(400).json({ error: 'id is required' })
    const { error } = await supabase.from('prompt_editor_tool').update({ prompt }).eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  if (req.method === 'POST') {
    const { client_name, client_email, client_description } = req.body || {}
    if (!client_email) return res.status(400).json({ error: 'client_email is required' })

    const PROMPT_TYPES = ['outreach', 'outreach_followup', 'reply', 'reply_followup']
    const rows = PROMPT_TYPES.map(pt => ({
      client_name: client_name || null,
      client_email,
      client_description: client_description || null,
      prompt_type: pt,
      prompt: null,
    }))

    const { data, error } = await supabase.from('prompt_editor_tool').insert(rows).select()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  res.status(405).end()
}
