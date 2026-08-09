import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'

const OPTIONS = [
  {
    path: '/add-data',
    color: T.green, colorLight: T.greenLight,
    label: 'DATA', title: 'Add Data',
    desc: 'Create Drive folders, upload pitch docs, and set up investor sheets before running any workflow.',
    items: ['Create a client Drive folder', 'Upload pitch documents', 'Set up investor sheet'],
  },
  {
    path: '/workflow',
    color: T.accent, colorLight: T.accentLight,
    label: 'WORKFLOW', title: 'Get Workflow',
    desc: 'Swap credentials and IDs into an n8n workflow template, then download the ready-to-import JSON.',
    items: ['Choose Outlook or Gmail', 'Swap credentials & IDs', 'Download the JSON'],
  },
  {
    path: '/analytics',
    color: '#7C6FF0', colorLight: '#F0EFFE',
    label: 'INSIGHTS', title: 'Analytics',
    desc: 'Visualise investor data across your sheets — sectors, geographies, fund stages, and deal flow.',
    items: ['Connect your investor sheet', 'Explore interactive charts', 'Spot patterns at a glance'],
  },
  {
    path: '/company-intel',
    color: '#D97706', colorLight: '#FFFBEB',
    label: 'INTEL', title: 'Company Intel',
    desc: 'Log company updates — funding rounds, news, leadership changes — so the AI references them when writing followup emails.',
    items: ['Select a client sheet', 'Add updates to the Updates tab', 'AI uses intel in followup pitches'],
  },
  {
    path: '/overview',
    color: '#0891B2', colorLight: '#ECFEFF',
    label: 'OVERVIEW', title: 'Overview',
    desc: 'See a snapshot of all clients — total investors, emails sent, followups, and replies across every campaign.',
    items: ['All clients in one view', 'Followup stage breakdown', 'Replies and this week stats'],
  },
  {
    path: '/tools',
    color: '#7C3AED', colorLight: '#F5F3FF',
    label: 'TOOLS', title: 'Tools',
    desc: 'Utilities to validate emails, check bounce risk, and run diagnostics across your outreach campaigns.',
    items: ['Check sent mail', 'Edit prompt template', 'Campaign audit utilities'],
  },
  {
    path: '/data-workflows',
    color: '#0891B2', colorLight: '#ECFEFF',
    label: 'DATABASE', title: 'Data Workflows',
    desc: 'Explore the master investor and firm database — view counts, activity status, and geographic density.',
    items: ['Master firms & investors database', 'Active vs inactive breakdown', 'Geographic density map'],
  },
]

const NEU_BG = '#F0F0F0'
const neuShadow = (pressed) => pressed
  ? 'inset 4px 4px 10px rgba(0,0,0,0.12), inset -4px -4px 10px rgba(255,255,255,0.85)'
  : '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'

function HubCard({ o }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={() => !o.disabled && navigate(o.path)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: `linear-gradient(145deg, #f6f6f6, #e8e8e8)`,
        borderRadius: 16, padding: 28, textAlign: 'left',
        border: 'none',
        boxShadow: neuShadow(pressed),
        cursor: o.disabled ? 'default' : 'pointer',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        display: 'flex', flexDirection: 'column', opacity: o.disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, marginBottom: 16,
        background: `linear-gradient(145deg, ${o.colorLight}, ${o.color}22)`,
        boxShadow: `-3px -3px 8px rgba(255,255,255,0.9), 3px 3px 8px rgba(0,0,0,0.1)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: o.color }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: o.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{o.label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#2a2a2a', letterSpacing: '-0.3px', lineHeight: 1.25, marginBottom: 10 }}>{o.title}</div>
      <div style={{ fontSize: 13, color: '#7a7a7a', lineHeight: 1.6, marginBottom: 20 }}>{o.desc}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        {o.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: o.color, flexShrink: 0, boxShadow: `0 0 0 2px ${o.color}30` }} />
            <span style={{ fontSize: 13, color: '#7a7a7a' }}>{item}</span>
          </div>
        ))}
      </div>
    </button>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 500, color: color || T.text, letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value !== null && value !== undefined ? Number(value).toLocaleString() : '—'}
      </div>
    </div>
  )
}

function GeoBar({ name, count, max }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 130, fontSize: 12, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>{name}</div>
      <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#5647E0', borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, width: 40, textAlign: 'right', flexShrink: 0 }}>{count.toLocaleString()}</div>
    </div>
  )
}

function MasterDatabasePanel({ stats }) {
  const loading = !stats
  const firms = stats?.firms
  const investors = stats?.investors
  const geo = stats?.topGeographies || []
  const maxGeo = geo[0]?.count || 1

  return (
    <div style={{
      background: T.surface, borderRadius: 14, padding: 32,
      border: `1.5px solid ${T.border}`, gridColumn: '1 / -1',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#5647E0', marginBottom: 6 }}>MASTER DATABASE</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: T.text, letterSpacing: '-0.3px' }}>Data Workflows</div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 12px' }}>COMING SOON</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {/* Stats */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Firms</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
            <StatPill label="Total" value={loading ? null : firms?.total} />
            <StatPill label="Active" value={loading ? null : firms?.active} color={T.green} />
            <StatPill label="Inactive" value={loading ? null : firms?.inactive} color={T.muted} />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Investors</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            <StatPill label="Total" value={loading ? null : investors?.total} />
            <StatPill label="Active" value={loading ? null : investors?.active} color={T.green} />
            <StatPill label="Inactive" value={loading ? null : investors?.inactive} color={T.muted} />
          </div>
        </div>

        {/* Geo density */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Geographic Density</div>
          {loading
            ? <div style={{ fontSize: 13, color: T.muted }}>Loading…</div>
            : geo.length === 0
              ? <div style={{ fontSize: 13, color: T.muted }}>No geography data</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {geo.map(g => <GeoBar key={g.name} name={g.name} count={g.count} max={maxGeo} />)}
                </div>
          }
        </div>
      </div>
    </div>
  )
}

export default function Hub() {

  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans, background: NEU_BG }}>
      <Nav title="Workflow Configurator" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.accent, marginBottom: 8 }}>Dashboard</div>
          <div style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.8px', lineHeight: 1.15, color: '#2a2a2a', marginBottom: 8 }}>What would you like to do?</div>
          <div style={{ fontSize: 16, color: '#7a7a7a', lineHeight: 1.5 }}>Choose an action to get started.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, gridAutoRows: '1fr' }}>
          {OPTIONS.map(o => <HubCard key={o.label} o={o} />)}
        </div>
      </div>
    </div>
  )
}
