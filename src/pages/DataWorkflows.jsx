import { useState, useEffect } from 'react'
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

function GeoBar({ name, count, max }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 160, fontSize: 13, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>{name}</div>
      <div style={{ flex: 1, height: 8, background: T.border, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#0891B2', borderRadius: 99, transition: 'width 0.7s ease' }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, width: 50, textAlign: 'right', flexShrink: 0 }}>{count.toLocaleString()}</div>
    </div>
  )
}

export default function DataWorkflows() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchDbStats().then(setStats)
  }, [])

  const firms     = stats?.firms
  const investors = stats?.investors
  const geo       = stats?.topGeographies || []
  const maxGeo    = geo[0]?.count || 1
  const loading   = !stats

  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans }}>
      <Nav title="Data Workflows" />
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

        {/* Geo density */}
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Geographic Density</div>
        <div style={{ background: T.surface, borderRadius: 14, padding: 32, border: `1.5px solid ${T.border}` }}>
          {loading
            ? <div style={{ fontSize: 13, color: T.muted }}>Loading…</div>
            : geo.length === 0
              ? <div style={{ fontSize: 13, color: T.muted }}>No geography data available.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {geo.map(g => <GeoBar key={g.name} name={g.name} count={g.count} max={maxGeo} />)}
                </div>
          }
        </div>

      </div>
    </div>
  )
}
