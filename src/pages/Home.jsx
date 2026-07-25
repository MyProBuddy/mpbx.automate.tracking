import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const NAV_ITEMS = [
  { label: 'Overview',  path: '/overview' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Alerts',    path: '/alerts' },
  { label: 'Tools',     path: '/hub' },
  { label: 'Settings',  path: '#' },
]

export default function Home() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState('Overview')
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{
      fontFamily: "'Urbanist', sans-serif",
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ffffff 0%, #ffebda 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* centre glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700, height: 700, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(126,108,212,0.18) 0%, rgba(255,255,255,0) 70%)',
      }} />

      <nav style={{
        display: 'flex',
        alignItems: 'center',
        padding: '18px 40px',
        width: '100%',
        position: 'relative',
        zIndex: 10,
      }}>

        {/* Logo */}
        <div
          onClick={() => navigate('/home')}
          style={{ marginRight: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 1 }}
        >
          <span style={{
            fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
            background: 'linear-gradient(to right, #f87711, #d21e40)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>MPB</span>
          <span style={{
            fontSize: 18, fontWeight: 400,
            color: '#ca1b49',
          }}>x</span>
          <span style={{
            fontSize: 12, fontWeight: 400, marginLeft: 3,
            background: 'linear-gradient(to right, #eb212c, #5e238d)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Tracking</span>
        </div>

        {/* Nav items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

          {/* Search pill */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 26,
            background: '#eeefe9',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#e4e5df'}
            onMouseLeave={e => e.currentTarget.style.background = '#eeefe9'}
          >
            <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="#666" strokeWidth="1.5">
              <circle cx="5.5" cy="5.5" r="4.5" />
              <line x1="9" y1="9" x2="12" y2="12" strokeLinecap="round" />
            </svg>
          </div>

          {NAV_ITEMS.map(item => {
            const isActive = active === item.label
            const isHov = hovered === item.label
            return (
              <a
                key={item.label}
                href="#"
                onClick={e => { e.preventDefault(); setActive(item.label); navigate(item.path) }}
                onMouseEnter={() => setHovered(item.label)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none',
                  color: isActive ? '#111' : '#444',
                  borderRadius: 6,
                  background: isActive ? '#ffffff' : isHov ? '#e4e5df' : '#eeefe9',
                  boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'background 0.15s, box-shadow 0.15s',
                  letterSpacing: '-0.01em',
                }}
              >
                {item.label}
              </a>
            )
          })}

          {/* Sign out */}
          <button
            onClick={logout}
            style={{
              marginLeft: 8,
              padding: '5px 14px',
              fontSize: 12, fontWeight: 500,
              fontFamily: "'Urbanist', sans-serif",
              color: '#888',
              background: 'transparent',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 6,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#eeefe9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Sign out
          </button>
        </div>
      </nav>
    </div>
  )
}
