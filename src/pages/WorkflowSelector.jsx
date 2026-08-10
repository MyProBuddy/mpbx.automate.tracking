import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'

const FONT  = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FS    = { h: 32, sh: 18, c: 14, sc: 12 }
const INK   = '#1a1a1a'
const MUTED = '#626260'

const NEU_BG     = '#F0F0F0'
const NEU_SURF   = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHADOW = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const NEU_INSET  = 'inset 4px 4px 10px rgba(0,0,0,0.12), inset -4px -4px 10px rgba(255,255,255,0.85)'

const WORKFLOWS = [
  { path: '/workflow/outlook', label: 'MICROSOFT', title: 'Outlook Outreach', desc: 'Investor outreach using Microsoft Outlook for email delivery.', color: '#0072C6' },
  { path: '/workflow/gmail',   label: 'GOOGLE',    title: 'Gmail Outreach',   desc: 'Investor outreach using Gmail for email delivery.',           color: '#EA4335' },
]

function WorkflowCard({ w }) {
  const navigate = useNavigate()
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={() => navigate(w.path)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        background: NEU_SURF, borderRadius: 16, padding: 28, textAlign: 'left',
        border: 'none', fontFamily: FONT,
        boxShadow: pressed ? NEU_INSET : NEU_SHADOW,
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: FS.sc, fontWeight: 500, color: w.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{w.label}</div>
      <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, letterSpacing: '-0.2px', marginBottom: 8 }}>{w.title}</div>
      <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.5 }}>{w.desc}</div>
    </button>
  )
}

export default function WorkflowSelector() {
  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Get Workflow" backTo="/hub" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: FS.c, fontWeight: 500, color: '#7C3AED', marginBottom: 8 }}>Workflow</div>
          <div style={{ fontSize: FS.h, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.2, color: INK, marginBottom: 6 }}>Choose a workflow</div>
          <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.6 }}>Select the workflow you want to configure and download.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 720 }}>
          {WORKFLOWS.map(w => <WorkflowCard key={w.path} w={w} />)}
        </div>
      </div>
    </div>
  )
}
