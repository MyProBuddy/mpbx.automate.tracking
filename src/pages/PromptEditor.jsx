import { useState, useEffect, useMemo } from 'react'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'

const FONT  = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FS    = { h: 32, sh: 18, c: 14, sc: 12 }
const INK   = '#1a1a1a'
const MUTED = '#626260'
const LINE  = 'rgba(0,0,0,0.08)'

const NEU_BG     = '#F0F0F0'
const NEU_SURF   = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHADOW = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const NEU_BTN    = '-4px -4px 10px rgba(255,255,255,0.9), 4px 4px 10px rgba(0,0,0,0.10)'
import { listClientFolders, listFolderFiles, getFileContent, getSheetTabs, getSheetValues, listClientSheets } from '../google.js'

// Simple LCS-based line diff — returns array of {type:'eq'|'del'|'ins', line, oldNo, newNo}
function computeDiff(oldText, newText) {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const m = a.length, n = b.length
  // LCS table
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1])

  const hunks = []
  let i = 0, j = 0, oldNo = 1, newNo = 1
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) {
      hunks.push({ type: 'eq', line: a[i], oldNo: oldNo++, newNo: newNo++ }); i++; j++
    } else if (j < n && (i >= m || dp[i][j+1] >= dp[i+1][j])) {
      hunks.push({ type: 'ins', line: b[j], newNo: newNo++ }); j++
    } else {
      hunks.push({ type: 'del', line: a[i], oldNo: oldNo++ }); i++
    }
  }
  return hunks
}

// Collapse unchanged runs into collapsed blocks, keep 3 context lines around changes
function collapseContext(hunks, ctx = 3) {
  const changed = new Set(hunks.map((h, i) => h.type !== 'eq' ? i : -1).filter(x => x >= 0))
  const visible = new Set()
  for (const ci of changed)
    for (let d = -ctx; d <= ctx; d++) { const x = ci + d; if (x >= 0 && x < hunks.length) visible.add(x) }

  const result = []
  let skipped = 0
  for (let i = 0; i < hunks.length; i++) {
    if (visible.has(i)) {
      if (skipped > 0) { result.push({ type: 'collapse', count: skipped }); skipped = 0 }
      result.push(hunks[i])
    } else skipped++
  }
  if (skipped > 0) result.push({ type: 'collapse', count: skipped })
  return result
}

