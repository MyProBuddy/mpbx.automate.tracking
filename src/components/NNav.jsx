import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Overview',  path: '/n/overview' },
  { label: 'Analytics', path: '/n/analytics' },
  { label: 'Alerts',    path: '/n/alerts' },
  { label: 'Tools',     path: '/n/tools' },
]

export default function NNav() {
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
    }}>

      {/* Left — Logo */}
      <div
        onClick={() => navigate('/home')}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'baseline',
          gap: 0,
          userSelect: 'none',
        }}
      >
        <span style={{
          fontSize: 25, fontWeight: 700, letterSpacing: '-0.03em',
          background: 'linear-gradient(to right, #f87711, #d21e40)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>MPB</span>
        <span style={{
          fontSize: 25, fontWeight: 400, letterSpacing: '-0.03em',
          color: '#ca1b49',
        }}>x</span>
        <span style={{
          fontSize: 13, fontWeight: 500, marginLeft: 6,
          background: 'linear-gradient(to right, #eb212c, #5e238d)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Tracking</span>
      </div>

      {/* Centre — Nav pills + search, absolutely centred */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {/* Search — first in centre group */}
        <button
          style={{
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hovered === '__search' ? '#e8e9e4' : '#f0f1ec',
            border: 'none', borderRadius: 7, cursor: 'pointer',
            transition: 'background 0.15s', flexShrink: 0,
          }}
          onMouseEnter={() => setHovered('__search')}
          onMouseLeave={() => setHovered(null)}
        >
          <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="#555" strokeWidth="1.6">
            <circle cx="5.5" cy="5.5" r="4.5" />
            <line x1="9" y1="9" x2="12" y2="12" strokeLinecap="round" />
          </svg>
        </button>

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
                color: '#000',
                borderRadius: 7,
                background: isActive ? '#ffffff' : isHov ? '#e8e9e4' : '#f0f1ec',
                transition: 'background 0.15s',
              }}
            >
              {item.label}
            </a>
          )
        })}

      </div>

      {/* Right — hexagon profile button only */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
        <button
          style={{
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hovered === '__profile' ? '#e8e9e4' : '#f0f1ec',
            border: 'none', borderRadius: 7, cursor: 'pointer',
            transition: 'background 0.15s', flexShrink: 0,
          }}
          onMouseEnter={() => setHovered('__profile')}
          onMouseLeave={() => setHovered(null)}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L20.66 7 L20.66 17 L12 22 L3.34 17 L3.34 7 Z" />
            <circle cx="12" cy="12" r="3.5" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
