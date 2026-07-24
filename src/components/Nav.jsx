import { useNavigate } from 'react-router-dom'
import { T, ROLE_META } from '../constants.js'
import { useAuth } from '../AuthContext.jsx'

const GRAD = 'linear-gradient(90deg, #C026D3, #F43F5E, #F97316)'

function RoleBadge({ role }) {
  const m = ROLE_META[role]
  if (!m) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
      background: GRAD, color: '#fff',
      borderRadius: 999, padding: '4px 13px',
      boxShadow: '0 2px 10px rgba(168,85,247,0.3)',
      whiteSpace: 'nowrap',
    }}>
      {m.label}
    </span>
  )
}

export default function Nav({ title, subtitle, pendingCount, onDownload, status, backTo, extra }) {
  const { role, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="mpbx-nav">

      {/* Left — brand + page title */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img
          src="https://myprobuddy.com/images/mpb.png"
          alt="MPB"
          style={{ width: 28, height: 28, objectFit: 'contain', marginRight: 9, filter: 'drop-shadow(0 2px 6px rgba(168,85,247,0.25))' }}
        />
        <span className="mpbx-brand-name">MPBX</span>
        <span style={{ fontSize: 15, fontWeight: 400, letterSpacing: '-0.01em', color: 'rgba(60,50,80,0.72)', marginLeft: 1 }}>
          tracking
        </span>

        {/* separator */}
        <div style={{ width: 1, height: 18, background: 'rgba(120,110,150,0.18)', margin: '0 18px', flexShrink: 0 }} />

        {/* back button or page title */}
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'rgba(50,40,70,0.65)', padding: 0, fontFamily: 'inherit', marginRight: 12 }}
          >
            ← Back
          </button>
        )}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(50,40,70,0.68)', letterSpacing: '-0.01em' }}>
          {title}
          {subtitle && <span style={{ fontWeight: 400, color: 'rgba(80,70,100,0.45)', marginLeft: 4 }}>{subtitle}</span>}
        </span>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {pendingCount > 0 && (
          <span style={{ fontSize: 12, color: T.muted, background: T.accentLight, padding: '4px 12px', borderRadius: 6, fontWeight: 500 }}>
            {pendingCount} change{pendingCount > 1 ? 's' : ''}
          </span>
        )}
        {onDownload && (
          <button onClick={onDownload} style={{
            padding: '7px 18px',
            background: status === 'done' ? '#16A34A' : GRAD,
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            letterSpacing: '-0.01em', cursor: 'pointer',
          }}>
            {status === 'done' ? '✓ Downloaded' : 'Download JSON'}
          </button>
        )}
        {extra}
        {role && <RoleBadge role={role} />}
        <button
          onClick={logout}
          style={{
            fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
            color: 'rgba(80,70,100,0.65)',
            background: 'rgba(255,255,255,0.32)',
            border: '1px solid rgba(160,150,190,0.22)',
            borderRadius: 8, padding: '6px 15px',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
