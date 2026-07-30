import { useState, useEffect, useCallback } from 'react'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'
import { fetchDbStats } from '../lib/supabase.js'

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: T.surface, borderRadius: 12, padding: '24px 28px',
      border: `1.5px solid ${T.border}`, borderTop: `3px solid ${color || T.accent}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: T.text, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value !== null && value !== undefined ? Number(value).toLocaleString() : '—'}
      </div>
      {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: `1.5px solid ${active ? T.accent : T.border}`,
      background: active ? T.accentLight : T.surface,
      color: active ? T.accent : T.muted,
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
    <div style={{
      background: T.surface, borderRadius: 12, border: `1.5px solid ${T.border}`,
      overflow: 'hidden', transition: 'border-color 0.15s',
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || '—'}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', flexShrink: 0,
              padding: '2px 8px', borderRadius: 99,
              background: status === 'active' ? '#ECFDF5' : T.bg,
              color: status === 'active' ? T.green : T.muted,
            }}>{status}</span>
          </div>
          <div style={{ fontSize: 12, color: T.muted, display: 'flex', gap: 12 }}>
            {id && <span style={{ fontFamily: T.mono, fontSize: 11 }}>{id}</span>}
            {subtitle && <span>{subtitle}</span>}
          </div>
        </div>
        <div style={{ fontSize: 18, color: T.muted, flexShrink: 0 }}>{expanded ? '−' : '+'}</div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 24px' }}>
          {entries.map(([key, val]) => (
            <div key={key}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{key.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: 12, color: T.text, wordBreak: 'break-word', lineHeight: 1.5 }}>{String(val)}</div>
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
      const res = await fetch(`/api/data?type=${t}&status=${s}&page=${p}&limit=5`)
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
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <FilterBtn active={type === 'investors'} onClick={() => changeType('investors')}>Investors</FilterBtn>
          <FilterBtn active={type === 'firms'} onClick={() => changeType('firms')}>Firms</FilterBtn>
        </div>
        <div style={{ width: 1, height: 24, background: T.border, margin: '0 4px' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <FilterBtn active={status === 'all'} onClick={() => changeStatus('all')}>All</FilterBtn>
          <FilterBtn active={status === 'active'} onClick={() => changeStatus('active')}>Active</FilterBtn>
          <FilterBtn active={status === 'inactive'} onClick={() => changeStatus('inactive')}>Inactive</FilterBtn>
        </div>
        {total !== null && (
          <span style={{ fontSize: 12, color: T.muted, marginLeft: 8 }}>
            {total.toLocaleString()} {type} found
          </span>
        )}
      </div>

      {/* Records */}
      {loading
        ? <div style={{ fontSize: 13, color: T.muted, padding: '32px 0' }}>Loading…</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {records.map(r => <RecordCard key={r.id} record={r} type={type} />)}
          </div>
      }

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: page === 1 ? 'default' : 'pointer', border: `1.5px solid ${T.border}`, background: T.surface, color: page === 1 ? T.faint : T.text }}
          >← Prev</button>
          <span style={{ fontSize: 12, color: T.muted }}>Page {page} of {totalPages.toLocaleString()}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: page === totalPages ? 'default' : 'pointer', border: `1.5px solid ${T.border}`, background: T.surface, color: page === totalPages ? T.faint : T.text }}
          >Next →</button>
        </div>
      )}
    </div>
  )
}

export default function DataWorkflows() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchDbStats().then(setStats)
  }, [])

  const firms   = stats?.firms
  const investors = stats?.investors
  const loading = !stats

  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans }}>
      <Nav title="Data Workflows" backTo="/hub" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>

        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#0891B2', marginBottom: 8 }}>Master Database</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: T.text, marginBottom: 6 }}>Data Workflows</div>
          <div style={{ fontSize: 13, color: T.muted }}>Live counts from the master investor and firm database.</div>
        </div>

        {/* Firms */}
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Firms</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          <StatCard label="Total Firms"    value={loading ? null : firms?.total}    color="#0891B2" sub="All firms in database" />
          <StatCard label="Active Firms"   value={loading ? null : firms?.active}   color={T.green} sub="Currently active" />
          <StatCard label="Inactive Firms" value={loading ? null : firms?.inactive} color={T.muted} sub="Not yet activated" />
        </div>

        {/* Investors */}
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Investors</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          <StatCard label="Total Investors"    value={loading ? null : investors?.total}    color="#0891B2" sub="All investors in database" />
          <StatCard label="Active Investors"   value={loading ? null : investors?.active}   color={T.green} sub="Currently active" />
          <StatCard label="Inactive Investors" value={loading ? null : investors?.inactive} color={T.muted} sub="Not yet activated" />
        </div>

        {/* Antigravity OpenWeb Enrichment */}
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Antigravity OpenWeb Enrichment Workflow</div>
        <div style={{ background: T.surface, borderRadius: 14, padding: 32, border: `1.5px solid ${T.border}`, marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
          <div style={{ fontSize: 13, color: T.faint, fontStyle: 'italic' }}>Content coming soon</div>
        </div>

        {/* Apollo / PhantomBuster / LinkedIn Discovery */}
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Apollo / PhantomBuster / LinkedIn Discovery Workflow</div>
        <div style={{ background: T.surface, borderRadius: 14, padding: 32, border: `1.5px solid ${T.border}`, marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
          <div style={{ fontSize: 13, color: T.faint, fontStyle: 'italic' }}>Content coming soon</div>
        </div>

        {/* Data Overview */}
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Data Overview</div>
        <DataOverview />

      </div>
    </div>
  )
}
