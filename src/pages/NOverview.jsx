import NNav from '../components/NNav.jsx'

export default function NOverview() {
  return (
    <div style={{
      fontFamily: "'Urbanist', sans-serif",
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff8f4 0%, #ffead0 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700, height: 700, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(126,108,212,0.22) 0%, rgba(255,255,255,0) 70%)',
      }} />
      <NNav />
    </div>
  )
}
