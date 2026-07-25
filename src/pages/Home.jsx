import { useAuth } from '../AuthContext.jsx'

export default function Home() {
  const { logout } = useAuth()

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
        display: 'flex', alignItems: 'center',
        padding: '20px 40px', width: '100%',
      }}>
        {/* Logo */}
        <div style={{ marginRight: 'auto', fontSize: 20, fontWeight: 600 }}>
          <span style={{
            background: 'linear-gradient(to right, #f87711, #d21e40)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', fontWeight: 600,
          }}>MPB</span>
          <span style={{ color: '#ca1b49', fontWeight: 400 }}>x</span>
          <span style={{
            fontSize: 14, fontWeight: 400,
            background: 'linear-gradient(to right, #eb212c, #5e238d)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Tracking</span>
        </div>

        {/* Nav items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Search */}
          <div style={{
            width: 27, height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f0f1ec', borderRadius: 4, cursor: 'pointer',
          }}>
            <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="#555" strokeWidth="1.5">
              <circle cx="5.5" cy="5.5" r="4.5" />
              <line x1="9" y1="9" x2="12" y2="12" strokeLinecap="round" />
            </svg>
          </div>

          {['Overview','Analytics','Alerts','Tools','Settings'].map((item, i) => (
            <a key={item} href="#" style={{
              padding: '4px 14px', fontSize: 10, textDecoration: 'none',
              color: '#000', borderRadius: 4,
              background: i === 0 ? '#ffffff' : '#f0f1ec',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.target.style.background = '#e8e9e4'}
            onMouseLeave={e => e.target.style.background = i === 0 ? '#ffffff' : '#f0f1ec'}
            >{item}</a>
          ))}
        </div>
      </nav>
    </div>
  )
}
