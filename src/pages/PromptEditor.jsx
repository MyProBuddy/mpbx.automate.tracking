import { useState, useEffect } from 'react'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'

const PROMPT_TYPES = ['outreach', 'outreach_followup', 'reply', 'reply_followup']
const TYPE_LABELS = {
  outreach:          'Outreach',
  outreach_followup: 'Outreach Followup',
  reply:             'Reply',
  reply_followup:    'Reply Followup',
}

function groupByClient(rows) {
  const map = {}
  for (const row of rows) {
    const key = row.client_email
    if (!map[key]) map[key] = { client_name: row.client_name, client_email: row.client_email, prompts: {} }
    map[key].prompts[row.prompt_type] = { id: row.id, text: row.prompt || '' }
  }
  return Object.values(map)
}

function AddClientModal({ onClose, onAdded }) {
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!email) { setError('Email is required'); return }
    setSaving(true)
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: name, client_email: email }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to add'); return }
    onAdded(email); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 36, width: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: '-0.02em', marginBottom: 24 }}>Add New Client</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Client Name</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Corp"
              style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Client Email <span style={{ color: T.accent }}>*</span></div>
            <input value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="client@example.com" required type="email"
              style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${error ? T.red : T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, outline: 'none', boxSizing: 'border-box' }} />
            {error && <div style={{ fontSize: 12, color: T.red, marginTop: 4 }}>{error}</div>}
          </div>
          <div style={{ fontSize: 12, color: T.muted, background: T.bg, borderRadius: 8, padding: '10px 12px' }}>
            4 prompt templates will be created: Outreach, Outreach Followup, Reply, Reply Followup.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.surface, fontSize: 13, fontWeight: 600, color: T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: T.accent, fontSize: 13, fontWeight: 700, color: '#fff', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Adding…' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PromptBlock({ promptType, data, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [text, setText]       = useState(data.text)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => { setText(data.text) }, [data.text])

  const save = async () => {
    setSaving(true)
    await fetch('/api/prompts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.id, prompt: text }),
    })
    setSaving(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onSaved()
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${editing ? T.accent : T.border}`, padding: '20px 24px', transition: 'border-color 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, letterSpacing: '-0.01em' }}>{TYPE_LABELS[promptType]}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              <button onClick={() => { setText(data.text); setEditing(false) }} style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: saved ? T.green : T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saved ? '✓ Saved' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
          style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: T.bg }} />
      ) : (
        text
          ? <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text}</div>
          : <div style={{ fontSize: 13, color: T.faint, fontStyle: 'italic' }}>No prompt yet — click Edit to add.</div>
      )}
    </div>
  )
}

export default function PromptEditor() {
  const [clients, setClients]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState('')
  const [showModal, setShowModal]     = useState(false)

  const load = async (selectEmail) => {
    setLoading(true)
    const res = await fetch('/api/prompts')
    const data = await res.json()
    const grouped = groupByClient(data)
    setClients(grouped)
    if (selectEmail) setSelected(selectEmail)
    else if (grouped.length && !selected) setSelected(grouped[0].client_email)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const activeClient = clients.find(c => c.client_email === selected)

  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans }}>
      <Nav title="Prompt Editor" backTo="/tools" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 48px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 8 }}>Tools</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: T.text, marginBottom: 6 }}>Prompt Editor</div>
            <div style={{ fontSize: 13, color: T.muted }}>Manage AI prompt templates per client.</div>
          </div>
          <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', background: T.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 6 }}>
            + Add Client
          </button>
        </div>

        {loading
          ? <div style={{ fontSize: 13, color: T.muted }}>Loading…</div>
          : clients.length === 0
            ? <div style={{ fontSize: 13, color: T.muted }}>No clients yet. Add one to get started.</div>
            : <>
                {/* Client selector */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Client</div>
                  <select
                    value={selected}
                    onChange={e => setSelected(e.target.value)}
                    style={{ padding: '10px 14px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, background: '#fff', outline: 'none', cursor: 'pointer', minWidth: 280 }}
                  >
                    {clients.map(c => (
                      <option key={c.client_email} value={c.client_email}>
                        {c.client_name ? `${c.client_name} — ${c.client_email}` : c.client_email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prompts for selected client */}
                {activeClient && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {PROMPT_TYPES.map(pt => (
                      activeClient.prompts[pt]
                        ? <PromptBlock key={pt} promptType={pt} data={activeClient.prompts[pt]} onSaved={() => load(selected)} />
                        : null
                    ))}
                  </div>
                )}
              </>
        }
      </div>

      {showModal && <AddClientModal onClose={() => setShowModal(false)} onAdded={email => load(email)} />}
    </div>
  )
}
