import { useState, useEffect } from 'react'
import Nav from '../components/Nav.jsx'

const FONT     = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FS       = { h: 32, sh: 18, c: 14, sc: 12 }
const INK      = '#1a1a1a'
const MUTED    = '#626260'
const NEU_BG   = '#F0F0F0'
const NEU_SURF = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHADOW = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const NEU_INSET  = 'inset 3px 3px 8px rgba(0,0,0,0.1), inset -3px -3px 8px rgba(255,255,255,0.8)'

const PLATFORMS = [
  {
    key: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    colorLight: '#FFF0F5',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>,
  },
  {
    key: 'threads',
    label: 'Threads',
    color: '#1a1a1a',
    colorLight: '#F5F5F5',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4"/><path d="M12 8v8"/></svg>,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    colorLight: '#F0FFF6',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  },
  {
    key: 'x',
    label: 'X',
    color: '#000000',
    colorLight: '#F5F5F5',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l16 16M20 4L4 20"/></svg>,
  },
  {
    key: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    colorLight: '#FFF5F5',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/></svg>,
  },
]

const METRICS = [
  { label: 'Total Posts',    key: 'posts',     color: '#7C3AED' },
  { label: 'Total Reach',    key: 'reach',     color: '#0891B2' },
  { label: 'Engagements',    key: 'engage',    color: '#D97706' },
  { label: 'Followers',      key: 'followers', color: '#059669' },
]

function PlatformCard({ p, active, onClick }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        background: active ? `linear-gradient(145deg, ${p.colorLight}, ${p.color}18)` : NEU_SURF,
        borderRadius: 16, padding: '20px 16px',
        border: active ? `1.5px solid ${p.color}40` : '1.5px solid transparent',
        boxShadow: pressed ? NEU_INSET : active ? `${NEU_SHADOW}, 0 0 0 1px ${p.color}20` : NEU_SHADOW,
        cursor: 'pointer', fontFamily: FONT,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        transition: 'all 0.15s ease',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        flex: 1,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: active ? p.color : `linear-gradient(145deg, ${p.colorLight}, ${p.color}22)`,
        boxShadow: '-3px -3px 8px rgba(255,255,255,0.9), 3px 3px 8px rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? '#fff' : p.color,
        transition: 'all 0.15s ease',
      }}>
        {p.icon}
      </div>
      <div style={{ fontSize: FS.c, fontWeight: 600, color: active ? p.color : INK }}>{p.label}</div>
    </button>
  )
}

function MetricCard({ label, color }) {
  return (
    <div style={{ background: NEU_SURF, borderRadius: 16, padding: '24px 20px', boxShadow: NEU_SHADOW }}>
      <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color, letterSpacing: '-0.5px', marginBottom: 4 }}>—</div>
      <div style={{ fontSize: FS.sc, color: MUTED }}>No data connected</div>
    </div>
  )
}

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 110, fontSize: FS.sc, color: MUTED, textAlign: 'right', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 32, background: 'rgba(0,0,0,0.06)', borderRadius: 8, overflow: 'hidden', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.08), inset -2px -2px 5px rgba(255,255,255,0.7)', position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 8, transition: 'width 0.6s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {pct > 10 && <span style={{ fontSize: FS.sc, fontWeight: 700, color: '#fff' }}>{value}</span>}
        </div>
        {pct <= 10 && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: FS.sc, fontWeight: 600, color: MUTED }}>{value}</span>}
      </div>
    </div>
  )
}

export default function SocialAnalytics() {
  const [active, setActive] = useState('instagram')
  const p = PLATFORMS.find(p => p.key === active)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Social Analytics" backTo="/hub" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: FS.sc, fontWeight: 500, color: p.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Social</div>
          <div style={{ fontSize: FS.h, fontWeight: 600, letterSpacing: '-0.3px', color: INK, marginBottom: 6 }}>Social Analytics</div>
          <div style={{ fontSize: FS.c, color: MUTED }}>Track engagement and performance across your social media platforms.</div>
        </div>

        {/* Platform selector */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 36 }}>
          {PLATFORMS.map(pl => (
            <PlatformCard key={pl.key} p={pl} active={active === pl.key} onClick={() => setActive(pl.key)} />
          ))}
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
          {METRICS.map(m => <MetricCard key={m.key} label={m.label} color={m.color} />)}
        </div>

        {/* Engagement breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: '28px 28px' }}>
            <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, marginBottom: 6 }}>Engagement Breakdown</div>
            <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 24 }}>Likes, comments, shares per post type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Likes', 'Comments', 'Shares', 'Saves', 'Clicks'].map((l, i) => (
                <BarRow key={l} label={l} value={0} max={1} color={p.color} />
              ))}
            </div>
          </div>

          <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: '28px 28px' }}>
            <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, marginBottom: 6 }}>Growth Trend</div>
            <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 24 }}>Follower growth over time</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: MUTED, fontSize: FS.c }}>
              Connect {p.label} to see growth data
            </div>
          </div>

          <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: '28px 28px' }}>
            <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, marginBottom: 6 }}>Top Posts</div>
            <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 24 }}>Best performing content this month</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: MUTED, fontSize: FS.c }}>
              No posts data yet
            </div>
          </div>

          <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: '28px 28px' }}>
            <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, marginBottom: 6 }}>Audience</div>
            <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 24 }}>Demographics and reach breakdown</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: MUTED, fontSize: FS.c }}>
              No audience data yet
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
