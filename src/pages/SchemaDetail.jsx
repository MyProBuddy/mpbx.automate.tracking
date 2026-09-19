import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import apiFetch from '../lib/apiFetch.js'

const FONT     = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const INK      = '#1a1a1a'
const MUTED    = '#626260'
const NEU_BG   = '#F0F0F0'
const NEU_SURF = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHD  = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const GREEN    = '#3ECF8E'
const LINE     = 'rgba(0,0,0,0.08)'

const TABLE_ORDER = ['investors', 'tracking', 'conversation_log', 'thread_tracking', 'config', 'updates']

function fmt(val) {
  if (val === null || val === undefined) return <span style={{ color: '#ccc' }}>—</span>
  if (typeof val === 'boolean') return <span style={{ color: val ? GREEN : '#dc2626', fontWeight: 600 }}>{val ? 'true' : 'false'}</span>
  if (Array.isArray(val)) return <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{JSON.stringify(val)}</span>
  if (val instanceof Date) return <span>{val.toLocaleString()}</span>
  const s = String(val)
  if (s === 'N/A' || s === '') return <span style={{ color: '#ccc' }}>—</span>
  return s
}

const NEU_INSET = 'inset 3px 3px 8px rgba(0,0,0,0.10), inset -3px -3px 8px rgba(255,255,255,0.80)'
const NEU_BTN   = '-4px -4px 10px rgba(255,255,255,0.9), 4px 4px 10px rgba(0,0,0,0.10)'

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: MUTED, marginBottom: 4 }}>{label}</div>
      {type === 'textarea' ? (
        <textarea
          value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          rows={3}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', resize: 'vertical',
            background: 'rgba(0,0,0,0.04)', boxShadow: NEU_INSET, fontSize: 13, fontFamily: FONT,
            color: INK, outline: 'none', boxSizing: 'border-box' }}
        />
      ) : (
        <input
          value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none',
            background: 'rgba(0,0,0,0.04)', boxShadow: NEU_INSET, fontSize: 13, fontFamily: FONT,
            color: INK, outline: 'none', boxSizing: 'border-box' }}
        />
      )}
    </div>
  )
}

function AddCard({ schema }) {
  const [mode, setMode] = useState(null) // null | 'investor' | 'update'
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  // Investor fields
  const [inv, setInv] = useState({
    id: '', firstName: '', lastName: '', email: '', company: '', title: '',
    fundFocus: '', fundStage: '', checkSize: '', linkedin: '',
  })

  // Update fields
  const [updateText, setUpdateText] = useState('')

  const fi = (k) => (v) => setInv(p => ({ ...p, [k]: v }))

  async function saveInvestor() {
    if (!inv.id || !inv.email) return setMsg({ ok: false, text: 'Investor ID and Email are required.' })
    setSaving(true); setMsg(null)
    try {
      const r = await apiFetch('/api/schema-add-row', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, table: 'investors', row: {
          investor_id: inv.id, 'First Name': inv.firstName, 'Last Name': inv.lastName,
          Email: inv.email, Company: inv.company, Title: inv.title,
          'Fund focus': inv.fundFocus, 'Fund stage': inv.fundStage,
          'Check Size': inv.checkSize, 'Person Linkedin Url': inv.linkedin,
        }}),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      // also insert tracking row
      await apiFetch('/api/schema-add-row', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, table: 'tracking', row: { inv_id: inv.id } }),
      })
      setMsg({ ok: true, text: 'Investor added.' })
      setInv({ id: '', firstName: '', lastName: '', email: '', company: '', title: '', fundFocus: '', fundStage: '', checkSize: '', linkedin: '' })
    } catch(e) { setMsg({ ok: false, text: e.message }) }
    setSaving(false)
  }

  async function saveUpdate() {
    if (!updateText.trim()) return setMsg({ ok: false, text: 'Update text is required.' })
    setSaving(true); setMsg(null)
    try {
      const r = await apiFetch('/api/schema-add-row', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, table: 'updates', row: { update: updateText.trim() } }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setMsg({ ok: true, text: 'Update saved.' })
      setUpdateText('')
    } catch(e) { setMsg({ ok: false, text: e.message }) }
    setSaving(false)
  }

  return (
    <div style={{ background: NEU_SURF, borderRadius: 16, boxShadow: NEU_SHD, padding: '24px 28px', fontFamily: FONT }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 20 }}>Add New</div>

      {/* Option selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: mode ? 24 : 0 }}>
        {[{ id: 'investor', label: 'Investor Contact' }, { id: 'update', label: 'Company Update' }].map(o => (
          <button key={o.id} onClick={() => setMode(m => m === o.id ? null : o.id)} style={{
            padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: FONT, fontSize: 13, fontWeight: 600,
            background: mode === o.id ? INK : 'rgba(0,0,0,0.07)',
            color: mode === o.id ? '#fff' : MUTED,
            boxShadow: mode === o.id ? 'none' : NEU_BTN,
            transition: 'all 0.15s',
          }}>{o.label}</button>
        ))}
      </div>

      {/* Investor form */}
      {mode === 'investor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Investor ID *" value={inv.id} onChange={fi('id')} placeholder="unique_id" />
            <Field label="Email *" value={inv.email} onChange={fi('email')} placeholder="investor@fund.com" />
            <Field label="First Name" value={inv.firstName} onChange={fi('firstName')} placeholder="John" />
            <Field label="Last Name" value={inv.lastName} onChange={fi('lastName')} placeholder="Smith" />
            <Field label="Company" value={inv.company} onChange={fi('company')} placeholder="Acme Ventures" />
            <Field label="Title" value={inv.title} onChange={fi('title')} placeholder="General Partner" />
            <Field label="Fund Focus" value={inv.fundFocus} onChange={fi('fundFocus')} placeholder="SaaS, AI" />
            <Field label="Fund Stage" value={inv.fundStage} onChange={fi('fundStage')} placeholder="Seed, Series A" />
            <Field label="Check Size" value={inv.checkSize} onChange={fi('checkSize')} placeholder="$500k–$2M" />
            <Field label="LinkedIn URL" value={inv.linkedin} onChange={fi('linkedin')} placeholder="https://linkedin.com/in/..." />
          </div>
          {msg && <div style={{ fontSize: 12, color: msg.ok ? GREEN : '#dc2626' }}>{msg.text}</div>}
          <button onClick={saveInvestor} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: GREEN, color: '#fff', fontSize: 13, fontWeight: 600,
            fontFamily: FONT, alignSelf: 'flex-start', opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving…' : 'Add Investor'}</button>
        </div>
      )}

      {/* Update form */}
      {mode === 'update' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Update" value={updateText} onChange={setUpdateText} placeholder="Write the company update here…" type="textarea" />
          {msg && <div style={{ fontSize: 12, color: msg.ok ? GREEN : '#dc2626' }}>{msg.text}</div>}
          <button onClick={saveUpdate} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: GREEN, color: '#fff', fontSize: 13, fontWeight: 600,
            fontFamily: FONT, alignSelf: 'flex-start', opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving…' : 'Save Update'}</button>
        </div>
      )}
    </div>
  )
}