function DiffModal({ original, updated, promptType, onConfirm, onCancel, saving }) {
  const hunks = useMemo(() => collapseContext(computeDiff(original, updated)), [original, updated])
  const added   = hunks.filter(h => h.type === 'ins').length
  const removed = hunks.filter(h => h.type === 'del').length

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 780, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 60px rgba(0,0,0,0.18)' }}>

        {/* Modal header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK }}>Review Changes</div>
            <div style={{ fontSize: FS.sc, color: MUTED, marginTop: 3 }}>
              {TYPE_LABELS[promptType]} prompt &nbsp;·&nbsp;
              <span style={{ color: '#16a34a', fontWeight: 700 }}>+{added}</span>
              &nbsp;
              <span style={{ color: '#dc2626', fontWeight: 700 }}>−{removed}</span>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 20, color: T.faint, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Diff view */}
        <div className="hide-scroll" style={{ overflowY: 'auto', flex: 1, fontFamily: T.mono, fontSize: 12, lineHeight: 1.7 }}>
          {/* file header bar */}
          <div style={{ padding: '8px 16px', background: '#F6F8FA', borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.muted, fontFamily: T.sans }}>
            prompt_template.txt
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {hunks.map((h, idx) => {
                if (h.type === 'collapse') return (
                  <tr key={idx} style={{ background: '#F6F8FA' }}>
                    <td colSpan={3} style={{ padding: '4px 16px', fontSize: 11, color: T.muted, fontFamily: T.sans, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
                      ··· {h.count} unchanged line{h.count !== 1 ? 's' : ''} ···
                    </td>
                  </tr>
                )
                const bg    = h.type === 'ins' ? '#f0fdf4' : h.type === 'del' ? '#fef2f2' : '#fff'
                const color = h.type === 'ins' ? '#16a34a' : h.type === 'del' ? '#dc2626' : T.faint
                const sign  = h.type === 'ins' ? '+' : h.type === 'del' ? '−' : ' '
                return (
                  <tr key={idx} style={{ background: bg }}>
                    <td style={{ width: 42, padding: '1px 10px', textAlign: 'right', color: T.faint, userSelect: 'none', borderRight: `1px solid ${T.border}`, fontSize: 11 }}>{h.oldNo ?? ''}</td>
                    <td style={{ width: 42, padding: '1px 10px', textAlign: 'right', color: T.faint, userSelect: 'none', borderRight: `1px solid ${T.border}`, fontSize: 11 }}>{h.newNo ?? ''}</td>
                    <td style={{ padding: '1px 14px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      <span style={{ color, fontWeight: h.type !== 'eq' ? 600 : 400, marginRight: 8, userSelect: 'none' }}>{sign}</span>
                      <span style={{ color: h.type === 'eq' ? T.text : color }}>{h.line}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onCancel} style={{ padding: '9px 20px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: '#fff', fontSize: 13, fontWeight: 600, color: T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onConfirm} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: T.accent, fontSize: 13, fontWeight: 700, color: '#fff', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Saving…' : 'Confirm & Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
    if (!map[key]) map[key] = { client_name: row.client_name, client_email: row.client_email, client_description: row.client_description || '', prompts: {} }
    map[key].prompts[row.prompt_type] = { id: row.id, text: row.prompt || '' }
  }
  return Object.values(map)
}

function AddClientModal({ onClose, onAdded }) {
  const [name, setName]           = useState('')
  const [description, setDesc]    = useState('')
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!name.trim()) { setError('Client name is required'); return }
    setSaving(true)
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: name.trim(), client_email: clientId, client_description: description.trim() }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to add'); return }
    onAdded(clientId); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 36, width: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, marginBottom: 24 }}>Add New Client</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Client Name <span style={{ color: T.accent }}>*</span></div>
            <input value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="e.g. Acme Corp" autoFocus
              style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${error ? T.red : T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, outline: 'none', boxSizing: 'border-box' }} />
            {error && <div style={{ fontSize: 12, color: T.red, marginTop: 4 }}>{error}</div>}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Description</div>
            <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="Optional notes about this client…" rows={3}
              style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
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

function EditDescriptionModal({ client, onClose, onSaved }) {
  const [description, setDesc] = useState(client.client_description || '')
  const [saving, setSaving]    = useState(false)

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/prompts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_email: client.client_email, client_description: description.trim() }),
    })
    setSaving(false)
    onSaved(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 36, width: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, marginBottom: 6 }}>Edit Description</div>
        <div style={{ fontSize: FS.c, color: MUTED, marginBottom: 24 }}>{client.client_name}</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="Optional notes about this client…" rows={4} autoFocus
            style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.surface, fontSize: 13, fontWeight: 600, color: T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: T.accent, fontSize: 13, fontWeight: 700, color: '#fff', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const HAS_FILES_TAB = ['outreach_followup', 'reply_followup']

