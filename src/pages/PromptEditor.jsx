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
    onAdded(); onClose()
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

  const cancel = () => { setText(data.text); setEditing(false) }

  return (
    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{TYPE_LABELS[promptType]}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              <button onClick={cancel} style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: saved ? T.green : T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saved ? '✓ Saved' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={6}
          style={{
            width: '100%', padding: '10px 12px', border: `1.5px solid ${T.accent}`,
            borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text,
            lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            background: '#fff',
          }}
        />
      ) : (
        text
          ? <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text}</div>
          : <div style={{ fontSize: 13, color: T.faint, fontStyle: 'italic' }}>No prompt set yet — click Edit to add one.</div>
      )}
    </div>
  )
}

function ClientCard({ client, onSaved }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ background: T.surface, borderRadius: 14, border: `1.5px solid ${T.border}`, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 2 }}>{client.client_name || '—'}</div>
          <div style={{ fontSize: 12, color: T.muted, fontFamily: T.mono }}>{client.client_email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {PROMPT_TYPES.map(pt => (
              <span key={pt} style={{
                fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
                background: client.prompts[pt]?.text ? T.accentLight : T.bg,
                color: client.prompts[pt]?.text ? T.accent : T.faint,
              }}>{TYPE_LABELS[pt]}</span>
            ))}
          </div>
          <div style={{ fontSize: 18, color: T.muted }}>{open ? '−' : '+'}</div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {PROMPT_TYPES.map(pt => (
            client.prompts[pt]
              ? <PromptBlock key={pt} promptType={pt} data={client.prompts[pt]} onSaved={onSaved} />
              : null
          ))}
        </div>
      )}
    </div>
  )
}

export default function PromptEditor() {
  const [clients, setClients]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/prompts')
    const data = await res.json()
    setClients(groupByClient(data))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans }}>
      <Nav title="Prompt Editor" backTo="/tools" />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 44 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 8 }}>Tools</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: T.text, marginBottom: 6 }}>Prompt Editor</div>
            <div style={{ fontSize: 13, color: T.muted }}>Manage AI prompt templates per client.</div>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            padding: '10px 20px', background: T.accent, color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 6,
          }}>+ Add Client</button>
        </div>

        {loading
          ? <div style={{ fontSize: 13, color: T.muted }}>Loading…</div>
          : clients.length === 0
            ? <div style={{ fontSize: 13, color: T.muted }}>No clients yet. Add one to get started.</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {clients.map(c => <ClientCard key={c.client_email} client={c} onSaved={load} />)}
              </div>
        }
      </div>

      {showModal && <AddClientModal onClose={() => setShowModal(false)} onAdded={load} />}
    </div>
  )
}
