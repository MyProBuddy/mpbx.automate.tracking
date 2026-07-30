import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'
import { supabase } from '../lib/supabase.js'

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
    path: null,
    color: '#7C3AED', colorLight: '#F5F3FF',
    label: 'BUILD IN PROGRESS', title: 'Tools',
    desc: 'Utilities to validate emails, check bounce risk, and run diagnostics across your outreach campaigns.',
    items: ['Mail validation & bounce check', 'Email health diagnostics', 'Campaign audit utilities'],
    disabled: true,
  },
  {
    path: null,
    color: T.muted, colorLight: T.bg,
    label: 'COMING SOON', title: 'Data Workflows',
    desc: 'Automated pipelines that enrich, validate, and sync your investor data across sources.',
    items: ['Enrich investor records', 'Validate and deduplicate', 'Sync across sheets'],
    disabled: true,
  },
]

function HubCard({ o }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={() => !o.disabled && navigate(o.path)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.surface, borderRadius: 14, padding: 32, textAlign: 'left',
        border: `1.5px solid ${hov && !o.disabled ? o.color : T.border}`,
        cursor: o.disabled ? 'default' : 'pointer', transition: 'border-color 0.15s',
        display: 'flex', flexDirection: 'column', opacity: o.disabled ? 0.6 : 1,
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
}

export default function Hub() {
  const [dbStats, setDbStats] = useState({ firms: null, investors: null })

  useEffect(() => {
    async function fetchStats() {
      if (!supabase) return
      const [{ count: firms }, { count: investors }] = await Promise.all([
        supabase.from('firms').select('*', { count: 'exact', head: true }),
        supabase.from('investors').select('*', { count: 'exact', head: true }),
      ])
      setDbStats({ firms, investors })
    }
    fetchStats()
  }, [])

  const options = OPTIONS.map(o =>
    o.title === 'Data Workflows'
      ? {
          ...o,
          items: [
            dbStats.firms !== null ? `${dbStats.firms.toLocaleString()} firms in master database` : 'Loading firms…',
            dbStats.investors !== null ? `${dbStats.investors.toLocaleString()} investors in master database` : 'Loading investors…',
            'Validate and deduplicate',
            'Sync across sheets',
          ],
        }
      : o
  )

  function downloadEnv() {
    const vars = [
      'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON',
      'VITE_SA_EMAIL', 'VITE_SA_PASSWORD',
      'VITE_GOOGLE_CLIENT_ID', 'VITE_GOOGLE_CLIENT_SECRET',
      'VITE_DRIVE_CLIENTS_FOLDER_ID', 'VITE_DRIVE_SHEETS_FOLDER_ID',
      'VITE_TEMPLATE_SHEET_ID', 'VITE_GIST_ID',
      'VITE_GITHUB_TOKEN', 'VITE_ENCRYPT_KEY',
    ]
    const lines = vars
      .map(k => `${k}=${import.meta.env[k] ?? ''}`)
      .join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines], { type: 'text/plain' }))
    a.download = '.env'
    a.click()
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans }}>
      <Nav title="Workflow Configurator" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div style={{ marginBottom: 44, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 8 }}>Dashboard</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: T.text, marginBottom: 6 }}>What would you like to do?</div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>Choose an action to get started.</div>
          </div>
          <button onClick={downloadEnv} style={{ fontSize: 12, fontWeight: 600, color: T.muted, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', marginTop: 6 }}>
            Download .env
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, gridAutoRows: '1fr' }}>
          {options.map(o => <HubCard key={o.label} o={o} />)}
        </div>
      </div>
    </div>
  )
}
