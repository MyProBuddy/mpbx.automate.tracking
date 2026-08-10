import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'

const FONT  = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FS    = { h: 32, sh: 18, c: 14, sc: 12 }
const INK   = '#1a1a1a'
const MUTED = '#626260'

const NEU_BG     = '#F0F0F0'
const NEU_SURF   = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHADOW = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const NEU_INSET  = 'inset 4px 4px 10px rgba(0,0,0,0.12), inset -4px -4px 10px rgba(255,255,255,0.85)'

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
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={() => !t.disabled && t.path && navigate(t.path)}
      onMouseLeave={() => setPressed(false)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: NEU_SURF, borderRadius: 16, padding: 28, textAlign: 'left',
        border: 'none', fontFamily: FONT,
        boxShadow: pressed ? NEU_INSET : NEU_SHADOW,
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        display: 'flex', flexDirection: 'column',
        opacity: t.disabled ? 0.6 : 1, cursor: t.disabled ? 'default' : 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: FS.sc, fontWeight: 500, color: t.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tool</div>
        {t.disabled && (
          <span style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, background: 'rgba(0,0,0,0.06)', borderRadius: 999, padding: '3px 10px' }}>
            Build in progress
          </span>
        )}
      </div>
      <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, letterSpacing: '-0.2px', lineHeight: 1.25, marginBottom: 10 }}>{t.title}</div>
      <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.6, marginBottom: 24 }}>{t.desc}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        {t.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.color, flexShrink: 0, boxShadow: `0 0 0 2px ${t.color}30` }} />
            <span style={{ fontSize: FS.sc, color: MUTED }}>{item}</span>
          </div>
        ))}
      </div>
    </button>
  )
}

export default function Tools() {
  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Tools" backTo="/hub" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: FS.c, fontWeight: 500, color: '#7C3AED', marginBottom: 8 }}>Utilities</div>
          <div style={{ fontSize: FS.h, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.2, color: INK, marginBottom: 6 }}>Tools</div>
          <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.5 }}>Diagnostic and configuration utilities for your outreach campaigns.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {TOOLS.map(t => <ToolCard key={t.title} t={t} />)}
        </div>
      </div>
    </div>
  )
}
