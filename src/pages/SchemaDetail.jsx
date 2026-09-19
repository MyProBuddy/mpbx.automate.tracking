import { useState, useEffect } from 'react'
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

function DataTable({ name, data }) {
  const { columns, rows, error } = data
  const [open, setOpen] = useState(true)

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
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', cursor: 'pointer', userSelect: 'none',
          borderBottom: open ? `1px solid ${LINE}` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: 'monospace' }}>{name}</span>
          {badge}
        </div>
        <span style={{ fontSize: 12, color: MUTED }}>{open ? '▲' : '▼'}</span>
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
  const [data, setData]   = useState(null)
  const [error, setError] = useState(null)

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

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Supabase Schema</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '-0.3px' }}>{label}</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 4, fontFamily: 'monospace' }}>{schema}</div>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 10, padding: '12px 20px', marginBottom: 24 }}>{error}</div>}
        {!data && !error && <div style={{ color: MUTED, fontSize: 14 }}>Loading…</div>}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {TABLE_ORDER.map(t => data[t] && <DataTable key={t} name={t} data={data[t]} />)}
          </div>
        )}
      </div>
    </div>
  )
}
