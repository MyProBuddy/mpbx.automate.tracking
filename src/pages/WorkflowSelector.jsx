import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'

const WORKFLOWS = [
  { path: '/workflow/outlook', label: 'MICROSOFT', title: 'Outlook Outreach', desc: 'Investor outreach using Microsoft Outlook for email delivery.', color: '#0072C6' },
  { path: '/workflow/gmail',   label: 'GOOGLE',    title: 'Gmail Outreach',   desc: 'Investor outreach using Gmail for email delivery.',           color: '#EA4335' },
]

export default function WorkflowSelector() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans }}>
      <Nav title="Get Workflow" backTo="/hub" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: T.accent, marginBottom: 8 }}>Workflow</div>
          <h1 style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.8px', lineHeight: 1.15, margin: '0 0 8px', color: T.text }}>Choose a workflow</h1>
          <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.6 }}>Select the workflow you want to configure and download.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 720 }}>
          {WORKFLOWS.map(w => {
            const [hov, setHov] = useState(false)
            return (
              <button key={w.path} onClick={() => navigate(w.path)}
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => setHov(false)}
                style={{
                  background: T.surface, borderRadius: 12, padding: 24, textAlign: 'left',
                  border: `1px solid ${hov ? w.color : T.border}`,
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: w.color, marginBottom: 14 }}>{w.label}</div>
                <div style={{ fontSize: 19, fontWeight: 500, color: T.text, letterSpacing: '-0.3px', marginBottom: 8 }}>{w.title}</div>
                <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.5 }}>{w.desc}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