function PromptBlock({ promptType, data, onSaved, clientEmail }) {
  const [text, setText]             = useState(data.text)
  const [saving, setSaving]         = useState(false)
  const [showDiff, setShowDiff]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [output, setOutput]         = useState(null)
  const [genError, setGenError]     = useState(null)
  const [model, setModel]           = useState('gemini-3.1-flash-lite-preview')
  const [models, setModels]         = useState([{ value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite Preview' }])
  const [investorText, setInvestorText] = useState(JSON.stringify(SAMPLE_INVESTOR, null, 2))
  const [investorError, setInvestorError] = useState(null)

  // Files tab state
  const [folders,        setFolders]        = useState([])
  const [selectedFolder, setSelectedFolder] = useState('')
  const [folderFiles,    setFolderFiles]    = useState([])
  const [mdFileId,       setMdFileId]       = useState('')
  const [filesLoading,   setFilesLoading]   = useState(false)
  const [filesSaved,     setFilesSaved]     = useState(false)

  // Company updates tab state
  const [sheets,          setSheets]         = useState([])
  const [selectedSheet,   setSelectedSheet]  = useState('')
  const [updates,         setUpdates]        = useState([])
  const [updatesLoading,  setUpdatesLoading] = useState(false)
  const [updatesSaved,    setUpdatesSaved]   = useState(false)

  // Previous mail (outreach_followup only)
  const [prevMail,       setPrevMail]       = useState(null)

  const stateKey = `prompt_editor.${clientEmail}.${promptType}.files`

  // load previous outreach mail for outreach_followup + listen for live updates
  useEffect(() => {
    if (promptType !== 'outreach_followup') return
    const key = `prompt_editor.${clientEmail}.outreach.output`
    fetch(`/api/states?id=${encodeURIComponent(key)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.subject || d?.body) setPrevMail(d) })
      .catch(() => {})
    const handler = e => { if (e.detail.clientEmail === clientEmail) setPrevMail(e.detail.data) }
    window.addEventListener('outreach-output-saved', handler)
    return () => window.removeEventListener('outreach-output-saved', handler)
  }, [promptType, clientEmail])

  // load saved state + folders when files tab is relevant
  useEffect(() => {
    if (!HAS_FILES_TAB.includes(promptType)) return
    // load saved state
    fetch(`/api/states?id=${encodeURIComponent(stateKey)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.mdFileId) setMdFileId(d.mdFileId)
        if (d?.folderId) setSelectedFolder(d.folderId)
      }).catch(() => {})
    // load drive folders
    listClientFolders().then(setFolders).catch(() => {})
  }, [promptType, clientEmail])

  // load files when folder changes
  useEffect(() => {
    if (!selectedFolder) return
    setFilesLoading(true)
    listFolderFiles(selectedFolder).then(setFolderFiles).catch(() => []).finally(() => setFilesLoading(false))
  }, [selectedFolder])

  // load sheets list + restore saved sheet selection (outreach_followup only)
  const updatesStateKey = `prompt_editor.${clientEmail}.outreach_followup.updates`
  useEffect(() => {
    if (promptType !== 'outreach_followup') return
    listClientSheets().then(setSheets).catch(() => {})
    fetch(`/api/states?id=${encodeURIComponent(updatesStateKey)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.sheetId) setSelectedSheet(d.sheetId) })
      .catch(() => {})
  }, [promptType, clientEmail])

  // load updates when selected sheet changes
  useEffect(() => {
    if (!selectedSheet) return
    setUpdatesLoading(true)
    setUpdates([])
    getSheetTabs(selectedSheet).then(async tabs => {
      const updTab = tabs.find(t => /updates?/i.test(t.title))
      if (!updTab) { setUpdatesLoading(false); return }
      const values = await getSheetValues(selectedSheet, `${updTab.title}!A1:Z200`)
      setUpdates((values || []).slice(1).filter(r => r.some(Boolean)))
    }).catch(() => {}).finally(() => setUpdatesLoading(false))
  }, [selectedSheet])

  async function saveUpdatesState() {
    await fetch('/api/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: updatesStateKey, data: { sheetId: selectedSheet } }),
    })
    setUpdatesSaved(true)
    setTimeout(() => setUpdatesSaved(false), 2000)
  }

  async function saveFilesState() {
    await fetch('/api/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: stateKey, data: { folderId: selectedFolder, mdFileId } }),
    })
    setFilesSaved(true)
    setTimeout(() => setFilesSaved(false), 2000)
  }

  useEffect(() => {
    fetch('/api/gemini-models')
      .then(r => r.json())
      .then(d => { if (d.models?.length) setModels(d.models) })
      .catch(() => {})
  }, [])

  useEffect(() => { setText(data.text) }, [data.text])

  const dirty = text !== data.text

  const confirmSave = async () => {
    setSaving(true)
    await fetch('/api/prompts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.id, prompt: text }),
    })
    setSaving(false)
    setShowDiff(false)
    onSaved()
  }

  const runTest = async () => {
    let investorData
    try { investorData = JSON.parse(investorText) } catch {
      setGenError('Investor data is not valid JSON'); return
    }
    setGenerating(true)
    setOutput(null)
    setGenError(null)
    try {
      const body = { investor_data: investorData, client_prompt: text, model }
      if (promptType === 'outreach_followup') {
        if (prevMail) body.previous_mail = prevMail
        if (mdFileId) {
          const mdFile = folderFiles.find(f => f.id === mdFileId)
          try { body.md_file_content = await getFileContent(mdFileId, mdFile?.mimeType) } catch {}
        }
        if (updates.length > 0) {
          body.company_updates = updates.map(r => r.filter(Boolean).join(' | ')).join('\n')
        }
      }
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setGenError(json.error || 'Generation failed'); return }
      setOutput(json)
      // save outreach output so outreach_followup can load it
      if (promptType === 'outreach' && (json.subject || json.body)) {
        const key = `prompt_editor.${clientEmail}.outreach.output`
        const outreachData = { subject: json.subject, body: json.body, signature: json.signature || '' }
        fetch('/api/states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, data: outreachData }),
        }).catch(() => {})
        window.dispatchEvent(new CustomEvent('outreach-output-saved', { detail: { clientEmail, data: outreachData } }))
      }
    } catch (e) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const [leftTab, setLeftTab] = useState('prompt')

  const tabBtn = (id, label) => (
    <button onClick={() => setLeftTab(id)} style={{
      fontSize: 13, fontWeight: 500, padding: '5px 14px', borderRadius: T.btnRadius, border: 'none',
      background: leftTab === id ? T.accentLight : 'transparent',
      color: leftTab === id ? T.accent : T.muted,
      cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.2,
    }}>{label}</button>
  )

  return (
    <>
    <div style={{ background: NEU_SURF, borderRadius: 16, boxShadow: dirty ? `0 0 0 2px ${T.accent}, ${NEU_SHADOW}` : NEU_SHADOW, overflow: 'hidden', transition: 'box-shadow 0.15s', height: 500, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${LINE}`, background: 'rgba(0,0,0,0.02)', flexShrink: 0 }}>
        <div style={{ fontSize: FS.c, fontWeight: 500, color: INK }}>{TYPE_LABELS[promptType]}</div>
      </div>

      {/* Test panel */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* LEFT — tabs: Prompt | Investor */}
          <div style={{ flex: 1, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${T.border}`, background: '#FAFAFA', height: 44, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {tabBtn('prompt', 'Prompt')}
                {tabBtn('investor', 'Investor Data')}
                {HAS_FILES_TAB.includes(promptType) && tabBtn('files', 'Files')}
                {promptType === 'outreach_followup' && tabBtn('prevmail', 'Previous Mail')}
                {promptType === 'outreach_followup' && tabBtn('companyupdates', 'Company Updates')}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => dirty && setShowDiff(true)}
                  disabled={!dirty}
                  style={{ fontSize: 13, fontWeight: 500, padding: '5px 14px', borderRadius: T.btnRadius, border: `1px solid ${dirty ? T.green : T.border}`, background: dirty ? T.greenLight : 'transparent', color: dirty ? T.green : T.faint, cursor: dirty ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.15s', lineHeight: 1.2 }}
                >
                  Save
                </button>
              </div>
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, padding: '16px 20px' }}>
              {leftTab === 'prompt' && (
                <textarea
                  className="hide-scroll"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  style={{ width: '100%', height: '100%', fontSize: 11, color: T.text, lineHeight: 1.8, fontFamily: T.mono, margin: 0, background: T.bg, borderRadius: 8, padding: '12px 14px', border: 'none', outline: 'none', resize: 'none', boxSizing: 'border-box', overflowY: 'auto' }}
                />
              )}
              {leftTab === 'investor' && (
                <div className="hide-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflowY: 'auto', boxSizing: 'border-box', paddingBottom: 12 }}>
                  {Object.entries(JSON.parse(investorText)).map(([k, v]) => (
                    <div key={k} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, fontSize: 12 }}>
                      <span style={{ color: T.faint, fontFamily: T.mono, fontSize: 11, paddingTop: 1 }}>{k}</span>
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={e => {
                          const current = JSON.parse(investorText)
                          current[k] = e.currentTarget.textContent
                          setInvestorText(JSON.stringify(current, null, 2))
                        }}
                        style={{ color: T.text, lineHeight: 1.5, wordBreak: 'break-word', outline: 'none', borderBottom: `1px solid transparent`, cursor: 'text' }}
                        onFocus={e => e.currentTarget.style.borderBottomColor = T.border}
                        onBlurCapture={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                      >{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {leftTab === 'prevmail' && (
                <div className="hide-scroll" style={{ height: '100%', overflowY: 'auto', paddingBottom: 12 }}>
                  {prevMail ? (
                    <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, background: '#F8F8FC' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Subject</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.5 }}>{prevMail.subject}</div>
                      </div>
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: 12, color: T.text, lineHeight: 2, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>{prevMail.body}</div>
                      </div>
                      {prevMail.signature && (
                        <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, background: '#FAFAFA' }}>
                          <div style={{ fontSize: 11, color: T.muted, whiteSpace: 'pre-wrap', fontFamily: T.mono }}>{prevMail.signature}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: T.muted, background: T.bg, borderRadius: 8, padding: '12px 14px' }}>
                      No previous outreach mail found. Run the <strong>Outreach</strong> prompt first to generate and save it.
                    </div>
                  )}
                </div>
              )}
              {leftTab === 'companyupdates' && (
                <div className="hide-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflowY: 'auto', paddingBottom: 12 }}>
                  {/* Sheet picker */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Google Sheet</div>
                    <select value={selectedSheet} onChange={e => setSelectedSheet(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', color: T.text, background: '#fff', outline: 'none' }}>
                      <option value=''>Select sheet…</option>
                      {sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  {/* Updates list */}
                  {updatesLoading && <div style={{ fontSize: 12, color: T.muted }}>Loading updates…</div>}
                  {!updatesLoading && selectedSheet && updates.length === 0 && (
                    <div style={{ fontSize: 12, color: T.muted, background: T.bg, borderRadius: 8, padding: '10px 12px' }}>No rows found in the Updates tab.</div>
                  )}
                  {!updatesLoading && updates.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {updates.map((row, i) => (
                        <div key={i} style={{ fontSize: 11, color: T.text, background: T.bg, borderRadius: 6, padding: '8px 12px', fontFamily: T.mono, lineHeight: 1.6 }}>{row.filter(Boolean).join(' · ')}</div>
                      ))}
                    </div>
                  )}

                  {/* Save button */}
                  {selectedSheet && (
                    <button onClick={saveUpdatesState}
                      style={{ alignSelf: 'flex-start', padding: T.btnPadding, borderRadius: T.btnRadius, border: 'none', background: updatesSaved ? T.green : T.accent, color: '#fff', fontSize: T.btnFontSize, fontWeight: T.btnWeight, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.2 }}>
                      {updatesSaved ? '✓ Saved' : 'Save Selection'}
                    </button>
                  )}
                </div>
              )}
              {leftTab === 'files' && (
                <div className="hide-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflowY: 'auto', paddingBottom: 12 }}>

                  {/* Folder picker */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Client Drive Folder</div>
                    <select value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', color: T.text, background: '#fff', outline: 'none' }}>
                      <option value=''>Select folder…</option>
                      {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>

                  {/* MD file picker */}
                  {selectedFolder && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Guidelines / MD File</div>
                      {filesLoading
                        ? <div style={{ fontSize: 12, color: T.muted }}>Loading files…</div>
                        : <select value={mdFileId} onChange={e => setMdFileId(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', color: T.text, background: '#fff', outline: 'none' }}>
                            <option value=''>Select file…</option>
                            {folderFiles.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                      }
                      {mdFileId && <div style={{ fontSize: 10, color: T.muted, marginTop: 4, fontFamily: T.mono }}>{mdFileId}</div>}
                    </div>
                  )}

                  {/* Save button */}
                  {selectedFolder && mdFileId && (
                    <button onClick={saveFilesState}
                      style={{ alignSelf: 'flex-start', padding: T.btnPadding, borderRadius: T.btnRadius, border: 'none', background: filesSaved ? T.green : T.accent, color: '#fff', fontSize: T.btnFontSize, fontWeight: T.btnWeight, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.2 }}>
                      {filesSaved ? '✓ Saved' : 'Save Selection'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — output */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${T.border}`, background: '#FAFAFA', height: 44, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>Generated Output</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  style={{ fontSize: 13, fontWeight: 400, padding: '5px 8px', borderRadius: T.btnRadius, border: `1px solid ${T.border}`, background: '#fff', color: T.text, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}
                >
                  {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <button
                  onClick={runTest}
                  disabled={generating || (promptType === 'outreach_followup' && !prevMail)}
                  title={promptType === 'outreach_followup' && !prevMail ? 'Run the Outreach prompt first' : ''}
                  style={{ fontSize: T.btnFontSize, fontWeight: T.btnWeight, padding: T.btnPadding, borderRadius: T.btnRadius, border: 'none', background: (generating || (promptType === 'outreach_followup' && !prevMail)) ? T.faint : T.accent, color: '#fff', cursor: (generating || (promptType === 'outreach_followup' && !prevMail)) ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.2 }}
                >
                  {generating
                    ? <><span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Generating…</>
                    : '▶ Run'}
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, padding: '16px 18px' }}>
              <div className="hide-scroll" style={{ height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
                {!output && !genError && !generating && (
                  <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, background: '#F8F8FC' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Subject</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#C4C4D4', lineHeight: 1.5 }}>Investment Opportunity | SEBI-Registered Category I Angel Fund…</div>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <div style={{ fontSize: 13, color: '#D1D5DB', lineHeight: 2, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>{`Dear David,\n\nI hope this message finds you well. Given Mangrove Capital Partners' focus on early-stage transformational technology across Europe, Enlighten Capital's thesis on India's underserved Tier 2/3 markets represents a complementary emerging-market opportunity.\n\nI am reaching out from the Investor Relations team at Enlighten Capital, a SEBI-registered Category I Angel Fund currently raising $10.6M USD to invest in post-revenue, high-growth companies across India's Tier 2 and Tier 3 markets.\n\nOur investment strategy is built on three core principles:\n• Investing in revenue-generating businesses with disciplined entry valuations.\n• Concentrating on underserved regional ecosystems with strong long-term growth potential.\n• Preserving capital through structured portfolio construction, including a dedicated 30% follow-on reserve.\n\nThe fund currently has an active pipeline of nine investment opportunities under due diligence, positioning us for immediate capital deployment following the first close.\n\nIf this opportunity aligns with Mangrove Capital Partners' investment mandate, we would welcome the opportunity to share our investment memorandum and discuss the fund in greater detail.\n\nKind regards,\nInvestor Relations\nEnlighten Capital`}</div>
                    </div>
                    <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, background: '#FAFAFA' }}>
                      <div style={{ fontSize: 11, color: '#D1D5DB', fontFamily: T.mono }}>{'Investor Relations\nEnlighten Capital'}</div>
                    </div>
                  </div>
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
                    <div style={{ padding: '16px' }}>
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
        </div>
    </div>

    {showDiff && (
      <DiffModal
        original={data.text}
        updated={text}
        promptType={promptType}
        onConfirm={confirmSave}
        onCancel={() => setShowDiff(false)}
        saving={saving}
      />
    )}
    </>
  )
}

export default function PromptEditor() {
  const [clients, setClients]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [openMenu, setOpenMenu]       = useState(null)
  const [editClient, setEditClient]   = useState(null)

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

  // close menu on outside click
  useEffect(() => {
    if (!openMenu) return
    const handler = () => setOpenMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openMenu])

  const activeClient = clients.find(c => c.client_email === selected)

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Prompt Editor" backTo="/tools" />
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '40px 48px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: FS.c, fontWeight: 500, color: '#7C3AED', marginBottom: 8 }}>Tools</div>
            <div style={{ fontSize: FS.h, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.2, color: INK, marginBottom: 6 }}>Prompt Editor</div>
            <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.5 }}>Manage and test AI prompt templates per client.</div>
          </div>
          <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', background: NEU_SURF, color: INK, border: 'none', borderRadius: 10, fontSize: FS.c, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, marginTop: 6, boxShadow: NEU_BTN }}>
            + Add Client
          </button>
        </div>

        {loading
          ? <div style={{ fontSize: FS.c, color: MUTED }}>Loading…</div>
          : clients.length === 0
            ? <div style={{ fontSize: FS.c, color: MUTED }}>No clients yet. Add one to get started.</div>
            : <>
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Client</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select value={selected} onChange={e => setSelected(e.target.value)}
                      style={{ padding: '10px 14px', border: `1px solid ${LINE}`, borderRadius: 10, fontSize: FS.c, fontFamily: FONT, color: INK, background: NEU_SURF, outline: 'none', cursor: 'pointer', minWidth: 320, boxShadow: NEU_BTN }}>
                      {clients.map(c => (
                        <option key={c.client_email} value={c.client_email}>
                          {c.client_name || c.client_email}
                        </option>
                      ))}
                    </select>

                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu ? null : 'main') }}
                        style={{ background: NEU_SURF, border: 'none', cursor: 'pointer', padding: '9px 12px', borderRadius: 10, color: MUTED, fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', boxShadow: NEU_BTN }}
                      >⋯</button>
                      {openMenu === 'main' && (
                        <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', background: NEU_SURF, borderRadius: 10, boxShadow: NEU_SHADOW, minWidth: 140, zIndex: 50, overflow: 'hidden' }}>
                          <button
                            onClick={() => { setEditClient(activeClient); setOpenMenu(null) }}
                            style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: FS.c, color: INK, cursor: 'pointer', fontFamily: FONT, display: 'block' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >Edit</button>
                          <button
                            disabled
                            style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: FS.c, color: MUTED, cursor: 'default', fontFamily: FONT, display: 'block' }}
                          >Settings</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {activeClient?.client_description && (
                    <div style={{ fontSize: FS.sc, color: MUTED, marginTop: 8, maxWidth: 400 }}>{activeClient.client_description}</div>
                  )}
                </div>

                {activeClient && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {PROMPT_TYPES.map(pt => (
                      activeClient.prompts[pt]
                        ? <PromptBlock key={pt} promptType={pt} data={activeClient.prompts[pt]} onSaved={() => load(selected)} clientEmail={activeClient.client_email} />
                        : null
                    ))}
                  </div>
                )}
              </>
        }
      </div>

      {showModal && <AddClientModal onClose={() => setShowModal(false)} onAdded={email => load(email)} />}
      {editClient && <EditDescriptionModal client={editClient} onClose={() => setEditClient(null)} onSaved={() => load(selected)} />}
    </div>
  )
}
