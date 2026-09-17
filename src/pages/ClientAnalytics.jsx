import { useState, useEffect } from 'react'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'
import apiFetch from '../lib/apiFetch.js'

const FONT  = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FS    = { h: 28, sh: 16, c: 14, sc: 12 }
const INK   = '#1a1a1a'
const MUTED = '#626260'

const NEU_BG     = '#F0F0F0'
const NEU_SURF   = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHADOW = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'

const SUPA_GREEN = '#3ECF8E'

function fmt(n) { return (n || 0).toLocaleString() }

function StatBox({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
      <div style={{ fontSize: FS.sc, color: MUTED, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || INK, letterSpacing: '-0.5px' }}>{fmt(value)}</div>
    </div>
  )
}

function ClientCard({ data }) {
  const replyRate = data.contacted > 0 ? ((data.replied / data.contacted) * 100).toFixed(1) : '0.0'
  const label = data.client.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div style={{
      background: NEU_SURF, borderRadius: 16, padding: 28,
      boxShadow: NEU_SHADOW, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: FS.sc, fontWeight: 600, color: SUPA_GREEN, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>CLIENT</div>
          <div style={{ fontSize: FS.sh, fontWeight: 700, color: INK, letterSpacing: '-0.2px' }}>{label}</div>
        </div>
        <div style={{
          background: `linear-gradient(135deg, ${SUPA_GREEN}22, ${SUPA_GREEN}44)`,
          border: `1px solid ${SUPA_GREEN}55`,
          borderRadius: 10, padding: '6px 14px',
          fontSize: FS.sc, fontWeight: 700, color: SUPA_GREEN,
        }}>
          {replyRate}% reply rate
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20 }}>
        <StatBox label="Total Investors" value={data.total_investors} />
        <StatBox label="Contacted"       value={data.contacted}       color={T.accent} />
        <StatBox label="Replied"         value={data.replied}         color={SUPA_GREEN} />
        <StatBox label="Rejected"        value={data.rejected}        color={T.red} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          width: data.total_investors > 0 ? `${(data.contacted / data.total_investors) * 100}%` : '0%',
          height: '100%', background: `linear-gradient(90deg, ${SUPA_GREEN}, ${T.accent})`,
          borderRadius: 99, transition: 'width 0.8s ease',
        }} />
      </div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
        {data.total_investors > 0 ? ((data.contacted / data.total_investors) * 100).toFixed(1) : 0}% of investors contacted
      </div>
    </div>
  )
}

function SummaryBar({ stats }) {
  const total     = stats.reduce((s, c) => s + c.total_investors, 0)
  const contacted = stats.reduce((s, c) => s + c.contacted, 0)
  const replied   = stats.reduce((s, c) => s + c.replied, 0)
  const rejected  = stats.reduce((s, c) => s + c.rejected, 0)

  return (
    <div style={{
      background: NEU_SURF, borderRadius: 16, padding: '24px 32px',
      boxShadow: NEU_SHADOW, fontFamily: FONT,
      display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap',
      marginBottom: 32,
    }}>
      <div>
        <div style={{ fontSize: FS.sc, color: SUPA_GREEN, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>All Clients</div>
        <div style={{ fontSize: FS.h, fontWeight: 700, color: INK, letterSpacing: '-0.5px' }}>{stats.length} clients</div>
      </div>
      <div style={{ width: 1, height: 40, background: 'rgba(0,0,0,0.1)' }} />
      <StatBox label="Total Investors" value={total} />
      <StatBox label="Contacted"       value={contacted} color={T.accent} />
      <StatBox label="Replied"         value={replied}   color={SUPA_GREEN} />
      <StatBox label="Rejected"        value={rejected}  color={T.red} />
      <div style={{ marginLeft: 'auto' }}>
        <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 4 }}>Overall reply rate</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: SUPA_GREEN }}>
          {contacted > 0 ? ((replied / contacted) * 100).toFixed(1) : '0.0'}%
        </div>
      </div>
    </div>
  )
}

export default function ClientAnalytics() {
  const [stats, setStats]   = useState(null)
  const [error, setError]   = useState(null)

  useEffect(() => {
    apiFetch('/api/client-analytics')
      .then(async r => {
        const text = await r.text()
        if (!r.ok) {
          setError(`HTTP ${r.status}: ${text}`)
          return
        }
        try {
          const d = JSON.parse(text)
          setStats(d.clients)
        } catch {
          setError(`JSON parse error: ${text}`)
        }
      })
      .catch(e => setError(`Fetch error: ${e.message}`))
  }, [])

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Client Analytics" />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 48px 80px' }}>

        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: FS.sc, fontWeight: 600, color: SUPA_GREEN }}>SUPABASE</div>
            <div style={{
              background: `linear-gradient(135deg, ${SUPA_GREEN}, #1a9e6a)`,
              color: '#fff', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 99,
            }}>NEW</div>
          </div>
          <div style={{ fontSize: FS.h, fontWeight: 700, color: INK, letterSpacing: '-0.3px', marginBottom: 6 }}>Client Analytics</div>
          <div style={{ fontSize: FS.c, color: MUTED }}>Live outreach stats per client from the Supabase tracking database.</div>
        </div>

        {error && (
          <div style={{ background: T.redLight, color: T.red, borderRadius: 10, padding: '12px 20px', marginBottom: 24, fontSize: FS.c }}>
            {error}
          </div>
        )}

        {!stats && !error && (
          <div style={{ color: MUTED, fontSize: FS.c }}>Loading…</div>
        )}

        {stats && (
          <>
            <SummaryBar stats={stats} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
              {stats.map(c => <ClientCard key={c.client} data={c} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
