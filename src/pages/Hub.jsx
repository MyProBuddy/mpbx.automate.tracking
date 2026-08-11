import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FS   = { h: 32, sh: 18, c: 14, sc: 12 }
const INK  = '#1a1a1a'
const MUTED = '#626260'

const NEU_BG     = '#F0F0F0'
const NEU_SURF   = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHADOW = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const NEU_INSET  = 'inset 4px 4px 10px rgba(0,0,0,0.12), inset -4px -4px 10px rgba(255,255,255,0.85)'

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
    label: 'INSIGHTS', title: 'Client Analytics',
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
  {
    path: '/internal-analytics',
    color: '#C026D3', colorLight: '#FDF4FF',
    label: 'INTERNAL', title: 'Internal Analytics',
    desc: 'Internal performance metrics and operational analytics across all outreach campaigns and automations.',
    items: ['Campaign-wide performance view', 'Automation health metrics', 'Internal reporting dashboard'],
    disabled: true,
  },
]

function HubCard({ o }) {
  const navigate = useNavigate()
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={() => !o.disabled && navigate(o.path)}
      onMouseLeave={() => setPressed(false)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: NEU_SURF,
        borderRadius: 16, padding: 28, textAlign: 'left',
        border: 'none',
        boxShadow: pressed ? NEU_INSET : NEU_SHADOW,
        cursor: o.disabled ? 'default' : 'pointer',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        display: 'flex', flexDirection: 'column',
        opacity: o.disabled ? 0.5 : 1,
        fontFamily: FONT,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, marginBottom: 16,
        background: `linear-gradient(145deg, ${o.colorLight}, ${o.color}22)`,
        boxShadow: '-3px -3px 8px rgba(255,255,255,0.9), 3px 3px 8px rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: o.color }} />
      </div>
      <div style={{ fontSize: FS.sc, fontWeight: 500, color: o.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{o.label}</div>
      <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, letterSpacing: '-0.2px', lineHeight: 1.25, marginBottom: 10 }}>{o.title}</div>
      <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.6, marginBottom: 20 }}>{o.desc}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        {o.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: o.color, flexShrink: 0, boxShadow: `0 0 0 2px ${o.color}30` }} />
            <span style={{ fontSize: FS.sc, color: MUTED }}>{item}</span>
          </div>
        ))}
      </div>
    </button>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, color: color || INK, letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value !== null && value !== undefined ? Number(value).toLocaleString() : '—'}
      </div>
    </div>
  )
}

function GeoBar({ name, count, max }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 130, fontSize: FS.sc, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>{name}</div>
      <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#5647E0', borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, width: 40, textAlign: 'right', flexShrink: 0 }}>{count.toLocaleString()}</div>
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
      background: NEU_SURF, borderRadius: 16, padding: 32,
      boxShadow: NEU_SHADOW, gridColumn: '1 / -1', fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: FS.sc, fontWeight: 500, color: '#5647E0', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Master Database</div>
          <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, letterSpacing: '-0.2px' }}>Data Workflows</div>
        </div>
        <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, background: 'rgba(0,0,0,0.06)', borderRadius: 8, padding: '4px 12px' }}>Coming soon</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div>
          <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Firms</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 28 }}>
            <StatPill label="Total"    value={loading ? null : firms?.total} />
            <StatPill label="Active"   value={loading ? null : firms?.active}   color={T.green} />
            <StatPill label="Inactive" value={loading ? null : firms?.inactive} color={MUTED} />
          </div>

          <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Investors</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            <StatPill label="Total"    value={loading ? null : investors?.total} />
            <StatPill label="Active"   value={loading ? null : investors?.active}   color={T.green} />
            <StatPill label="Inactive" value={loading ? null : investors?.inactive} color={MUTED} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Geographic Density</div>
          {loading
            ? <div style={{ fontSize: FS.c, color: MUTED }}>Loading…</div>
            : geo.length === 0
              ? <div style={{ fontSize: FS.c, color: MUTED }}>No geography data</div>
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
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Workflow Configurator" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: FS.c, fontWeight: 500, color: T.accent, marginBottom: 8 }}>Dashboard</div>
          <div style={{ fontSize: FS.h, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.2, color: INK, marginBottom: 6 }}>What would you like to do?</div>
          <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.5 }}>Choose an action to get started.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, gridAutoRows: '1fr' }}>
          {OPTIONS.map(o => <HubCard key={o.label} o={o} />)}
        </div>
      </div>
    </div>
  )
}
