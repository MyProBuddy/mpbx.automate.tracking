import { useState, useEffect, useCallback } from 'react'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'
import { fetchDbStats } from '../lib/supabase.js'

const FONT  = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FS    = { h: 32, sh: 18, c: 14, sc: 12 }
const INK   = '#1a1a1a'
const MUTED = '#626260'
const LINE  = 'rgba(0,0,0,0.08)'

const NEU_BG     = '#F0F0F0'
const NEU_SURF   = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHADOW = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const NEU_BTN    = '-4px -4px 10px rgba(255,255,255,0.9), 4px 4px 10px rgba(0,0,0,0.10)'
const NEU_INSET  = 'inset 3px 3px 8px rgba(0,0,0,0.10), inset -3px -3px 8px rgba(255,255,255,0.80)'

const GRAD = 'linear-gradient(90deg, #C026D3, #F43F5E, #F97316)'

const FGRAD_V = 'linear-gradient(to bottom, #E879F9, #F97316)'
const FGRAD_H = 'linear-gradient(to right, #C026D3, #F43F5E, #F97316)'
const NEU_BAR = '3px 3px 6px rgba(0,0,0,0.18), -2px -2px 5px rgba(255,255,255,0.9)'

function StatsBarChart({ total, inactive, active }) {
  const GAP = 3, N = 90
  const sum = total + inactive + active
  if (!sum) return null

  const SEGMENTS = [
    { key: 'total',    label: 'Total',    value: total,    height: 80, solid: false },
    { key: 'inactive', label: 'Inactive', value: inactive, height: 64, solid: false },
    { key: 'active',   label: 'Active',   value: active,   height: 52, solid: true  },
  ]

  const MIN = 4
  const nonZero = SEGMENTS.filter(s => s.value > 0).length
  const remaining = N - nonZero * MIN
  const fl = SEGMENTS.map(s => ({
    ...s,
    bars: s.value > 0 ? MIN + Math.floor(s.value / sum * remaining) : 0,
    rem:  s.value > 0 ? (s.value / sum * remaining) % 1 : 0,
  }))
  let r = N - fl.reduce((a, f) => a + f.bars, 0)
  fl.sort((a, b) => b.rem - a.rem).forEach((s, i) => { if (i < r && s.value > 0) s.bars++ })
  fl.sort((a, b) => SEGMENTS.findIndex(x => x.key === a.key) - SEGMENTS.findIndex(x => x.key === b.key))

  return (
    <div style={{ display: 'flex', gap: GAP, marginTop: 16 }}>
      {fl.map((s, gi) => {
        const opacity = (gi + 1) / SEGMENTS.length
        return (
          <div key={s.key} style={{ flex: s.bars, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: FS.c, fontWeight: 500, color: INK, fontFamily: FONT }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize: FS.sc, color: MUTED, fontFamily: FONT }}>{s.label}</div>
            </div>
            <div style={{ display: 'flex', gap: GAP, alignItems: 'flex-end', height: 80 }}>
              {s.solid ? (
                <div style={{ position: 'relative', flex: 1, height: s.height, borderRadius: 4, boxShadow: NEU_BAR, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: FGRAD_H, opacity }} />
                </div>
              ) : (
                Array.from({ length: s.bars }, (_, i) => (
                  <div key={i} style={{ position: 'relative', flex: 1, height: s.height, borderRadius: 3, boxShadow: NEU_BAR, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: FGRAD_V, opacity }} />
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: NEU_SURF, borderRadius: 16, padding: '24px 28px', boxShadow: NEU_SHADOW }}>
      <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 500, color: INK, letterSpacing: '-0.5px', lineHeight: 1, fontFamily: T.mono }}>
        {value !== null && value !== undefined ? Number(value).toLocaleString() : '—'}
      </div>
      {sub && <div style={{ fontSize: FS.sc, color: MUTED, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: 10, fontSize: FS.c, fontWeight: 500, cursor: 'pointer',
      border: 'none',
      background: active ? NEU_SURF : 'transparent',
      color: active ? '#C026D3' : MUTED,
      boxShadow: active ? NEU_BTN : 'none',
      fontFamily: FONT,
      transition: 'all 0.15s',
    }}>{children}</button>
  )
}

function RecordCard({ record, type }) {
  const [expanded, setExpanded] = useState(false)

  const isInvestor = type === 'investors'
  const title = isInvestor
    ? [record.first_name, record.last_name].filter(Boolean).join(' ') || record.contact_id
    : record.name || record.firm_id

  const subtitle = isInvestor ? record.title || record.firm_name_raw : record.category
  const id = isInvestor ? record.contact_id : record.firm_id
  const status = record.activity_status

  const skip = ['id']
  const entries = Object.entries(record).filter(([k, v]) => !skip.includes(k) && v !== null && v !== '')

  return (
    <div style={{ background: NEU_SURF, borderRadius: 14, boxShadow: NEU_SHADOW, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: FS.c, fontWeight: 500, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || '—'}</span>
            <span style={{
              fontSize: FS.sc, fontWeight: 500, flexShrink: 0,
              padding: '2px 8px', borderRadius: 99,
              background: status === 'active' ? '#FDF4FF' : 'rgba(0,0,0,0.05)',
              color: status === 'active' ? '#C026D3' : MUTED,
            }}>{status}</span>
          </div>
          <div style={{ fontSize: FS.sc, color: MUTED, display: 'flex', gap: 12 }}>
            {id && <span style={{ fontFamily: T.mono }}>{id}</span>}
            {subtitle && <span>{subtitle}</span>}
          </div>
        </div>
        <div style={{ fontSize: FS.sh, color: MUTED, flexShrink: 0 }}>{expanded ? '−' : '+'}</div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${LINE}`, padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 24px' }}>
          {entries.map(([key, val]) => (
            <div key={key}>
              <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 2 }}>{key.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: FS.sc, color: INK, wordBreak: 'break-word', lineHeight: 1.5 }}>{String(val)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DataOverview() {
  const [type, setType]       = useState('investors')
  const [status, setStatus]   = useState('all')
  const [records, setRecords] = useState([])
  const [total, setTotal]     = useState(null)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async (t, s, p) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/supabase?action=data&type=${t}&status=${s}&page=${p}&limit=5`)
      const json = await res.json()
      setRecords(json.data || [])
      setTotal(json.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(type, status, page)
  }, [type, status, page, fetchData])

  const changeType = (t) => { setType(t); setPage(1) }
  const changeStatus = (s) => { setStatus(s); setPage(1) }

  const totalPages = total !== null ? Math.ceil(total / 5) : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <FilterBtn active={type === 'investors'} onClick={() => changeType('investors')}>Investors</FilterBtn>
          <FilterBtn active={type === 'firms'} onClick={() => changeType('firms')}>Firms</FilterBtn>
        </div>
        <div style={{ width: 1, height: 24, background: LINE, margin: '0 4px' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <FilterBtn active={status === 'all'} onClick={() => changeStatus('all')}>All</FilterBtn>
          <FilterBtn active={status === 'active'} onClick={() => changeStatus('active')}>Active</FilterBtn>
          <FilterBtn active={status === 'inactive'} onClick={() => changeStatus('inactive')}>Inactive</FilterBtn>
        </div>
        {total !== null && (
          <span style={{ fontSize: FS.sc, color: MUTED, marginLeft: 8 }}>
            {total.toLocaleString()} {type} found
          </span>
        )}
      </div>

      {loading
        ? <div style={{ fontSize: FS.c, color: MUTED, padding: '32px 0' }}>Loading…</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {records.map(r => <RecordCard key={r.id} record={r} type={type} />)}
          </div>
      }

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '7px 16px', borderRadius: 10, fontSize: FS.c, fontWeight: 500, cursor: page === 1 ? 'default' : 'pointer', border: 'none', background: NEU_SURF, color: page === 1 ? MUTED : INK, boxShadow: NEU_BTN, fontFamily: FONT }}
          >← Prev</button>
          <span style={{ fontSize: FS.sc, color: MUTED }}>Page {page} of {totalPages.toLocaleString()}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '7px 16px', borderRadius: 10, fontSize: FS.c, fontWeight: 500, cursor: page === totalPages ? 'default' : 'pointer', border: 'none', background: NEU_SURF, color: page === totalPages ? MUTED : INK, boxShadow: NEU_BTN, fontFamily: FONT }}
          >Next →</button>
        </div>
      )}
    </div>
  )
}

