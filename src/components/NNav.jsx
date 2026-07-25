import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const NAV_ITEMS = [
  { label: 'Overview',  path: '/n/overview' },
  { label: 'Analytics', path: '/n/analytics' },
  { label: 'Alerts',    path: '/n/alerts' },
  { label: 'Tools',     path: '/n/tools' },
  { label: 'Settings',  path: '/n/settings' },
]

export default function NNav() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const activeLabel = NAV_ITEMS.find(i => location.pathname === i.path)?.label ?? ''
  const [hovered, setHovered] = useState(null)

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      height: 68,
      padding: '0 48px',
      width: '100%',
      position: 'relative',
      zIndex: 10,
      borderBottom: '1px solid rgba(0,0,0,0.07)',
    }}>

      {/* Logo */}
      <div
        onClick={() => navigate('/home')}
        style={{
          marginRight: 'auto',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'baseline',
          gap: 0,
          userSelect: 'none',
        }}
      >
        <span style={{
          fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em',
          background: 'linear-gradient(to right, #f87711, #d21e40)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>MPB</span>
        <span style={{
          fontSize: 22, fontWeight: 400, letterSpacing: '-0.03em',
          color: '#ca1b49',
        }}>x</span>
        <span style={{
          fontSize: 13, fontWeight: 500, marginLeft: 6, letterSpacing: '0em',
          background: 'linear-gradient(to right, #eb212c, #5e238d)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Tracking</span>
      </div>

      {/* Nav pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

        {NAV_ITEMS.map(item => {
          const isActive = activeLabel === item.label
          const isHov = hovered === item.label
          return (
            <a
              key={item.label}
              href="#"
              onClick={e => { e.preventDefault(); navigate(item.path) }}
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '7px 18px',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                letterSpacing: '-0.01em',
                textDecoration: 'none',
                color: isActive ? '#111' : isHov ? '#222' : '#555',
                borderRadius: 7,
                background: isActive ? '#ffffff' : isHov ? 'rgba(0,0,0,0.05)' : 'transparent',
                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.07)' : 'none',
                transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
              }}
            >
              {item.label}
            </a>
          )
        })}

        {/* Divider */}
        <div style={{
          width: 1, height: 18,
          background: 'rgba(0,0,0,0.12)',
          margin: '0 12px',
          flexShrink: 0,
        }} />

        {/* Search */}
        <button
          style={{
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hovered === '__search' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.04)',
            border: 'none',
            borderRadius: 7,
            cursor: 'pointer',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={() => setHovered('__search')}
          onMouseLeave={() => setHovered(null)}
        >
          <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="#555" strokeWidth="1.5">
            <circle cx="5.5" cy="5.5" r="4.5" />
            <line x1="9" y1="9" x2="12" y2="12" strokeLinecap="round" />
          </svg>
        </button>

        {/* Sign out */}
        <button
          onClick={logout}
          style={{
            marginLeft: 6,
            padding: '7px 16px',
            fontSize: 13, fontWeight: 500,
            fontFamily: "'Urbanist', sans-serif",
            letterSpacing: '-0.01em',
            color: '#888',
            background: 'transparent',
            border: '1px solid rgba(0,0,0,0.13)',
            borderRadius: 7,
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#444' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888' }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
