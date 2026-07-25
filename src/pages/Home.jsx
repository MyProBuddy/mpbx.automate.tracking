import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const NAV_ITEMS = [
  { label: 'Overview',  path: '/n/overview' },
  { label: 'Analytics', path: '/n/analytics' },
  { label: 'Alerts',    path: '/n/alerts' },
  { label: 'Tools',     path: '/n/tools' },
  { label: 'Settings',  path: '/n/settings' },
]

export default function Home() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState('Overview')

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
        width: 600, height: 600, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(126,108,212,0.2) 0%, rgba(255,255,255,0) 70%)',
      }} />

      <nav style={{
        display: 'flex',
        alignItems: 'center',
        padding: '20px 40px',
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
            fontSize: 24, fontWeight: 600,
            background: 'linear-gradient(to right, #f87711, #d21e40)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>MPB</span>
          <span style={{
            fontSize: 24, fontWeight: 400,
            color: '#ca1b49',
          }}>x</span>
          <span style={{
            fontSize: 15, fontWeight: 400, marginLeft: 4,
            background: 'linear-gradient(to right, #eb212c, #5e238d)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Tracking</span>
        </div>

        {/* Nav items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          {/* Search */}
          <div style={{
            width: 27, height: 19,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f0f1ec',
            borderRadius: 4,
            cursor: 'pointer',
          }}>
            <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="#555" strokeWidth="1.5">
              <circle cx="5.5" cy="5.5" r="4.5" />
              <line x1="9" y1="9" x2="12" y2="12" strokeLinecap="round" />
            </svg>
          </div>

          {NAV_ITEMS.map(item => {
            const isActive = active === item.label
            return (
              <a
                key={item.label}
                href="#"
                onClick={e => { e.preventDefault(); setActive(item.label); navigate(item.path) }}
                style={{
                  padding: '5px 16px',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  color: '#000',
                  borderRadius: 4,
                  background: isActive ? '#ffffff' : '#f0f1ec',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#e8e9e4' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#f0f1ec' }}
              >
                {item.label}
              </a>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