function DataTable({ name, data, open, onToggle, editing }) {
  const { columns, rows, error } = data

  const badge = (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: error ? '#fee2e2' : `${GREEN}22`, color: error ? '#dc2626' : GREEN,
      marginLeft: 8,
    }}>
      {error ? 'error' : `${rows.length} rows`}
    </span>
  )

  return (
    <div style={{ background: NEU_SURF, borderRadius: 16, boxShadow: NEU_SHD, overflow: 'hidden', fontFamily: FONT }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: open ? `1px solid ${LINE}` : 'none',
      }}>
        <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none', flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: 'monospace' }}>{name}</span>
          {badge}
        </div>
        <span onClick={onToggle} style={{ fontSize: 12, color: MUTED, cursor: 'pointer' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        error ? (
          <div style={{ padding: '16px 24px', fontSize: 13, color: '#dc2626' }}>{error}</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '16px 24px', fontSize: 13, color: MUTED }}>No rows</div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONT }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: '#eaeaea', zIndex: 1 }}>
                  {columns.map(c => (
                    <th key={c} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: MUTED, whiteSpace: 'nowrap', borderBottom: `1px solid ${LINE}` }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${LINE}`, background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                    {columns.map(c => (
                      <td key={c} style={{ padding: '8px 12px', color: INK, whiteSpace: 'nowrap', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fmt(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

export default function SchemaDetail() {
  const { schema } = useParams()
  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)
  const [openTables, setOpenTables]   = useState(TABLE_ORDER.reduce((a, t) => ({ ...a, [t]: true }), {}))
  const [editing, setEditing]         = useState(false)

  const label = schema.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  useEffect(() => {
    apiFetch(`/api/schema-tables?schema=${encodeURIComponent(schema)}`)
      .then(async r => {
        const t = await r.text()
        try { setData(JSON.parse(t)) } catch { setError(t) }
      })
      .catch(e => setError(e.message))
  }, [schema])

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Add Data" backTo="/add-data" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Supabase Schema</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '-0.3px' }}>{label}</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 4, fontFamily: 'monospace' }}>{schema}</div>
          </div>
          <button
            onClick={() => {
              if (editing) {
                setEditing(false)
                setOpenTables(TABLE_ORDER.reduce((a, t) => ({ ...a, [t]: true }), {}))
              } else {
                setEditing(true)
                setOpenTables(TABLE_ORDER.reduce((a, t) => ({ ...a, [t]: false }), {}))
              }
            }}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: editing ? GREEN : NEU_SURF,
              boxShadow: NEU_SHD,
              color: editing ? '#fff' : MUTED,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
            }}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 10, padding: '12px 20px', marginBottom: 24 }}>{error}</div>}
        {!data && !error && <div style={{ color: MUTED, fontSize: 14 }}>Loading…</div>}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {editing && <AddCard schema={schema} onDone={() => {
              setEditing(false)
              setOpenTables(TABLE_ORDER.reduce((a, t) => ({ ...a, [t]: true }), {}))
            }} />}
            {TABLE_ORDER.map(t => data[t] && (
              <DataTable
                key={t} name={t} data={data[t]}
                open={openTables[t]}
                onToggle={() => setOpenTables(p => ({ ...p, [t]: !p[t] }))}
                editing={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
