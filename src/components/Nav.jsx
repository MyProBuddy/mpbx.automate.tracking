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
        <span style={{ fontSize: 14, fontWeight: 400, color: T.muted, marginLeft: 1 }}>
          tracking
        </span>

        {/* separator */}
        <div style={{ width: 1, height: 18, background: T.border, margin: '0 18px', flexShrink: 0 }} />

        {/* back button or page title */}
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: T.muted, padding: 0, fontFamily: 'inherit', marginRight: 12 }}
          >
            ← Back
          </button>
        )}
        <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>
          {title}
          {subtitle && <span style={{ fontWeight: 400, color: T.muted, marginLeft: 4 }}>{subtitle}</span>}
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
            padding: T.btnPadding,
            background: status === 'done' ? T.green : T.accent,
            color: '#fff', border: 'none', borderRadius: T.btnRadius,
            fontSize: T.btnFontSize, fontWeight: T.btnWeight, fontFamily: 'inherit',
            cursor: 'pointer', lineHeight: 1.2,
          }}>
            {status === 'done' ? '✓ Downloaded' : 'Download JSON'}
          </button>
        )}
        {extra}
        {role && <RoleBadge role={role} />}
        <button
          onClick={logout}
          style={{
            fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
            color: '#7a7a7a',
            background: 'linear-gradient(145deg, #f6f6f6, #e8e8e8)',
            border: 'none',
            borderRadius: T.btnRadius, padding: '6px 14px',
            cursor: 'pointer', lineHeight: 1.2,
            boxShadow: '-3px -3px 7px rgba(255,255,255,0.9), 3px 3px 7px rgba(0,0,0,0.1)',
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
