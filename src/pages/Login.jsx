import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { T, authenticate } from '../constants.js'
import { useAuth } from '../AuthContext.jsx'

export default function Login() {
  const { role, login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [eFoc, setEFoc]         = useState(false)
  const [pFoc, setPFoc]         = useState(false)

  if (role) return <Navigate to="/hub" replace />

  const fieldStyle = focused => ({
    width: '100%', padding: '12px 14px',
    background: focused ? '#fff' : T.bg,
    border: `1.5px solid ${focused ? T.accent : T.border}`,
    borderRadius: 8, fontSize: 14, fontFamily: T.sans,
    color: T.text, outline: 'none', transition: 'border-color 0.15s, background 0.15s',
    letterSpacing: '-0.01em',
  })

  const submit = e => {
    e.preventDefault()
    const r = authenticate(email, password)
    if (r) login(r)
    else setError('Incorrect email or password.')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: T.sans }}>
      <div style={{
        width: '42%', background: '#0F0B2A',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 52px', flexShrink: 0,
        backgroundImage: 'radial-gradient(circle at 80% 20%, #2A1A6E 0%, transparent 60%), radial-gradient(circle at 20% 80%, #1A0F45 0%, transparent 50%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: T.accent, borderRadius: 8 }} />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500 }}>myprobuddy</span>
        </div>
        <div>
          <div style={{ fontSize: 52, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 20 }}>
            Workflow<br />Configurator
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 280 }}>
            Configure credentials, manage investor data, and dispatch outreach workflows.
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>INTERNAL USE ONLY</div>
      </div>

      <div style={{ flex: 1, background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: '-0.03em', marginBottom: 6 }}>Sign in</div>
            <div style={{ fontSize: 14, color: T.muted }}>Access the configurator</div>
          </div>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</div>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com" required
                onFocus={() => setEFoc(true)} onBlur={() => setEFoc(false)}
                style={fieldStyle(eFoc)} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Password</div>
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••" required
                onFocus={() => setPFoc(true)} onBlur={() => setPFoc(false)}
                style={fieldStyle(pFoc)} />
            </div>
            {error && <div style={{ fontSize: 13, color: T.red, background: T.redLight, padding: '10px 14px', borderRadius: 8 }}>{error}</div>}
            <button type="submit" style={{
              marginTop: 4, padding: '12px', background: T.accent,
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 700, fontFamily: T.sans,
              letterSpacing: '-0.01em', cursor: 'pointer',
            }}>
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
