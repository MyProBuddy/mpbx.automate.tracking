import { useState } from 'react'
import { T } from '../constants.js'

export function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: T.sans }}>{children}</div>
}

export function TextInput({ value, onChange, placeholder, mono, disabled }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '11px 14px',
        background: focused ? T.surface : T.bg,
        border: `1.5px solid ${focused ? T.accent : T.border}`,
        borderRadius: 8, fontSize: mono ? 12 : 14,
        fontFamily: mono ? T.mono : T.sans,
        color: T.text, outline: 'none', transition: 'border-color 0.15s, background 0.15s',
        letterSpacing: mono ? '0.02em' : '-0.01em',
        boxSizing: 'border-box',
      }}
    />
  )
}

export function Btn({ onClick, children, variant = 'primary', small, disabled }) {
  const styles = {
    primary: { background: T.accent, color: '#fff' },
    ghost:   { background: 'transparent', color: T.text, border: `1.5px solid ${T.border}` },
    danger:  { background: T.red, color: '#fff' },
  }
  const s = styles[variant] || styles.primary
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '7px 16px' : '11px 22px',
      ...s,
      border: s.border || 'none',
      borderRadius: 8,
      fontSize: small ? 12 : 14, fontWeight: 600,
      fontFamily: T.sans,
      letterSpacing: '-0.01em', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'opacity 0.15s',
      whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: T.surface,
      borderRadius: 14,
      border: `1.5px solid ${T.border}`,
      padding: 28,
      boxSizing: 'border-box',
      ...style,
    }}>{children}</div>
  )
}

export function CardTitle({ children }) {
  return <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: T.text, marginBottom: 6, fontFamily: T.sans }}>{children}</div>
}

export function CardDesc({ children }) {
  return <div style={{ fontSize: 13, color: T.muted, marginBottom: 24, lineHeight: 1.55, fontFamily: T.sans }}>{children}</div>
}

export function DiffValue({ current, next, mono }) {
  const changed = next.trim() !== '' && next.trim() !== current
  const f = mono ? T.mono : T.sans
  if (!changed) {
    return <div style={{ fontFamily: f, fontSize: 11, color: T.muted, marginBottom: 10, padding: '5px 10px', background: T.bg, borderRadius: 6, display: 'inline-block' }}>{current}</div>
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
      <span style={{ fontFamily: f, fontSize: 11, color: T.red, background: T.redLight, padding: '4px 10px', borderRadius: 6, textDecoration: 'line-through' }}>{current}</span>
      <span style={{ color: T.faint, fontSize: 10 }}>→</span>
      <span style={{ fontFamily: f, fontSize: 11, color: T.green, background: T.greenLight, padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>{next}</span>
    </div>
  )
}

export function ComingSoonBody({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 48px)', fontFamily: T.sans }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, background: T.accentLight, borderRadius: 16, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 20, height: 20, border: `2.5px solid ${T.accent}`, borderRadius: 4 }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: '-0.03em', marginBottom: 8 }}>Coming soon</div>
        <div style={{ fontSize: 14, color: T.muted, maxWidth: 320 }}>{label}</div>
      </div>
    </div>
  )
}
