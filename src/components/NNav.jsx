import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const NAV_ITEMS = [
  { label: 'Overview',  path: '/n/overview' },
  { label: 'Analytics', path: '/n/analytics' },
  { label: 'Alerts',    path: '/n/alerts' },
  { label: 'Tools',     path: '/n/tools' },
]

const DROPDOWN_ITEMS = [
  { label: 'Settings',    icon: '⚙' },
  { label: 'Profile',     icon: '👤' },
  { label: 'Sign out',    icon: '→', action: 'signout' },
]

export default function NNav() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const activeLabel = NAV_ITEMS.find(i => location.pathname === i.path)?.label ?? ''
  const [hovered, setHovered] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropHovered, setDropHovered] = useState(null)
  const dropdownRef = useRef(null)

  // close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      height: 80,
      padding: '0 52px',
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
          gap: 6,
          userSelect: 'none',
        }}
      >
        <span style={{
          fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
          background: 'linear-gradient(to right, #f87711, #d21e40)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>MPB</span>
        <span style={{
          fontSize: 28, fontWeight: 400, letterSpacing: '-0.03em',
          color: '#ca1b49',
        }}>x</span>
        <span style={{
          fontSize: 15, fontWeight: 500,
          background: 'linear-gradient(to right, #eb212c, #5e238d)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Tracking</span>
      </div>

      {/* Centre — Search + Nav pills */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {/* Search */}
        <button
          style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hovered === '__search' ? '#e8e9e4' : '#f0f1ec',
            border: 'none', borderRadius: 7, cursor: 'pointer',
            transition: 'background 0.15s', flexShrink: 0,
          }}
          onMouseEnter={() => setHovered('__search')}
          onMouseLeave={() => setHovered(null)}
        >
          <svg width="16" height="16" viewBox="0 0 13 13" fill="none" stroke="#555" strokeWidth="1.6">
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
                padding: '10px 22px',
                fontSize: 15,
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

      {/* Right — hexagon button + dropdown */}
      <div ref={dropdownRef} style={{ marginLeft: 'auto', position: 'relative' }}>
        <button
          onClick={() => setDropdownOpen(o => !o)}
          style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: dropdownOpen || hovered === '__profile' ? '#e8e9e4' : '#f0f1ec',
            border: 'none', borderRadius: 7, cursor: 'pointer',
            transition: 'background 0.15s', flexShrink: 0,
          }}
          onMouseEnter={() => setHovered('__profile')}
          onMouseLeave={() => setHovered(null)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L20.66 7 L20.66 17 L12 22 L3.34 17 L3.34 7 Z" />
            <circle cx="12" cy="12" r="3.5" />
          </svg>
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            minWidth: 180,
            background: '#ffffff',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            overflow: 'hidden',
            zIndex: 100,
          }}>
            {DROPDOWN_ITEMS.map(item => (
              <button
                key={item.label}
                onClick={() => {
                  setDropdownOpen(false)
                  if (item.action === 'signout') logout()
                }}
                onMouseEnter={() => setDropHovered(item.label)}
                onMouseLeave={() => setDropHovered(null)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 16px',
                  fontSize: 14, fontWeight: 500,
                  fontFamily: "'Urbanist', sans-serif",
                  letterSpacing: '-0.01em',
                  color: item.action === 'signout' ? '#d21e40' : '#111',
                  background: dropHovered === item.label ? '#f5f5f5' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  transition: 'background 0.12s',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 15, opacity: 0.7 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
