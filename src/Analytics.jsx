import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { listClientSheets, getSheetTabs, getSheetValues, isConnected, initTokenClient, requestToken } from './google.js'
import { useAuth } from './AuthContext.jsx'

// ── color tokens ───────────────────────────────────────────────────────────────
const A     = '#5B4AE8'
const GREEN = '#16A34A'
const RED   = '#DC2626'
const AMBER = '#D97706'
const BLUE  = '#2563EB'
const INK   = '#111118'
const MUTED = '#6B7280'
const LINE  = '#E5E7EB'
const MONO  = "'JetBrains Mono', ui-monospace, monospace"
const FONT  = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

// ── data helpers ───────────────────────────────────────────────────────────────
const parseDate = value => {
  if (!value || String(value).trim().toUpperCase() === 'N/A') return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const parseList = value => String(value || '')
  .replace(/^\[/, '').replace(/\]$/, '').split(',')
  .map(item => parseDate(item.trim())).filter(Boolean)

const asBool = value => ['1', 'true', 'yes', 'pending', 'escalated'].includes(String(value || '').trim().toLowerCase())
const idx = (headers, name) => headers.findIndex(header => header.trim().toLowerCase() === name)
const dayStart = date => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const sameDay = (a, b) => a && b && dayStart(a).getTime() === dayStart(b).getTime()
const fmtDate = date => date?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) || '—'
const fmtTime = date => date?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) || '—'

// ── chart helpers ──────────────────────────────────────────────────────────────
const tooltip = {
  backgroundColor: '#111118',
  borderWidth: 0,
  padding: [10, 14],
  textStyle: { color: '#fff', fontSize: 11, fontFamily: FONT },
  extraCssText: 'border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.18)',
}

function buildArea(labels, sent, replies) {
  return {
    tooltip: { ...tooltip, trigger: 'axis' },
    legend: { right: 0, top: 0, itemWidth: 8, itemHeight: 8, textStyle: { color: MUTED, fontSize: 10, fontFamily: FONT } },
    grid: { left: 28, right: 10, top: 34, bottom: 24 },
    xAxis: { type: 'category', data: labels, boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: MUTED, fontSize: 9, fontFamily: FONT } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: LINE } } },
    series: [
      { name: 'Emails',  type: 'line', data: sent,    smooth: .35, symbol: 'none', lineStyle: { color: A,     width: 2.5 }, areaStyle: { color: `${A}1A` } },
      { name: 'Replies', type: 'line', data: replies, smooth: .35, symbol: 'none', lineStyle: { color: GREEN, width: 2.5 } },
    ],
  }
}

function buildFunnel(data) {
  return {
    tooltip: { ...tooltip, trigger: 'item' },
    series: [{
      type: 'funnel', left: '8%', right: '8%', top: 2, bottom: 2, gap: 6, minSize: '22%',
      label: { position: 'inside', color: '#fff', fontWeight: 700, fontSize: 11, fontFamily: FONT, formatter: '{b}  {c}' },
      itemStyle: { borderWidth: 0, borderRadius: 6 },
      data,
    }],
  }
}

function buildHeatmap(data, max) {
  return {
    tooltip: {
      ...tooltip,
      formatter: p => `${['Mon','Tue','Wed','Thu','Fri'][p.value[1]]}, ${['08','10','12','14','16','18'][p.value[0]]}:00<br><b>${p.value[2]} replies</b>`,
    },
    grid: { left: 38, right: 8, top: 4, bottom: 25 },
    xAxis: { type: 'category', data: ['08','10','12','14','16','18'], axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: MUTED, fontSize: 9 } },
    yAxis: { type: 'category', data: ['Mon','Tue','Wed','Thu','Fri'], axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: MUTED, fontSize: 9 } },
    visualMap: { show: false, min: 0, max: Math.max(1, max), inRange: { color: ['#EEF2FF', '#A5B4FC', A] } },
    series: [{ type: 'heatmap', data, itemStyle: { borderWidth: 4, borderColor: '#fff', borderRadius: 6 } }],
  }
}

// ── UI components ──────────────────────────────────────────────────────────────
function Card({ title, subtitle, action, children, dark }) {
  return (
    <section style={{
      background: dark ? 'linear-gradient(140deg,#1E1640,#2D2060)' : '#fff',
      border: `1px solid ${dark ? 'transparent' : LINE}`,
      borderRadius: 16,
      padding: '20px 22px',
      minWidth: 0,
      boxShadow: dark ? '0 4px 24px rgba(91,74,232,0.18)' : '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#fff' : INK, letterSpacing: '-.01em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,0.5)' : MUTED, marginTop: 3 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

function KPI({ label, value, hint, tone = INK, icon, delta, deltaLabel = 'vs last wk' }) {
  // delta: number = change, null = no comparison data, undefined = not applicable
  const hasData = delta !== null && delta !== undefined
  const up   = hasData && delta > 0.05
  const down = hasData && delta < -0.05
  const arrowColor = up ? GREEN : down ? RED : MUTED
  const arrowBg    = up ? `${GREEN}12` : down ? `${RED}12` : `${MUTED}10`
  const arrowIcon  = up ? '↑' : down ? '↓' : '→'

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${LINE}`,
      borderRadius: 14,
      padding: '16px 18px',
      borderTop: `3px solid ${tone}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED, fontFamily: FONT }}>
        <span>{label}</span>
        <span style={{ width: 24, height: 24, borderRadius: 7, background: `${tone}15`, color: tone, display: 'grid', placeItems: 'center', fontSize: 11 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, letterSpacing: '-.04em', color: tone, margin: '12px 0 6px', lineHeight: 1 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ fontSize: 10, color: MUTED }}>{hint}</div>
        {delta !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 700, fontFamily: MONO,
            color: arrowColor,
            background: arrowBg,
            padding: '2px 7px', borderRadius: 99,
            whiteSpace: 'nowrap',
          }}>
            {hasData ? (
              <>{arrowIcon} {Math.abs(delta).toFixed(1)}% <span style={{ fontFamily: FONT, fontWeight: 500, opacity: 0.7 }}>{deltaLabel}</span></>
            ) : (
              <span style={{ fontSize: 10, fontFamily: FONT, fontWeight: 600, color: MUTED }}>no comparison data</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Pill({ children, tone = MUTED }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700, color: tone, background: `${tone}15`, fontFamily: FONT }}>
      {children}
    </span>
  )
}

function ProgressRow({ label, value, total, tone }) {
  const pct = total ? Math.min(100, value / total * 100) : 0
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 12, color: INK }}>
        <span>{label}</span>
        <b style={{ fontFamily: MONO, fontWeight: 700 }}>{value}</b>
      </div>
      <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: tone, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ── AttentionQueue ─────────────────────────────────────────────────────────────
