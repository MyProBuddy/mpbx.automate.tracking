import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'

const TOOLS = [
  {
    path: '/tools/check-sent-mail',
    color: '#7C3AED', colorLight: '#F5F3FF',
    title: 'Check Sent Mail',
    desc: 'Review sent emails across your outreach campaigns — inspect delivery status, open rates, and bounce flags.',
    items: ['View sent email log', 'Check delivery status', 'Flag bounced addresses'],
    disabled: false,
  },
  {
    path: '/tools/prompt-editor',
    color: '#D97706', colorLight: '#FFFBEB',
    title: 'Edit Prompt Template',
    desc: 'Modify the AI prompt templates used to generate outreach emails and followups for your campaigns.',
    items: ['Edit intro email prompt', 'Edit followup prompt', 'Preview generated output'],
    disabled: false,
  },
]

function ToolCard({ t }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => !t.disabled && t.path && navigate(t.path)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.surface, borderRadius: 14, padding: 32,
        border: `1.5px solid ${hov && !t.disabled ? t.color : T.border}`,
        transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column',
        opacity: t.disabled ? 0.6 : 1, cursor: t.disabled ? 'default' : 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.color, letterSpacing: '0.1em' }}>TOOL</div>
        {t.disabled && (
          <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 99, padding: '3px 10px', letterSpacing: '0.06em' }}>
            BUILD IN PROGRESS
          </span>
        )}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.03em', marginBottom: 10 }}>{t.title}</div>
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 28 }}>{t.desc}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        {t.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.muted }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Tools() {
  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans }}>
      <Nav title="Tools" backTo="/hub" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 8 }}>Utilities</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: T.text, marginBottom: 6 }}>Tools</div>
          <div style={{ fontSize: 13, color: T.muted }}>Diagnostic and configuration utilities for your outreach campaigns.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {TOOLS.map(t => <ToolCard key={t.title} t={t} />)}
        </div>
      </div>
    </div>
  )
}
