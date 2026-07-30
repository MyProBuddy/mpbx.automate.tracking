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

const PLACEHOLDER_OUTPUTS = {
  outreach: `Subject: Exploring a Partnership Opportunity with [Startup Name]

Hi [Investor First Name],

I hope this finds you well. I'm reaching out because [Startup Name] aligns closely with your focus on [Sector] investments, and I believe there's a compelling story worth sharing.

We're building [brief description of product], and we've seen strong early traction — [X]% MoM growth over the last quarter with [N] paying customers. Our team combines deep domain expertise with a clear path to [market opportunity].

Given your work with [Portfolio Company], I think you'd have a unique perspective on what we're building.

Would you be open to a 20-minute call next week?

Warm regards,
[Client Name]

— This is a placeholder output. Connect a real prompt to see actual AI-generated content.`,

  outreach_followup: `Subject: Re: Exploring a Partnership Opportunity with [Startup Name]

Hi [Investor First Name],

Just circling back on my note from last week — I know your inbox is busy, so I'll keep this brief.

We've just closed a small pre-seed round and are now opening conversations with a select group of investors for our seed. Given your track record in [Sector], I'd love to get your perspective.

Happy to share our deck if that's easier. Would a quick 15-minute call work for you?

Best,
[Client Name]

— This is a placeholder output. Connect a real prompt to see actual AI-generated content.`,

  reply: `Subject: Re: [Original Subject]

Hi [Investor First Name],

Thank you for getting back to me — really appreciate it.

To answer your question about [their question], we've approached this by [answer]. Our current metrics back this up: [relevant stat].

On the market size point — we're targeting a [$X]B TAM, with our initial wedge focused on [niche segment] where we already have strong product-market fit.

I'd love to walk you through our deck and answer any other questions you might have. Are you free for a 30-minute call this week or next?

Looking forward to connecting.

Best,
[Client Name]

— This is a placeholder output. Connect a real prompt to see actual AI-generated content.`,

  reply_followup: `Subject: Re: [Original Subject]

Hi [Investor First Name],

I wanted to follow up on our last exchange — I know things get busy, so no worries if the timing isn't right.

We've had a few exciting developments since we last spoke: [one-line update]. I think it adds to the story we discussed.

Would love to reconnect when you have a moment. Even a quick 15-minute call would be great.

Best,
[Client Name]

— This is a placeholder output. Connect a real prompt to see actual AI-generated content.`,
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
  const [editing, setEditing]   = useState(false)
  const [text, setText]         = useState(data.text)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [showTest, setShowTest] = useState(false)

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
    <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${editing ? T.accent : T.border}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{TYPE_LABELS[promptType]}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setShowTest(s => !s); setEditing(false) }}
            style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: showTest ? T.accentLight : T.surface, color: showTest ? T.accent : T.muted, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {showTest ? 'Hide Test' : 'Test Prompt'}
          </button>
          {!showTest && (editing ? (
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
          ))}
        </div>
      </div>

      {/* Body */}
      {showTest ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 280 }}>
          {/* Prompt side */}
          <div style={{ padding: '20px 24px', borderRight: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>Prompt</div>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {text || <span style={{ color: T.faint, fontStyle: 'italic' }}>No prompt set yet.</span>}
            </div>
          </div>
          {/* Output side */}
          <div style={{ padding: '20px 24px', background: T.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Sample Output</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 99, padding: '2px 8px', letterSpacing: '0.05em' }}>PLACEHOLDER</span>
            </div>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.9, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>
              {PLACEHOLDER_OUTPUTS[promptType]}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px 24px' }}>
          {editing ? (
            <textarea value={text} onChange={e => setText(e.target.value)} rows={7}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: T.bg }} />
          ) : (
            text
              ? <div style={{ fontSize: 13, color: T.text, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{text}</div>
              : <div style={{ fontSize: 13, color: T.faint, fontStyle: 'italic' }}>No prompt yet — click Edit to add.</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PromptEditor() {
  const [clients, setClients]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState('')
  const [showModal, setShowModal] = useState(false)

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
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '40px 48px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 8 }}>Tools</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: T.text, marginBottom: 6 }}>Prompt Editor</div>
            <div style={{ fontSize: 13, color: T.muted }}>Manage and test AI prompt templates per client.</div>
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
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Client</div>
                  <select value={selected} onChange={e => setSelected(e.target.value)}
                    style={{ padding: '10px 14px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, background: '#fff', outline: 'none', cursor: 'pointer', minWidth: 320 }}>
                    {clients.map(c => (
                      <option key={c.client_email} value={c.client_email}>
                        {c.client_name || c.client_email}
                      </option>
                    ))}
                  </select>
                </div>

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