const ACTION_TAGS = [
  { id: 'resolved',    label: 'Resolved',     color: GREEN },
  { id: 'note',        label: 'Add note',     color: BLUE },
  { id: 'follow_up',   label: 'Follow up',    color: A },
  { id: 'not_interested', label: 'Not interested', color: MUTED },
]

function AttentionQueue({ rows }) {
  const [tags,  setTags]  = useState({})   // { [rowId]: tagId }
  const [notes, setNotes] = useState({})   // { [rowId]: string }
  const [open,  setOpen]  = useState(null) // rowId with open note input

  const setTag = (id, tagId) => setTags(prev => ({ ...prev, [id]: prev[id] === tagId ? null : tagId }))

  return (
    <section style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: '20px 22px', minWidth: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', gridColumn: 'span 1' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: rows.length ? AMBER : GREEN, boxShadow: rows.length ? `0 0 0 3px ${AMBER}30` : `0 0 0 3px ${GREEN}30` }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: INK, letterSpacing: '-.01em' }}>
              {rows.length ? 'Needs quick attention' : 'All clear'}
            </span>
          </div>
          <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>
            {rows.length
              ? `${rows.length} investor${rows.length > 1 ? 's' : ''} awaiting a human response`
              : 'No escalated conversations right now'}
          </div>
        </div>
        {rows.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700, color: AMBER, background: `${AMBER}15` }}>
            {rows.length} open
          </span>
        )}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', background: '#F0FDF4', borderRadius: 10, border: `1px solid ${GREEN}25` }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>✓</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: GREEN }}>No conversations escalated</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>AI is handling all active threads</div>
          </div>
        )}

        {rows.map(row => {
          const activeTag = tags[row.id]
          const noteOpen  = open === row.id
          const isResolved = activeTag === 'resolved'

          return (
            <div key={row.id} style={{
              border: `1px solid ${isResolved ? GREEN + '40' : LINE}`,
              borderRadius: 10,
              padding: '10px 12px',
              background: isResolved ? '#F0FDF4' : '#FAFAFA',
              opacity: isResolved ? 0.7 : 1,
              transition: 'all 0.2s',
            }}>
              {/* Investor row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${AMBER}18`, color: AMBER, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                  {(row.first || row.id || '?').slice(0, 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[row.first, row.last].filter(Boolean).join(' ') || row.id}
                  </div>
                  <div style={{ fontSize: 10, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.company}
                  </div>
                </div>
                {activeTag && activeTag !== 'note' && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 99, color: ACTION_TAGS.find(t => t.id === activeTag)?.color, background: `${ACTION_TAGS.find(t => t.id === activeTag)?.color}18`, whiteSpace: 'nowrap' }}>
                    {ACTION_TAGS.find(t => t.id === activeTag)?.label}
                  </span>
                )}
              </div>

              {/* Reason — from conversation_log, not tracking summary */}
              {(row.convSummary || row.summary) && (
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 8, padding: '6px 8px', background: `${AMBER}0C`, borderRadius: 6, borderLeft: `2px solid ${AMBER}60` }}>
                  {row.convSummary || row.summary}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {ACTION_TAGS.map(tag => (
                  <button key={tag.id} onClick={() => {
                    if (tag.id === 'note') { setOpen(noteOpen ? null : row.id); return }
                    setTag(row.id, tag.id)
                  }} style={{
                    padding: '4px 9px', borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
                    border: `1px solid ${activeTag === tag.id ? tag.color : LINE}`,
                    background: activeTag === tag.id ? `${tag.color}15` : '#fff',
                    color: activeTag === tag.id ? tag.color : MUTED,
                    transition: 'all 0.15s',
                  }}>
                    {tag.label}
                  </button>
                ))}
              </div>

              {/* Note input */}
              {noteOpen && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <input
                    autoFocus
                    value={notes[row.id] || ''}
                    onChange={e => setNotes(prev => ({ ...prev, [row.id]: e.target.value }))}
                    placeholder="Type a note…"
                    style={{ flex: 1, height: 30, padding: '0 8px', border: `1px solid ${BLUE}60`, borderRadius: 7, fontSize: 11, fontFamily: FONT, outline: 'none', color: INK, background: '#fff' }}
                  />
                  <button onClick={() => setOpen(null)} style={{ height: 30, padding: '0 10px', border: `1px solid ${BLUE}`, borderRadius: 7, background: BLUE, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>
                    Save
                  </button>
                </div>
              )}

              {/* Saved note display */}
              {notes[row.id] && !noteOpen && (
                <div onClick={() => setOpen(row.id)} style={{ marginTop: 6, fontSize: 10, color: BLUE, padding: '5px 8px', background: `${BLUE}0C`, borderRadius: 6, cursor: 'pointer', border: `1px solid ${BLUE}20` }}>
                  📝 {notes[row.id]}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── RecentConversations ────────────────────────────────────────────────────────
function RecentConversations({ convByInvestor, investorMap, query, setQuery }) {
  const bubbleBg = dir => {
    const d = String(dir || '').toLowerCase()
    if (d === 'inbound' || d === 'investor') return { bg: '#F0FDF4', dot: GREEN, label: 'Investor' }
    if (d === 'outbound' || d === 'ai' || d === 'us') return { bg: '#EEF2FF', dot: A, label: 'AI' }
    return { bg: '#F9FAFB', dot: MUTED, label: 'System' }
  }

  // Build one entry per unique investor id that has at least one log entry
  const allInvestors = convByInvestor ? [...convByInvestor.entries()] : []

  const filtered = allInvestors.filter(([id, thread]) => {
    if (!thread.length) return false
    if (!query) return true
    const q = query.toLowerCase()
    const inv = investorMap?.get(id) || {}
    return [id, inv.first, inv.last, inv.company, inv.email].some(v => String(v || '').toLowerCase().includes(q))
  })

  // Sort by most recent message first
  filtered.sort((a, b) => {
    const aLast = a[1][a[1].length - 1]?.at || 0
    const bLast = b[1][b[1].length - 1]?.at || 0
    return bLast - aLast
  })

  return (
    <section style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: '20px 22px', minWidth: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>Recent conversations</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: `${A}12`, color: A }}>{filtered.length}</span>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search investor…"
          style={{ height: 28, padding: '0 10px', border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 11, fontFamily: FONT, color: INK, outline: 'none', width: 160 }}
        />
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', background: '#F9FAFB', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: MUTED }}>{allInvestors.length === 0 ? 'No conversation log data yet' : 'No results match your search'}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(([id, thread]) => {
          const inv = investorMap?.get(id) || {}
          const latest = thread[thread.length - 1]
          const { bg, dot, label } = bubbleBg(latest.direction)

          return (
            <div key={id} style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden' }}>
              {/* Investor header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', background: '#FAFAFA', borderBottom: `1px solid ${LINE}` }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${A}15`, color: A, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                  {(inv.first || id || '?').slice(0, 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[inv.first, inv.last].filter(Boolean).join(' ') || id}
                    {inv.company ? <span style={{ fontWeight: 400, color: MUTED }}> · {inv.company}</span> : null}
                  </div>
                  <div style={{ fontSize: 10, color: MUTED }}>{inv.email || id}</div>
                </div>
                <span style={{ fontSize: 9, color: MUTED, fontFamily: MONO, flexShrink: 0 }}>{fmtDate(latest.at)}</span>
              </div>

              {/* Latest message bubble only */}
              <div style={{ padding: '10px 13px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, background: bg, borderRadius: 8, padding: '7px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: dot, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
                      <span style={{ fontSize: 9, color: MUTED, fontFamily: MONO }}>{fmtTime(latest.at)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: INK, lineHeight: 1.5 }}>
                      {latest.summary || <span style={{ color: MUTED, fontStyle: 'italic' }}>No summary</span>}
                    </div>
                  </div>
                </div>
                {thread.length > 1 && (
                  <div style={{ marginTop: 6, fontSize: 10, color: MUTED }}>+{thread.length - 1} earlier message{thread.length > 2 ? 's' : ''}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── main ───────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { role, logout } = useAuth()
  const navigate = useNavigate()
  const [sheets,          setSheets]          = useState([])
  const [sheetId,         setSheetId]         = useState('')
  const [book,            setBook]            = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const { googleConnected: connected, googleSyncing, setConnected } = useAuth()
  const [googleReady,     setGoogleReady]     = useState(false)
  const [period,          setPeriod]          = useState('all')
  const [query,           setQuery]           = useState('')
  const [overview,        setOverview]        = useState([])
  const [overviewLoading, setOverviewLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      if (window.google) {
        initTokenClient(() => setConnected(true))
        setGoogleReady(true)
        clearInterval(timer)
      }
    }, 200)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (connected) listClientSheets().then(setSheets).catch(() => {})
  }, [connected])

  useEffect(() => {
    if (!connected || sheets.length === 0) return
    setOverviewLoading(true)
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000)

    Promise.all(sheets.map(async sheet => {
      try {
        const tabs = await getSheetTabs(sheet.id)
        const trackTab = tabs.find(t => /^tracking$/i.test(t.title))
        if (!trackTab) return { id: sheet.id, name: sheet.name, error: 'No Tracking tab' }
        const values = await getSheetValues(sheet.id, `${trackTab.title}!A1:AF5000`)
        if (!values.length) return { id: sheet.id, name: sheet.name, total: 0, initialSent: 0, thisWeek: 0, f1: 0, f2: 0, f3: 0, replies: 0 }

        const headers  = values[0].map(v => String(v).trim().toLowerCase())
        const rows     = values.slice(1).filter(r => r.some(Boolean))

        // fuzzy column lookup — tolerate underscores vs spaces, case differences
        const fIdx = pattern => headers.findIndex(h => pattern.test(h))
        const countI   = fIdx(/follow.?up.?count/i)
        const sentAtI  = fIdx(/follow.?up.?timestamps?/i)
        const replyAtI = fIdx(/reply.?timestamps?/i)

        let initialSent = 0, thisWeek = 0, f1 = 0, f2 = 0, f3 = 0, replies = 0
        rows.forEach(row => {
          const count     = Math.max(0, Number(row[countI]) || 0)
          const sentDates = parseList(row[sentAtI])
          const replyVal = String(row[replyAtI] ?? '').trim()
          const hasReply = replyVal !== '' && replyVal.toUpperCase() !== 'N/A' && replyVal.toUpperCase() !== 'FALSE'

          const stage = countI >= 0 ? count : sentDates.length
          if (stage >= 1) initialSent++
          if (stage === 2) f1++
          if (stage === 3) f2++
          if (stage >= 4) f3++
          if (hasReply) replies++
          if (sentDates.some(d => d >= oneWeekAgo)) thisWeek++
        })
        return { id: sheet.id, name: sheet.name, total: rows.length, initialSent, thisWeek, f1, f2, f3, replies }
      } catch {
        return { id: sheet.id, name: sheet.name, error: 'Failed to load' }
      }
    })).then(results => {
      setOverview(results)
      setOverviewLoading(false)
    }).catch(() => setOverviewLoading(false))
  }, [sheets, connected])

  const loadSheet = async id => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const tabs = await getSheetTabs(id)
      const read = async (pattern, fallback = []) => {
        const tab = tabs.find(item => pattern.test(item.title))
        return tab ? getSheetValues(id, `${tab.title}!A1:AF5000`) : fallback
      }
      const [tracking, investors, conversations, threads, config] = await Promise.all([
        read(/^tracking$/i), read(/^investors$/i), read(/^conversation_log$/i), read(/^thread_tracking$/i), read(/^config$/i),
      ])
      setBook({ tracking, investors, conversations, threads, config, name: sheets.find(s => s.id === id)?.name || 'Selected sheet' })
    } catch (caught) {
      setError(caught.message || 'Could not read this sheet.')
    } finally {
      setLoading(false)
    }
  }

  const dashboard = useMemo(() => {
    if (!book?.tracking?.length) return null
    const trackingHeaders = book.tracking[0].map(v => String(v).trim().toLowerCase())
    const trackingRows    = book.tracking.slice(1).filter(row => row.some(Boolean))
    const fIdx = pat => trackingHeaders.findIndex(h => pat.test(h))
    const invIdI     = fIdx(/inv.?id|investor.?id/i)
    const countI     = fIdx(/follow.?up.?count/i)
    const sentAtI    = fIdx(/follow.?up.?timestamps?/i)
    const replyAtI   = fIdx(/reply.?timestamps?/i)
    const ourReplyI  = fIdx(/our.?reply.?sent/i)
    const summaryI   = fIdx(/conversation.?summary/i)
    const stopOutI   = fIdx(/not.?interested.?outreach/i)
    const stopReplyI = fIdx(/not.?interested.?reply/i)
    const escalationI   = fIdx(/^escalation$/i)
    const adminNotifI   = fIdx(/admin.?noti/i)

    const investorHeaders = (book.investors[0] || []).map(v => String(v).trim().toLowerCase())
    const investorMap = new Map()
    book.investors.slice(1).forEach(row => {
      const id = row[idx(investorHeaders, 'investor_id')]
      if (id) investorMap.set(String(id).toUpperCase(), {
        first:   row[idx(investorHeaders, 'first name')] || '',
        last:    row[idx(investorHeaders, 'last name')] || '',
        company: row[idx(investorHeaders, 'company')] || 'Unknown company',
        email:   row[idx(investorHeaders, 'email')] || '',
        stage:   row[idx(investorHeaders, 'fund stage')] || '',
        country: row[idx(investorHeaders, 'company country')] || '',
      })
    })

    const now   = new Date()
    const since = period === 'today' ? dayStart(now) : period === 'week' ? new Date(now.getTime() - 7 * 86400000) : null

    const rows = trackingRows.map(row => {
      const id           = String(row[invIdI] || '').toUpperCase()
      const sentDates    = parseList(row[sentAtI])
      const replyDate    = parseDate(row[replyAtI])
      const replyRaw     = String(row[replyAtI] ?? '').trim()
      const hasReply     = replyRaw !== '' && replyRaw.toUpperCase() !== 'N/A' && replyRaw.toUpperCase() !== 'FALSE'
      const ourReplyDates= parseList(row[ourReplyI])
      const count        = Math.max(0, Number(row[countI]) || 0)
      const stopped      = asBool(row[stopOutI]) || asBool(row[stopReplyI])
      // escalation: check the escalation field OR admin notification column
      // field may contain 'escalated'/'true'/'yes'/'pending' or 'active' (workflow running)
      const escVal    = String(row[escalationI] || '').trim().toLowerCase()
      const adminVal  = String(row[adminNotifI] || '').trim().toLowerCase()
      const escalated = asBool(escVal) || asBool(adminVal) || escVal === 'escalated'
      const lastSent     = sentDates.at(-1) || null
      const delays       = [0, 2, 3, 5]
      const dueDate      = count > 0 && count < 4 && lastSent ? new Date(lastSent.getTime() + delays[count] * 86400000) : null
      const dueState     = !replyDate && !stopped && dueDate
        ? dueDate < dayStart(now) ? 'overdue'
          : sameDay(dueDate, now) ? 'today'
          : sameDay(dueDate, new Date(now.getTime() + 86400000)) ? 'tomorrow'
          : 'later'
        : null
      return { id, ...investorMap.get(id), row, count, sentDates, replyDate, hasReply, ourReplyDates, stopped, escalated, lastSent, dueDate, dueState, summary: row[summaryI] || '' }
    })

    const filtered      = rows.filter(row => !since || [...row.sentDates, row.replyDate, ...row.ourReplyDates].filter(Boolean).some(d => d >= since))
    const contactedRows = rows.filter(r => r.count > 0)
    const repliedRows   = rows.filter(r => r.replyDate)
    const activeRows    = rows.filter(r => r.ourReplyDates.length && !r.stopped)
    const escalatedRows = rows.filter(r => r.escalated)
    const stoppedRows   = rows.filter(r => r.stopped)
    const emails        = filtered.reduce((sum, row) => sum + row.sentDates.filter(d => !since || d >= since).length, 0)
    const replies       = filtered.filter(r => r.replyDate && (!since || r.replyDate >= since)).length
    const todayEmails   = rows.reduce((sum, row) => sum + row.sentDates.filter(d => sameDay(d, now)).length, 0)
    const weekEmails    = rows.reduce((sum, row) => sum + row.sentDates.filter(d => d >= new Date(now.getTime() - 7 * 86400000)).length, 0)
    const responseRate  = contactedRows.length ? repliedRows.length / contactedRows.length * 100 : 0

    // Response rate trend: this week vs previous week, falling back to this week vs all-time
    const oneWeekAgo  = new Date(now.getTime() - 7  * 86400000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000)
    const thisWeekContacted = rows.filter(r => r.sentDates.some(d => d >= oneWeekAgo)).length
    const thisWeekReplied   = rows.filter(r => r.replyDate && r.replyDate >= oneWeekAgo).length
    const prevWeekContacted = rows.filter(r => r.sentDates.some(d => d >= twoWeeksAgo && d < oneWeekAgo)).length
    const prevWeekReplied   = rows.filter(r => r.replyDate && r.replyDate >= twoWeeksAgo && r.replyDate < oneWeekAgo).length
    const thisWeekRate = thisWeekContacted >= 1 ? thisWeekReplied / thisWeekContacted * 100 : null
    const prevWeekRate = prevWeekContacted >= 1 ? prevWeekReplied / prevWeekContacted * 100 : null
    // If week-over-week isn't possible, compare this week vs all-time baseline
    const responseRateDelta = (thisWeekRate !== null && prevWeekRate !== null)
      ? thisWeekRate - prevWeekRate
      : (thisWeekRate !== null && contactedRows.length > thisWeekContacted)
        ? thisWeekRate - responseRate
        : null
    const responseRateDeltaLabel = (thisWeekRate !== null && prevWeekRate !== null)
      ? 'vs last wk'
      : 'vs all time'

    const daily = new Map()
    for (let n = 13; n >= 0; n--) {
      const d = new Date(now.getTime() - n * 86400000)
      daily.set(dayStart(d).getTime(), { label: fmtDate(d), sent: 0, replies: 0 })
    }
    rows.forEach(row => {
      row.sentDates.forEach(d => { const bucket = daily.get(dayStart(d).getTime()); if (bucket) bucket.sent++ })
      if (row.replyDate) { const bucket = daily.get(dayStart(row.replyDate).getTime()); if (bucket) bucket.replies++ }
    })
    const trend = [...daily.values()]

    const heat = Array.from({ length: 5 }, () => Array(6).fill(0))
    repliedRows.forEach(row => {
      const day = (row.replyDate.getDay() + 6) % 7
      if (day < 5) heat[day][Math.max(0, Math.min(5, Math.floor((row.replyDate.getHours() - 8) / 2)))]++
    })
    const heatData = heat.flatMap((items, y) => items.map((value, x) => [x, y, value]))

    const touchpoints = [0, 0, 0, 0]
    rows.forEach(row => { if (row.count >= 1) touchpoints[Math.min(3, row.count - 1)]++ })

    const followups = {
      today:    rows.filter(r => r.dueState === 'today').length,
      tomorrow: rows.filter(r => r.dueState === 'tomorrow').length,
      overdue:  rows.filter(r => r.dueState === 'overdue').length,
    }

    const threadHeaders     = (book.threads[0] || []).map(v => String(v).trim().toLowerCase())
    const threadRows        = book.threads.slice(1).filter(row => row.some(Boolean))
    const threadIdsI        = idx(threadHeaders, 'thread_ids')
    const openThreads       = threadRows.filter(row => row[threadIdsI]).length
    const duplicateThreads  = threadRows.filter(row => String(row[threadIdsI] || '').split(',').filter(Boolean).length > 1).length

    // ── conversation_log parsing ─────────────────────────────────────────────
    const convHeaders   = (book.conversations[0] || []).map(v => String(v).trim().toLowerCase())
    const convRows      = book.conversations.slice(1).filter(r => r.some(Boolean))
    const convIdI       = idx(convHeaders, 'inv_id')
    const convDirI      = idx(convHeaders, 'direction')
    const convTsI       = idx(convHeaders, 'timestamp')
    const convSummaryI  = idx(convHeaders, 'summary')

    // map: investor id → sorted conversation entries (newest first)
    const convByInvestor = new Map()
    convRows.forEach(row => {
      const id = String(row[convIdI] || '').toUpperCase()
      if (!convByInvestor.has(id)) convByInvestor.set(id, [])
      convByInvestor.get(id).push({
        at:        parseDate(row[convTsI]),
        summary:   row[convSummaryI] || '',
        direction: row[convDirI] || '',
      })
    })
    convByInvestor.forEach(entries => entries.sort((a, b) => (a.at || 0) - (b.at || 0)))

    // doc request rate — entries mentioning one-pager / document / deck
    const docKeywords = /one.?pager|one pager|document|deck|presentation|financial|projection/i
    const docRequestedCount = [...convByInvestor.entries()]
      .filter(([, entries]) => entries.some(e => docKeywords.test(e.summary))).length
    const docRequestRate = repliedRows.length ? Math.round(docRequestedCount / repliedRows.length * 100) : 0

    // average time-to-reply in minutes
    const replyTimes = rows
      .filter(r => r.replyDate && r.sentDates.length)
      .map(r => (r.replyDate - r.sentDates[0]) / 60000)
    const avgReplyMinutes = replyTimes.length
      ? Math.round(replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length)
      : null

    // weekly send pacing from config tab
    const configHeaders   = (book.config[0] || []).map(v => String(v).trim().toLowerCase())
    const configRow       = book.config[1] || []
    const weeklySentCount = Number(configRow[idx(configHeaders, 'weekly_sent_count')] || 0)
    const WEEKLY_CAP      = 50 // assumed max; adjust if stored in config

    // duplicate log warnings — same investor, 2+ entries within 60 min
    const duplicateLogInvestors = []
    convByInvestor.forEach((entries, id) => {
      const sorted = entries.filter(e => e.at).sort((a, b) => a.at - b.at)
      for (let i = 1; i < sorted.length; i++) {
        if ((sorted[i].at - sorted[i - 1].at) / 60000 < 60) {
          duplicateLogInvestors.push(id)
          break
        }
      }
    })

    // enrich escalated rows with conversation_log summaries
    const escalatedRowsEnriched = escalatedRows.map(r => ({
      ...r,
      convSummary: convByInvestor.get(r.id)?.[0]?.summary || r.summary || '',
    }))

    const events = []
    rows.forEach(row => {
      row.sentDates.forEach((at, n) => events.push({ at, type: n ? `Follow-up ${n} sent` : 'Initial email sent', who: `${row.first || row.id} · ${row.company}`, tone: A }))
      if (row.replyDate) events.push({ at: row.replyDate, type: 'Investor replied', who: `${row.first || row.id} · ${row.company}`, tone: GREEN })
      row.ourReplyDates.forEach(at => events.push({ at, type: 'Reply sent', who: `${row.first || row.id} · ${row.company}`, tone: BLUE }))
    })
    events.sort((a, b) => b.at - a.at)

    return {
      rows, total: rows.length, contacted: contactedRows.length, replies: repliedRows.length, active: activeRows.length,
      escalations: escalatedRowsEnriched.length, stopped: stoppedRows.length, emails, todayEmails, weekEmails,
      responseRate, responseRateDelta, responseRateDeltaLabel,
      escalatedRows: escalatedRowsEnriched,
      followups, trend, heatData, heatMax: Math.max(0, ...heatData.map(x => x[2])), touchpoints,
      openThreads, duplicateThreads, events: events.slice(0, 8),
      // new intelligence fields
      docRequestedCount, docRequestRate, avgReplyMinutes,
      weeklySentCount, weeklyCapPct: Math.min(100, Math.round(weeklySentCount / WEEKLY_CAP * 100)),
      duplicateLogInvestors, convByInvestor, investorMap,
    }
  }, [book, period])

  const queue = useMemo(() => {
    if (!dashboard) return []
    const needle = query.trim().toLowerCase()
    return dashboard.escalatedRows.filter(row => !needle || [row.first, row.last, row.company, row.email, row.id].some(v => String(v || '').toLowerCase().includes(needle)))
  }, [dashboard, query])

  // ── shared styles ────────────────────────────────────────────────────────────
  const shell   = { minHeight: '100vh', color: INK, fontFamily: FONT }
  const nav     = { height: 60, padding: '0 32px', background: 'rgba(232,230,237,0.52)', backdropFilter: 'blur(36px) saturate(150%)', WebkitBackdropFilter: 'blur(36px) saturate(150%)', borderBottom: '1px solid rgba(180,174,200,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)' }
  const grid12  = (cols) => ({ display: 'grid', gridTemplateColumns: cols, gap: 16, marginBottom: 16 })
  const kpiGrid = { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 16 }
  const selectS = { height: 36, border: `1px solid ${LINE}`, borderRadius: 9, background: '#fff', padding: '0 12px', color: INK, fontFamily: FONT, fontSize: 13, outline: 'none', minWidth: 220 }

  return (
    <div style={shell}>
      {/* Nav */}
      <header style={nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/hub')} style={{ border: 0, background: 'transparent', color: MUTED, cursor: 'pointer', fontFamily: FONT, fontSize: 13 }}>← Back</button>
          <div style={{ width: 1, height: 20, background: LINE }} />
          <div style={{ width: 30, height: 30, borderRadius: 9, background: INK, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13 }}>O</div>
          <b style={{ fontSize: 14, letterSpacing: '-.01em' }}>Outreach Command Center</b>
        </div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          {!googleSyncing && !connected && role === 'superadmin' && (
            <button disabled={!googleReady} onClick={() => { initTokenClient(() => setConnected(true)); requestToken() }}
              style={{ height: 36, border: 0, borderRadius: 9, padding: '0 16px', background: INK, color: '#fff', cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 13 }}>
              Connect Google
            </button>
          )}
          {!googleSyncing && !connected && role !== 'superadmin' && (
            <span style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', borderRadius: 6, padding: '4px 10px', fontWeight: 600 }}>Google not connected — contact Super Admin</span>
          )}
          <select style={selectS} value={sheetId} onChange={e => { setSheetId(e.target.value); loadSheet(e.target.value) }}>
            <option value="">Overview</option>
            {sheets.map(sheet => <option key={sheet.id} value={sheet.id}>{sheet.name}</option>)}
          </select>
          <button onClick={logout} style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: '0 14px', height: 36, background: 'transparent', color: MUTED, cursor: 'pointer', fontFamily: FONT, fontSize: 12 }}>Sign out</button>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '36px 34px 80px' }}>
        {error && (
          <div style={{ padding: '12px 16px', background: '#FEF2F2', color: RED, border: `1px solid ${RED}30`, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>
        )}

        {loading && (
          <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', color: MUTED }}>
            <div style={{ fontSize: 14 }}>Reading tracking, investors, conversations and threads…</div>
          </div>
        )}

        {!loading && !dashboard && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: A, marginBottom: 8 }}>ALL CLIENTS — OUTREACH OVERVIEW</div>
              <h2 style={{ fontSize: 28, letterSpacing: '-.03em', margin: '0 0 4px', color: INK }}>Outreach at a glance.</h2>
              <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Select a client above to drill into the full command center.</p>
            </div>

            {overviewLoading && (
              <div style={{ padding: '48px 0', textAlign: 'center', color: MUTED, fontSize: 13 }}>Loading all client sheets…</div>
            )}

            {!overviewLoading && overview.length > 0 && (() => {
              const totals = overview.reduce((acc, r) => ({
                total:       acc.total       + (r.total       || 0),
                initialSent: acc.initialSent + (r.initialSent || 0),
                thisWeek:    acc.thisWeek    + (r.thisWeek    || 0),
                f1:          acc.f1          + (r.f1          || 0),
                f2:          acc.f2          + (r.f2          || 0),
                f3:          acc.f3          + (r.f3          || 0),
                replies:     acc.replies     + (r.replies     || 0),
              }), { total: 0, initialSent: 0, thisWeek: 0, f1: 0, f2: 0, f3: 0, replies: 0 })

              const thS = { padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: MUTED, borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap', textTransform: 'uppercase', background: '#FAFAFA' }
              const tdS = { padding: '16px 20px', fontSize: 13, color: INK, borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap' }
              const numS = { ...tdS, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontFamily: MONO, fontSize: 13 }
              const totS = { ...numS, fontWeight: 700, color: INK, background: '#F4F4F8', borderTop: `2px solid ${LINE}`, borderBottom: 'none' }
              const totLabelS = { ...tdS, fontWeight: 700, color: INK, background: '#F4F4F8', borderTop: `2px solid ${LINE}`, borderBottom: 'none' }

              const pill = (n, color) => (
                <span style={{ display: 'inline-block', minWidth: 36, textAlign: 'center', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: MONO, background: color + '18', color }}>{n}</span>
              )

              return (
                <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${LINE}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#FAFAFA' }}>
                        <th style={thS}>Client</th>
                        <th style={{ ...thS, textAlign: 'right' }}>Total</th>
                        <th style={{ ...thS, textAlign: 'right' }}>Initial Sent</th>
                        <th style={{ ...thS, textAlign: 'right' }}>This Week</th>
                        <th style={{ ...thS, textAlign: 'right' }}>Followup 1</th>
                        <th style={{ ...thS, textAlign: 'right' }}>Followup 2</th>
                        <th style={{ ...thS, textAlign: 'right' }}>Followup 3</th>
                        <th style={{ ...thS, textAlign: 'right' }}>Replies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.map((r, i) => (
                        <tr key={r.id} style={{ cursor: 'pointer', transition: 'background .12s' }}
                          onClick={() => { setSheetId(r.id); loadSheet(r.id) }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F5F5FF'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <td style={tdS}>
                            <div style={{ fontWeight: 600, color: A }}>{r.name}</div>
                            {r.error && <div style={{ fontSize: 11, color: RED, marginTop: 2 }}>{r.error}</div>}
                          </td>
                          <td style={numS}>{r.error ? '—' : r.total}</td>
                          <td style={numS}>{r.error ? '—' : pill(r.initialSent, '#5B4AE8')}</td>
                          <td style={numS}>{r.error ? '—' : pill(r.thisWeek, BLUE)}</td>
                          <td style={numS}>{r.error ? '—' : pill(r.f1, AMBER)}</td>
                          <td style={numS}>{r.error ? '—' : pill(r.f2, AMBER)}</td>
                          <td style={numS}>{r.error ? '—' : pill(r.f3, AMBER)}</td>
                          <td style={numS}>{r.error ? '—' : pill(r.replies, GREEN)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={totLabelS}>Totals across {overview.filter(r => !r.error).length} client{overview.filter(r => !r.error).length !== 1 ? 's' : ''}</td>
                        <td style={totS}>{totals.total}</td>
                        <td style={totS}>{totals.initialSent}</td>
                        <td style={totS}>{totals.thisWeek}</td>
                        <td style={totS}>{totals.f1}</td>
                        <td style={totS}>{totals.f2}</td>
                        <td style={totS}>{totals.f3}</td>
                        <td style={totS}>{totals.replies}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            })()}

            {!overviewLoading && !connected && (
              <div style={{ padding: '64px 0', textAlign: 'center', color: MUTED, fontSize: 13 }}>Connect Google to load the overview.</div>
            )}

          </div>
        )}

        {!loading && dashboard && (
          <>
            {/* Page title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: A, marginBottom: 6 }}>LIVE OPERATIONS</div>
                <h1 style={{ fontSize: 32, letterSpacing: '-.045em', margin: '0 0 4px', color: INK }}>Today's outreach at a glance.</h1>
                <div style={{ fontSize: 12, color: MUTED }}>{book.name} · verified against the workflow schema</div>
              </div>
              {/* Period tabs */}
              <div style={{ display: 'flex', gap: 4, background: '#EDEDF1', padding: 4, borderRadius: 11 }}>
                {[['today','Today'],['week','7 days'],['all','All time']].map(([id, label]) => (
                  <button key={id} onClick={() => setPeriod(id)} style={{
                    border: 0, padding: '7px 14px', borderRadius: 8,
                    background: period === id ? '#fff' : 'transparent',
                    color: period === id ? INK : MUTED,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
                    boxShadow: period === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* KPI row */}
            <div style={kpiGrid}>
              <KPI label="Contacts today" value={dashboard.todayEmails} hint="emails sent today"      tone={A}     icon="↗" />
              <KPI label="This week"      value={dashboard.weekEmails}  hint="emails in last 7 days"  tone={BLUE}  icon="▥" />
              <KPI label="Replies"        value={dashboard.replies}     hint="all recorded replies"   tone={GREEN} icon="↩" />
              <KPI
                label="Response rate"
                value={`${dashboard.responseRate.toFixed(1)}%`}
                hint="replies ÷ contacted"
                tone={GREEN}
                icon="%"
                delta={dashboard.responseRateDelta}
                deltaLabel={dashboard.responseRateDeltaLabel}
              />
              <KPI label="Conversations"  value={dashboard.active}      hint="our reply recorded"     tone={BLUE}  icon="◌" />
              <KPI label="Escalations"    value={dashboard.escalations} hint="waiting for human action" tone={dashboard.escalations ? AMBER : MUTED} icon="!" />
            </div>

            {/* ── Workflow warning banner ── */}
            {dashboard.duplicateLogInvestors.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 16px', marginBottom: 16,
                background: `${AMBER}0F`, border: `1px solid ${AMBER}40`, borderRadius: 10,
              }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: AMBER }}>Possible workflow loop detected — </span>
                  <span style={{ fontSize: 12, color: MUTED }}>
                    {dashboard.duplicateLogInvestors.join(', ')} {dashboard.duplicateLogInvestors.length === 1 ? 'has' : 'have'} multiple conversation_log entries within 60 minutes. The n8n workflow may be re-triggering on the same email thread.
                  </span>
                </div>
              </div>
            )}

            {/* ── Campaign intelligence strip ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>

              {/* Doc request rate */}
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', borderTop: `3px solid ${BLUE}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED }}>Doc requested</div>
                  <span style={{ fontSize: 11, background: `${BLUE}15`, color: BLUE, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>📄</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: BLUE, lineHeight: 1, marginBottom: 6 }}>
                  {dashboard.docRequestRate}%
                </div>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 8 }}>
                  {dashboard.docRequestedCount} of {dashboard.replies} investors asked for a one-pager
                </div>
                <div style={{ height: 4, background: '#F3F4F6', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${dashboard.docRequestRate}%`, background: BLUE, borderRadius: 99, transition: 'width 0.6s' }} />
                </div>
              </div>

              {/* Avg reply speed */}
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', borderTop: `3px solid ${GREEN}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED }}>Avg reply speed</div>
                  <span style={{ fontSize: 11, background: `${GREEN}15`, color: GREEN, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>⚡</span>
                </div>
                {dashboard.avgReplyMinutes !== null ? (
                  <>
                    <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: GREEN, lineHeight: 1, marginBottom: 4 }}>
                      {dashboard.avgReplyMinutes < 60
                        ? `${dashboard.avgReplyMinutes}m`
                        : `${Math.round(dashboard.avgReplyMinutes / 60 * 10) / 10}h`}
                    </div>
                    <div style={{ fontSize: 10, color: MUTED }}>avg time from first email to reply</div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>No replies yet</div>
                )}
              </div>

              {/* Weekly send pacing */}
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', borderTop: `3px solid ${A}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED }}>Weekly pacing</div>
                  <span style={{ fontSize: 11, background: `${A}15`, color: A, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>📅</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: A, lineHeight: 1 }}>
                    {dashboard.weeklySentCount}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED }}>/ 50 this week</div>
                </div>
                <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, marginBottom: 6 }}>
                  <div style={{
                    height: '100%', width: `${dashboard.weeklyCapPct}%`,
                    background: dashboard.weeklyCapPct > 80 ? AMBER : A,
                    borderRadius: 99, transition: 'width 0.6s',
                  }} />
                </div>
                <div style={{ fontSize: 10, color: dashboard.weeklyCapPct > 80 ? AMBER : MUTED }}>
                  {dashboard.weeklyCapPct > 80 ? `⚠ ${100 - dashboard.weeklyCapPct}% remaining` : `${100 - dashboard.weeklyCapPct}% of weekly cap remaining`}
                </div>
              </div>
            </div>

            {/* Row 1: funnel + area */}
            <div style={grid12('5fr 7fr')}>
              <Card title="Outreach funnel" subtitle="Measured workflow stages">
                <ReactECharts style={{ height: 262 }} option={buildFunnel([
                  { name: 'Investors',   value: dashboard.total,     itemStyle: { color: '#C4BFFA' } },
                  { name: 'Contacted',   value: dashboard.contacted, itemStyle: { color: A } },
                  { name: 'Replied',     value: dashboard.replies,   itemStyle: { color: BLUE } },
                  { name: 'Conversation',value: dashboard.active,    itemStyle: { color: GREEN } },
                ].filter(item => item.value))} />
              </Card>
              <Card title="Daily activity" subtitle="Email and reply volume over the last 14 days" action={<Pill tone={GREEN}>● Live</Pill>}>
                <ReactECharts style={{ height: 262 }} option={buildArea(dashboard.trend.map(x => x.label), dashboard.trend.map(x => x.sent), dashboard.trend.map(x => x.replies))} />
              </Card>
            </div>

            {/* Row 2: follow-up health + heatmap + attention */}
            <div style={grid12('4fr 4fr 4fr')}>
              <Card title="Follow-up health" subtitle="Next actions from workflow timing">
                <div style={{ marginTop: 4 }}>
                  <ProgressRow label="Due today"    value={dashboard.followups.today}    total={Math.max(1, dashboard.total)} tone={AMBER} />
                  <ProgressRow label="Due tomorrow" value={dashboard.followups.tomorrow} total={Math.max(1, dashboard.total)} tone={BLUE} />
                  <ProgressRow label="Overdue"      value={dashboard.followups.overdue}  total={Math.max(1, dashboard.total)} tone={RED} />
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 10 }}>Cadence: +2 days, +3 days, then +5 days.</div>
              </Card>

              <Card title="Reply heatmap" subtitle="Weekday and time of investor responses">
                <ReactECharts style={{ height: 212 }} option={buildHeatmap(dashboard.heatData, dashboard.heatMax)} />
              </Card>

              <AttentionQueue rows={dashboard.escalatedRows} />
            </div>

            {/* Row 3: escalation queue + events */}
            <div style={grid12('8fr 4fr')}>
              <RecentConversations convByInvestor={dashboard.convByInvestor} investorMap={dashboard.investorMap} query={query} setQuery={setQuery} />

              <Card title="Latest events" subtitle="Most recent workflow activity">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {dashboard.events.map((event, n) => (
                    <div key={`${event.at}-${n}`} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: n < dashboard.events.length - 1 ? `1px solid #F3F4F6` : 'none' }}>
                      <div style={{ width: 3, borderRadius: 99, background: event.tone, flexShrink: 0, alignSelf: 'stretch', minHeight: 32 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: INK }}>{event.type}</div>
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.who}</div>
                        <div style={{ fontSize: 9, fontFamily: MONO, color: MUTED, marginTop: 2 }}>{fmtDate(event.at)} {fmtTime(event.at)}</div>
                      </div>
                    </div>
                  ))}
                  {!dashboard.events.length && (
                    <div style={{ textAlign: 'center', padding: '32px', color: MUTED, fontSize: 12 }}>No timestamped activity yet.</div>
                  )}
                </div>
              </Card>
            </div>

            {/* Row 4: touchpoint distribution + thread health */}
            <div style={grid12('7fr 5fr')}>
              <Card title="Follow-up distribution" subtitle="Investors at each outreach stage">
                {['Initial email','Follow-up 1','Follow-up 2','Follow-up 3+'].map((label, i) => (
                  <ProgressRow key={label} label={label} value={dashboard.touchpoints[i]} total={Math.max(1, dashboard.contacted)} tone={[A, BLUE, AMBER, GREEN][i]} />
                ))}
              </Card>

              <Card title="Thread health" subtitle="Outlook conversation tracking">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Tracked',     value: dashboard.openThreads,                                          tone: GREEN, icon: '✓' },
                    { label: 'Missing',     value: Math.max(0, dashboard.contacted - dashboard.openThreads),       tone: AMBER, icon: '?' },
                    { label: 'Multi-ID',    value: dashboard.duplicateThreads,                                     tone: RED,   icon: '≠' },
                  ].map(({ label, value, tone, icon }) => (
                    <div key={label} style={{ padding: '14px', background: '#F7F7FB', borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 16, color: tone, marginBottom: 6 }}>{icon}</div>
                      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: tone, marginBottom: 4 }}>{value}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: MUTED }}>{label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
