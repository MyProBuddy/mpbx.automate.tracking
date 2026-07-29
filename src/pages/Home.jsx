import NNav from '../components/NNav.jsx'

export default function Home() {
  return (
    <div style={{
      fontFamily: "'Urbanist', sans-serif",
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ffffff 0%, #ffe4c8 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* centre glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700, height: 700, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(126,108,212,0.35) 0%, rgba(255,255,255,0) 70%)',
      }} />

      <NNav />
    </div>
  )
}
