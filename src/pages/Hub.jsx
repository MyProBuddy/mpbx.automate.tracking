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
]

export default function Hub() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>
      <Nav title="Workflow Configurator" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 8 }}>Dashboard</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: T.text, marginBottom: 6 }}>What would you like to do?</div>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>Choose an action to get started.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900, gridAutoRows: '1fr' }}>
          {OPTIONS.map(o => {
            const [hov, setHov] = useState(false)
            return (
              <button key={o.label} onClick={() => navigate(o.path)}
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => setHov(false)}
                style={{
                  background: T.surface, borderRadius: 14, padding: 32, textAlign: 'left',
                  border: `1.5px solid ${hov ? o.color : T.border}`,
                  cursor: 'pointer', transition: 'border-color 0.15s',
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: o.color, letterSpacing: '0.1em', marginBottom: 16 }}>{o.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.03em', marginBottom: 10 }}>{o.title}</div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 28 }}>{o.desc}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                  {o.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: o.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: T.muted }}>{item}</span>
                    </div>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