export default function DataWorkflows() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchDbStats().then(setStats)
  }, [])

  const firms     = stats?.firms
  const investors = stats?.investors
  const loading   = !stats

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Data Workflows" backTo="/hub" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>

        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: FS.c, fontWeight: 500, background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>Master Database</div>
          <h1 style={{ fontSize: FS.h, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.2, margin: '0 0 8px', color: INK }}>Data Workflows</h1>
          <div style={{ fontSize: FS.c, color: MUTED }}>Live counts from the master investor and firm database.</div>
        </div>

        <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Firms</div>
        <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: '24px 28px', marginBottom: 40 }}>
          {!loading && firms && <StatsBarChart total={firms.total} inactive={firms.inactive} active={firms.active} />}
        </div>

        <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Investors</div>
        <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: '24px 28px', marginBottom: 40 }}>
          {!loading && investors && <StatsBarChart total={investors.total} inactive={investors.inactive} active={investors.active} />}
        </div>

        <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Antigravity OpenWeb Enrichment Workflow</div>
        <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, marginBottom: 40, overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 500, color: INK, letterSpacing: '-0.03em', fontFamily: T.mono }}>
              {loading ? '—' : (stats?.antigravity?.totalEnriched ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: FS.c, color: MUTED }}>total investors processed through Antigravity enrichment</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <div style={{ padding: '24px 28px', borderRight: `1px solid ${LINE}` }}>
              <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 16 }}>Today</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                {[
                  { label: 'Processed',    value: stats?.antigravity?.today?.total,    color: INK },
                  { label: 'Active Found', value: stats?.antigravity?.today?.active,   color: T.green },
                  { label: 'Inactive',     value: stats?.antigravity?.today?.inactive, color: MUTED },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: FS.sh, fontWeight: 500, color, letterSpacing: '-0.3px', fontFamily: T.mono }}>{loading ? '—' : (value ?? 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '24px 28px', borderRight: `1px solid ${LINE}` }}>
              <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 16 }}>This Week</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                {[
                  { label: 'Processed',    value: stats?.antigravity?.week?.total,    color: INK },
                  { label: 'Active Found', value: stats?.antigravity?.week?.active,   color: T.green },
                  { label: 'Inactive',     value: stats?.antigravity?.week?.inactive, color: MUTED },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: FS.sh, fontWeight: 500, color, letterSpacing: '-0.3px', fontFamily: T.mono }}>{loading ? '—' : (value ?? 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* All Time — full width row */}
          <div style={{ borderTop: `1px solid ${LINE}`, padding: '24px 28px' }}>
            <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 16 }}>All Time</div>
            {(() => {
              const processed = stats?.antigravity?.allTime?.total    ?? 0
              const inactive  = stats?.antigravity?.allTime?.inactive ?? 0
              const active    = stats?.antigravity?.allTime?.active   ?? 0
              const max = Math.max(1, processed)
              const stages = [
                { label: 'Processed',             value: processed },
                { label: 'Inactive / Not found',  value: inactive  },
                { label: 'Active / Found in cycle', value: active  },
              ]
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stages.map((s, i) => {
                    const pct = s.value / max * 100
                    return (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 140, fontSize: FS.sc, fontWeight: 500, color: MUTED, textAlign: 'right', flexShrink: 0 }}>{s.label}</div>
                        <div style={{ flex: 1, height: 32, background: 'rgba(0,0,0,0.06)', borderRadius: 8, overflow: 'hidden', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.08), inset -2px -2px 5px rgba(255,255,255,0.7)' }}>
                          <div style={{ position: 'relative', height: '100%', width: `${pct}%`, borderRadius: 8, transition: 'width 0.6s ease', display: 'flex', alignItems: 'center', paddingLeft: 10, boxSizing: 'border-box' }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: GRAD, opacity: (i + 1) / stages.length }} />
                            {pct > 12 && <span style={{ position: 'relative', fontSize: FS.sc, fontWeight: 700, color: '#fff', fontFamily: T.mono }}>{s.value.toLocaleString()}</span>}
                          </div>
                        </div>
                        <div style={{ width: 44, fontSize: FS.sc, fontFamily: T.mono, fontWeight: 500, color: INK, flexShrink: 0 }}>
                          {pct <= 12 ? s.value.toLocaleString() : ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          <div style={{ padding: '14px 28px', borderTop: `1px solid ${LINE}`, background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: FS.sc, color: '#D97706', fontWeight: 600, flexShrink: 0 }}>Note</span>
            <span style={{ fontSize: FS.sc, color: MUTED, lineHeight: 1.6 }}>
              Inactive does not mean permanently excluded. It means we could not confirm the activity status in this cycle — the investor will be re-checked in the next enrichment run to determine if they are active or not.
            </span>
          </div>
        </div>

        <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Apollo / PhantomBuster / LinkedIn Discovery Workflow</div>
        <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: 32, marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
          <div style={{ fontSize: FS.c, color: MUTED, fontStyle: 'italic' }}>Content coming soon</div>
        </div>

        <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Data Overview</div>
        <DataOverview />

      </div>
    </div>
  )
}
