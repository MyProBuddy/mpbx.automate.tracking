import { useNavigate } from 'react-router-dom'
import { T, ROLE_META } from '../constants.js'
import { useAuth } from '../AuthContext.jsx'

function RoleBadge({ role }) {
  const m = ROLE_META[role]
  if (!m) return null
  return (
    <span style={{ fontSize: 11, fontWeight: 700, background: m.light, color: m.color, borderRadius: 6, padding: '3px 10px', letterSpacing: '0.04em', fontFamily: T.sans }}>
      {m.label}
    </span>
  )
}

export default function Nav({ title, subtitle, pendingCount, onDownload, status, backTo, extra }) {
  const { role, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
      position: 'sticky', top: 0, zIndex: 10,
      padding: '0 32px', height: 48,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: T.sans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {backTo && (
          <button onClick={() => navigate(backTo)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: T.accent, fontWeight: 500, padding: 0, fontFamily: T.sans }}>
            ← Back
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, background: T.accent, borderRadius: 6, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: '-0.02em' }}>{title}</span>
          {subtitle && <span style={{ fontSize: 12, color: T.faint }}>{subtitle}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {pendingCount > 0 && (
          <span style={{ fontSize: 12, color: T.muted, background: T.accentLight, padding: '4px 12px', borderRadius: 6, fontWeight: 500 }}>
            {pendingCount} change{pendingCount > 1 ? 's' : ''}
          </span>
        )}
        {onDownload && (
          <button onClick={onDownload} style={{
            padding: '8px 20px',
            background: status === 'done' ? T.green : T.accent,
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, fontFamily: T.sans,
            letterSpacing: '-0.01em', cursor: 'pointer', transition: 'background 0.2s',
          }}>
            {status === 'done' ? '✓ Downloaded' : 'Download JSON'}
          </button>
        )}
        {extra}
        {role && <RoleBadge role={role} />}
        <button onClick={logout} style={{
          background: 'none', border: `1.5px solid ${T.border}`, borderRadius: 8,
          padding: '6px 14px', fontSize: 12, color: T.muted, cursor: 'pointer', fontFamily: T.sans, fontWeight: 500,
        }}>
          Sign out
        </button>
      </div>
    </div>
  )
}
