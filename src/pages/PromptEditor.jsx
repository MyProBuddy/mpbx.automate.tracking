import { useState, useEffect } from 'react'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'

const SAMPLE_INVESTOR = {
  id: 'WZ-001',
  first_name: 'David',
  last_name: 'Waroquier',
  title: 'Partner',
  firm: 'Mangrove Capital Partners',
  email: 'davidw@oakland.partners',
  sectors: 'Fintech, SaaS, Cybersecurity, AI, Web3',
  linkedin: 'https://www.linkedin.com/in/davidwaroquier/',
  website: 'https://www.mangrove.vc',
  firm_full: 'Mangrove Capital Partners, Luxembourg',
  city: 'Luxembourg',
  country: 'Luxembourg',
  aum: '$1B',
  fund_size: '$170M',
  bio: 'Mangrove Capital Partners is a leading contrarian, early-stage venture capital firm based in Luxembourg. Partner David Waroquier is also associated with Oakland Partners.',
  crunchbase: 'https://www.crunchbase.com/organization/mangrove-capital-partners',
  stages: 'Seed, Series A',
  thesis: 'Early-stage venture capital firm investing in transformational technology ideas across Europe.',
  portfolio_count: '50+',
  notable_investments: 'Skype, Wix, Flo Health, WalkMe, K Health, TBOL',
  focus_areas: 'Fintech, SaaS, AI, Consumer Tech',
  check_size: '$1M-$5M',
  fund_name: 'Mangrove Capital Partners Funds',
  exits: 'Skype, Wix, Flo Health',
  mandate: 'Partner with bold entrepreneurs building global transformational tech platforms',
  timezone: 'UTC+1',
}

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
  const [editing, setEditing]     = useState(false)
  const [text, setText]           = useState(data.text)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [showTest, setShowTest]   = useState(false)
  const [generating, setGenerating] = useState(false)
  const [output, setOutput]       = useState(null)  // { subject, body } | null
  const [genError, setGenError]   = useState(null)

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

  const runTest = async () => {
    setGenerating(true)
    setOutput(null)
    setGenError(null)
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investor_data: SAMPLE_INVESTOR, client_prompt: text }),
      })
      const json = await res.json()
      if (!res.ok) { setGenError(json.error || 'Generation failed'); return }
      setOutput(json)
    } catch (e) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const openTest = () => {
    setShowTest(s => {
      if (!s) { setOutput(null); setGenError(null) }
      return !s
    })
    setEditing(false)
  }

  const [leftTab, setLeftTab] = useState('prompt') // 'prompt' | 'investor'

  const tabBtn = (id, label) => (
    <button onClick={() => setLeftTab(id)} style={{
      fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 6, border: 'none',
      background: leftTab === id ? T.accentLight : 'transparent',
      color: leftTab === id ? T.accent : T.muted,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  )

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${showTest ? T.accent : editing ? T.accent : T.border}`, overflow: 'hidden', transition: 'border-color 0.15s', height: 500, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${T.border}`, background: '#FAFAFA' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{TYPE_LABELS[promptType]}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={openTest}
            style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 6, border: `1px solid ${showTest ? T.accent : T.border}`, background: showTest ? T.accentLight : '#fff', color: showTest ? T.accent : T.muted, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {showTest ? 'Done' : 'Test Prompt'}
          </button>
          {!showTest && (editing ? (
            <>
              <button onClick={() => { setText(data.text); setEditing(false) }} style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: saved ? T.green : T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saved ? '✓ Saved' : 'Edit'}
            </button>
          ))}
        </div>
      </div>

      {/* Edit / preview body */}
      {!showTest && (
        <div className="no-scroll" style={{ padding: '20px 24px 12px', flex: 1, overflowY: 'auto' }}>
          {editing ? (
            <textarea value={text} onChange={e => setText(e.target.value)} rows={12}
              style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${T.accent}`, borderRadius: 8, fontSize: 12, fontFamily: T.mono, color: T.text, lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: '#FDFCFF' }} />
          ) : (
            text
              ? <pre style={{ fontSize: 12, color: T.text, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: T.mono, margin: 0, background: T.bg, borderRadius: 8, padding: '12px 14px' }}>{text}</pre>
              : <div style={{ fontSize: 13, color: T.faint, fontStyle: 'italic' }}>No prompt yet — click Edit to add.</div>
          )}
        </div>
      )}

      {/* Test panel */}
      {showTest && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>

          {/* LEFT — tabs: Prompt | Investor */}
          <div style={{ borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${T.border}`, background: '#FAFAFA' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {tabBtn('prompt', 'Prompt')}
                {tabBtn('investor', 'Investor Data')}
              </div>
              <button
                onClick={runTest}
                disabled={generating}
                style={{ fontSize: 11, fontWeight: 700, padding: '5px 18px', borderRadius: 6, border: 'none', background: generating ? T.faint : T.accent, color: '#fff', cursor: generating ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {generating
                  ? <><span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Generating…</>
                  : '▶ Run'}
              </button>
            </div>

            {/* Tab content */}
            <div className="hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 12px' }}>
              {leftTab === 'prompt' && (
                text
                  ? <pre style={{ fontSize: 11, color: T.text, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: T.mono, margin: 0 }}>{text}</pre>
                  : <div style={{ fontSize: 13, color: T.faint, fontStyle: 'italic' }}>No prompt set — go back and click Edit to add one.</div>
              )}
              {leftTab === 'investor' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(SAMPLE_INVESTOR).map(([k, v]) => (
                    <div key={k} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, fontSize: 12 }}>
                      <span style={{ color: T.faint, fontFamily: T.mono, fontSize: 11, paddingTop: 1 }}>{k}</span>
                      <span style={{ color: T.text, lineHeight: 1.5, wordBreak: 'break-word' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — output */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 20px', borderBottom: `1px solid ${T.border}`, background: '#FAFAFA', fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Generated Output
            </div>
            <div className="hide-scroll" style={{ flex: 1, padding: '16px 18px 12px', overflowY: 'auto' }}>
              {!output && !genError && !generating && (
                <div style={{ fontSize: 13, color: T.faint, fontStyle: 'italic' }}>Click ▶ Run to generate a real email via Gemini.</div>
              )}

              {generating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: T.muted }}>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: `2px solid ${T.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Calling Gemini API…
                </div>
              )}

              {genError && (
                <div style={{ fontSize: 12, color: T.red, background: '#FEF2F2', borderRadius: 8, padding: '12px 14px', lineHeight: 1.6, border: `1px solid #FECACA` }}>
                  <span style={{ fontWeight: 700 }}>Error: </span>{genError}
                </div>
              )}

              {output && (
                <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, background: '#F8F8FC' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Subject</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.5 }}>{output.subject}</div>
                  </div>
                  <div style={{ padding: '16px 16px' }}>
                    <div style={{ fontSize: 13, color: T.text, lineHeight: 2, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>{output.body}</div>
                  </div>
                  {output.signature && (
                    <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, background: '#FAFAFA' }}>
                      <div style={{ fontSize: 11, color: T.muted, whiteSpace: 'pre-wrap', fontFamily: T.mono }}>{output.signature}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
