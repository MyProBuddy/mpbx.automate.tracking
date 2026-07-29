import NNav from '../components/NNav.jsx'

const STATS = [
  { label: 'Total Investors',    value: '0',   unit: '',  badge: null },
  { label: 'Emails Sent',        value: '0',   unit: '',  badge: null },
  { label: 'Replies Received',   value: '0',   unit: '',  badge: null },
  { label: 'Follow-ups Pending', value: '0',   unit: '',  badge: null },
]

function StatCard({ label, value, unit, badge }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 16,
      padding: '24px 28px 32px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: 160,
      border: '1px solid rgba(0,0,0,0.07)',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 14, fontWeight: 500,
          color: '#111', letterSpacing: '-0.01em',
          fontFamily: "'Urbanist', sans-serif",
        }}>
          {label}
        </span>
        {badge && (
          <span style={{
            fontSize: 12, fontWeight: 500,
            color: badge.startsWith('-') ? '#d21e40' : '#059669',
            background: badge.startsWith('-') ? 'rgba(210,30,64,0.08)' : 'rgba(5,150,105,0.08)',
            borderRadius: 6,
            padding: '3px 8px',
            letterSpacing: '-0.01em',
            fontFamily: "'Urbanist', sans-serif",
          }}>
            {badge}
          </span>
        )}
      </div>

      {/* Big number */}
      <div style={{ marginTop: 24 }}>
        <span style={{
          fontSize: 52, fontWeight: 300,
          color: '#0D0D14', letterSpacing: '-0.04em',
          fontFamily: "'Urbanist', sans-serif",
          lineHeight: 1,
        }}>
          {value}
        </span>
        {unit && (
          <span style={{
            fontSize: 28, fontWeight: 300,
            color: '#0D0D14', letterSpacing: '-0.02em',
            fontFamily: "'Urbanist', sans-serif",
          }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

export default function NOverview() {
  return (
    <div style={{
      fontFamily: "'Urbanist', sans-serif",
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff8f4 0%, #ffead0 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* centre glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700, height: 700, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(126,108,212,0.22) 0%, rgba(255,255,255,0) 70%)',
      }} />

      <NNav />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1100, margin: '0 auto',
        padding: '48px 52px',
      }}>
        {/* Stat cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}>
          {STATS.map(s => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </div>
    </div>
  )
}
