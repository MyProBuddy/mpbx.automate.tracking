import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'
import { listClientSheets, getSheetTabs, getSheetValues, initTokenClient, requestToken } from '../google.js'
import { useAuth } from '../AuthContext.jsx'

const A     = T.accent
const RED   = '#DC2626'
const AMBER = '#D97706'
const GREEN = '#16A34A'
const BLUE  = '#2563EB'
const INK   = T.text
const MUTED = T.muted
const LINE  = 'rgba(0,0,0,0.08)'
const MONO  = T.mono
const FONT  = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FS    = { h: 32, sh: 18, c: 14, sc: 12 }

const NEU_BG     = '#F0F0F0'
const NEU_SURF   = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHADOW = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const NEU_BTN    = '-4px -4px 10px rgba(255,255,255,0.9), 4px 4px 10px rgba(0,0,0,0.10)'

const parseDate = v => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d }
const parseList = v => String(v || '').replace(/^\[/, '').replace(/\]$/, '').split(',').map(s => parseDate(s.trim())).filter(Boolean)
const asBool = v => ['1','true','yes','pending','escalated','active'].includes(String(v||'').trim().toLowerCase())
const isToday = d => { if (!d) return false; const t = new Date(); return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate() }

function ReportRow({ icon, iconColor, label, value, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 22px' }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: iconColor + '15', display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: FS.c, color: INK, fontFamily: FONT }}>{detail}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: MONO, letterSpacing: '-0.03em', color: value > 0 ? iconColor : MUTED, flexShrink: 0 }}>{value}</div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: NEU_SURF, borderRadius: 16, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 6,
      boxShadow: NEU_SHADOW,
    }}>
      <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.5px', color: color || INK, fontFamily: MONO, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

export default function Overview() {
  const navigate    = useNavigate()
  const { role, googleConnected: connected, googleSyncing, setConnected } = useAuth()
  const [googleReady, setGoogleReady] = useState(false)
  const [overview,  setOverview]    = useState([])
  const [alerts,    setAlerts]      = useState([])
  const [loading,   setLoading]     = useState(false)
  const [mailRows,    setMailRows]    = useState([])
  const [mailLoading, setMailLoading] = useState(false)
  const [mailPopup,   setMailPopup]   = useState(null)
  const [newRefreshToken, setNewRefreshToken] = useState('')

  useEffect(() => {
    const t = setInterval(() => {
      if (window.google) {
        initTokenClient(
          () => setConnected(true),
          (rt) => setNewRefreshToken(rt)
        )
        setGoogleReady(true)
        clearInterval(t)
      }
    }, 200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!connected) return
    setLoading(true)
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000)

    listClientSheets().then(sheets =>
      Promise.all(sheets.map(async sheet => {
        try {
          const tabs = await getSheetTabs(sheet.id)
          const trackTab = tabs.find(t => /^tracking$/i.test(t.title))
          if (!trackTab) return { id: sheet.id, name: sheet.name, error: 'No Tracking tab', alerts: [] }
          const values = await getSheetValues(sheet.id, `${trackTab.title}!A1:AF5000`)
          if (!values.length) return { id: sheet.id, name: sheet.name, total: 0, initialSent: 0, thisWeek: 0, f1: 0, f2: 0, f3: 0, replies: 0, alerts: [] }

          const headers = values[0].map(v => String(v).trim().toLowerCase())
          const rows    = values.slice(1).filter(r => r.some(Boolean))
          const fIdx    = pat => headers.findIndex(h => pat.test(h))
          const invIdI      = fIdx(/inv.?id|investor.?id/i)
          const emailI      = fIdx(/email/i)
          const countI      = fIdx(/follow.?up.?count/i)
          const sentAtI     = fIdx(/follow.?up.?timestamps?/i)
          const replyAtI    = fIdx(/reply.?timestamps?/i)
          const escalationI = fIdx(/^escalation$/i)
          const adminNotifI = fIdx(/admin.?noti/i)
          const stopOutI    = fIdx(/not.?interested.?outreach/i)
          const stopReplyI  = fIdx(/not.?interested.?reply/i)

          let initialSent = 0, thisWeek = 0, f1 = 0, f2 = 0, f3 = 0, replies = 0
          let todayInitial = 0, todayFollowup = 0, todayReplies = 0
          const found = []

          rows.forEach(row => {
            const id        = String(row[invIdI] || '').toUpperCase()
            const email     = String(row[emailI] || '').trim()
            const count     = Math.max(0, Number(row[countI]) || 0)
            const sentDates = parseList(row[sentAtI])
            const replyVal  = String(row[replyAtI] ?? '').trim()
            const hasReply  = replyVal !== '' && replyVal.toUpperCase() !== 'N/A' && replyVal.toUpperCase() !== 'FALSE'
            const stopped   = asBool(row[stopOutI]) || asBool(row[stopReplyI])
            const escVal    = String(row[escalationI] || '').trim().toLowerCase()
            const adminVal  = String(row[adminNotifI] || '').trim().toLowerCase()
            const escalated = asBool(escVal) || asBool(adminVal) || escVal === 'escalated'
            const stage     = countI >= 0 ? count : sentDates.length
            const lastSent  = sentDates[sentDates.length - 1] || null
            const replyDate = parseDate(replyVal)

            if (stage >= 1) initialSent++
            if (stage === 2) f1++
            if (stage === 3) f2++
            if (stage >= 4) f3++
            if (hasReply) replies++
            if (sentDates.some(d => d >= oneWeekAgo)) thisWeek++

            if (stage === 1 && isToday(lastSent)) todayInitial++
            if (stage >= 2 && isToday(lastSent)) todayFollowup++
            if (isToday(replyDate)) todayReplies++

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
              found.push({ type: 'invalid_email', client: sheet.name, id, detail: email })
            if (escalated && !stopped)
              found.push({ type: 'escalation', client: sheet.name, id, detail: escVal || adminVal || 'active' })
          })

          return { id: sheet.id, name: sheet.name, total: rows.length, initialSent, thisWeek, f1, f2, f3, replies, todayInitial, todayFollowup, todayReplies, alerts: found }
        } catch {
          return { id: sheet.id, name: sheet.name, error: 'Failed to load', alerts: [] }
        }
      }))
    ).then(results => {
      setOverview(results)
      setAlerts(results.flatMap(r => r.alerts || []))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [connected])

  const MAIL_VALIDATION_SHEET_ID = '1btrQftzrb_8cKwAs7WH1aTn0JGXES_coF56LEOmF44Y'

  useEffect(() => {
    if (!connected) return
    setMailLoading(true)
    getSheetTabs(MAIL_VALIDATION_SHEET_ID)
      .then(tabs => {
        const tab = tabs[0]?.title || 'Sheet1'
        return getSheetValues(MAIL_VALIDATION_SHEET_ID, `${tab}!A1:D5000`)
      })
      .then(values => {
        if (!values.length) { setMailRows([]); setMailLoading(false); return }
        const headers = values[0].map(v => String(v).trim().toLowerCase())
        const sheetIdI = headers.findIndex(h => /google.?sheet.?id/i.test(h))
        const invIdI   = headers.findIndex(h => /investor.?id/i.test(h))
        const emailI   = headers.findIndex(h => /email/i.test(h))
        const validI   = headers.findIndex(h => /is.?valid|valid/i.test(h))
        const rows = values.slice(1).filter(r => r.some(Boolean)).map(r => ({
          sheetId: String(r[sheetIdI] || '').trim(),
          id:      String(r[invIdI]   || '').trim(),
          email:   String(r[emailI]   || '').trim(),
          status:  String(r[validI]   || '').trim().toLowerCase(),
        }))
        setMailRows(rows)
      })
      .catch(() => setMailRows([]))
      .finally(() => setMailLoading(false))
  }, [connected])

  const totals = overview.reduce((acc, r) => ({
    total:         acc.total         + (r.total         || 0),
    initialSent:   acc.initialSent   + (r.initialSent   || 0),
    thisWeek:      acc.thisWeek      + (r.thisWeek       || 0),
    f1:            acc.f1            + (r.f1             || 0),
    f2:            acc.f2            + (r.f2             || 0),
    f3:            acc.f3            + (r.f3             || 0),
    replies:       acc.replies       + (r.replies        || 0),
    todayInitial:  acc.todayInitial  + (r.todayInitial   || 0),
    todayFollowup: acc.todayFollowup + (r.todayFollowup  || 0),
    todayReplies:  acc.todayReplies  + (r.todayReplies   || 0),
  }), { total: 0, initialSent: 0, thisWeek: 0, f1: 0, f2: 0, f3: 0, replies: 0, todayInitial: 0, todayFollowup: 0, todayReplies: 0 })

  const todayClientsInitial  = overview.filter(r => (r.todayInitial  || 0) > 0).length
  const todayClientsFollowup = overview.filter(r => (r.todayFollowup || 0) > 0).length

  const grouped = alerts.reduce((acc, a) => { (acc[a.type] = acc[a.type] || []).push(a); return acc }, {})
  const alertSections = [
    { key: 'escalation',    title: 'Escalations',    color: RED },
    { key: 'invalid_email', title: 'Invalid Emails', color: RED },
  ]

  const thS  = { padding: '11px 18px', fontSize: FS.c, fontWeight: 500, color: MUTED, borderBottom: `1px solid ${LINE}`, textAlign: 'left', background: 'rgba(0,0,0,0.02)', whiteSpace: 'nowrap', fontFamily: FONT }
  const thR  = { ...thS, textAlign: 'right' }
  const tdS  = { padding: '14px 18px', fontSize: FS.c, color: INK, borderBottom: `1px solid ${LINE}`, fontFamily: FONT }
  const tdNum = { ...tdS, textAlign: 'right', fontFamily: MONO, fontSize: FS.c }
  const totTd = { ...tdNum, fontWeight: 500, color: INK, background: 'rgba(0,0,0,0.03)', borderTop: `1px solid rgba(0,0,0,0.08)`, borderBottom: 'none' }
  const totLabel = { ...tdS, fontWeight: 500, color: INK, background: 'rgba(0,0,0,0.03)', borderTop: `1px solid rgba(0,0,0,0.08)`, borderBottom: 'none' }

  const connectButton = !googleSyncing && !connected && role === 'superadmin' && (
    <button disabled={!googleReady} onClick={() => { initTokenClient(() => setConnected(true), (rt) => setNewRefreshToken(rt)); requestToken() }}
      style={{ height: 36, border: 'none', borderRadius: 10, padding: '0 18px', background: NEU_SURF, color: INK, cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: FS.c, boxShadow: NEU_BTN }}>
      Connect Google
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Overview" backTo="/hub" extra={connectButton} />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 48px 100px' }}>

        {newRefreshToken && (
          <div style={{ padding: '16px 20px', background: NEU_SURF, borderRadius: 12, fontSize: FS.c, color: GREEN, fontWeight: 500, marginBottom: 32, boxShadow: NEU_SHADOW }}>
            ✓ Google Account connected permanently. The authorization has been securely stored in your Gist and is now active for all users and browsers!
          </div>
        )}

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: FS.c, fontWeight: 500, color: A, marginBottom: 8 }}>All Clients</div>
          <h1 style={{ fontSize: FS.h, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.2, margin: '0 0 8px', color: INK }}>Outreach at a glance</h1>
          <p style={{ fontSize: FS.c, color: MUTED, margin: 0, lineHeight: 1.6 }}>Live summary across every client campaign. Click a row to drill into Analytics.</p>
        </div>

        {!connected && role !== 'superadmin' && (
          <div style={{ padding: '16px 20px', background: NEU_SURF, borderRadius: 12, fontSize: FS.c, color: RED, fontWeight: 500, marginBottom: 32, boxShadow: NEU_SHADOW }}>
            Google not connected — ask your Super Admin to connect Google first.
          </div>
        )}

        {loading && (
          <div style={{ padding: '80px 0', textAlign: 'center', color: MUTED, fontSize: FS.c }}>
            Scanning all client sheets…
          </div>
        )}

        {!loading && overview.length > 0 && (
          <>
            {/* Outreach Funnel */}
            {(() => {
              const GRAD = 'linear-gradient(90deg, #C026D3, #F43F5E, #F97316)'
              const stages = [
                { label: 'Total',        value: totals.total,       color: '#C026D3' },
                { label: 'Initial Sent', value: totals.initialSent, color: '#D4288C' },
                { label: 'Followup 1',   value: totals.f1,          color: '#F43F5E' },
                { label: 'Followup 2',   value: totals.f2,          color: '#F97316' },
                { label: 'Followup 3',   value: totals.f3,          color: '#FBBF24' },
                { label: 'Replies',      value: totals.replies,     color: GREEN },
              ]
              const max = Math.max(1, stages[0].value)
              return (
                <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: '24px 28px', marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, letterSpacing: '-0.2px' }}>Outreach Status</div>
                    <div style={{ fontSize: FS.sc, color: MUTED }}>
                      {totals.initialSent > 0 ? `${Math.round(totals.replies / totals.initialSent * 100)}% reply rate` : '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stages.map((s, i) => {
                      const pct = s.value / max * 100
                      const prev = i > 0 ? stages[i - 1].value : s.value
                      const dropPct = prev > 0 ? Math.round(s.value / prev * 100) : null
                      return (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 90, fontSize: FS.sc, fontWeight: 500, color: MUTED, textAlign: 'right', flexShrink: 0 }}>{s.label}</div>
                          <div style={{ flex: 1, height: 32, background: 'rgba(0,0,0,0.06)', borderRadius: 8, overflow: 'hidden', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.08), inset -2px -2px 5px rgba(255,255,255,0.7)' }}>
                            <div style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: i === stages.length - 1 ? `${GREEN}` : GRAD,
                              borderRadius: 8,
                              transition: 'width 0.6s ease',
                              display: 'flex', alignItems: 'center', paddingLeft: 10, boxSizing: 'border-box',
                            }}>
                              {pct > 12 && <span style={{ fontSize: FS.sc, fontWeight: 700, color: '#fff', fontFamily: MONO }}>{s.value.toLocaleString()}</span>}
                            </div>
                          </div>
                          <div style={{ width: 44, fontSize: FS.sc, fontFamily: MONO, fontWeight: 500, color: INK, flexShrink: 0 }}>
                            {pct <= 12 ? s.value.toLocaleString() : ''}
                          </div>
                          <div style={{ width: 44, fontSize: FS.sc, color: i === 0 ? 'transparent' : MUTED, flexShrink: 0 }}>
                            {i > 0 && dropPct !== null ? `${dropPct}%` : ''}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${LINE}` }}>
                    <div style={{ fontSize: FS.sc, color: MUTED }}>This week: <span style={{ fontFamily: MONO, fontWeight: 500, color: INK }}>{totals.thisWeek}</span> emails sent</div>
                  </div>
                </div>
              )
            })()}

            {/* Today's Report */}
            <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, overflow: 'hidden', marginBottom: 28 }}>
              <div style={{ padding: '14px 22px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.02)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, boxShadow: `0 0 0 3px ${GREEN}30` }} />
                <span style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, fontFamily: FONT }}>Today's Report</span>
                <span style={{ fontSize: FS.sc, color: MUTED, fontFamily: MONO, marginLeft: 'auto' }}>
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div style={{ padding: '6px 0' }}>
                <ReportRow icon="✉" iconColor="#5B4AE8" label="New mail outreached" value={totals.todayInitial}
                  detail={totals.todayInitial === 0 ? 'No initial emails sent today' : `${totals.todayInitial} sent today across ${todayClientsInitial} client${todayClientsInitial !== 1 ? 's' : ''}`} />
                <div style={{ height: 1, background: LINE, margin: '0 22px' }} />
                <ReportRow icon="↩" iconColor={AMBER} label="Followups sent" value={totals.todayFollowup}
                  detail={totals.todayFollowup === 0 ? 'No followups sent today' : `${totals.todayFollowup} sent today across ${todayClientsFollowup} client${todayClientsFollowup !== 1 ? 's' : ''}`} />
                <div style={{ height: 1, background: LINE, margin: '0 22px' }} />
                <ReportRow icon="💬" iconColor={GREEN} label="Replies detected" value={totals.todayReplies}
                  detail={totals.todayReplies === 0 ? 'No new replies today' : `${totals.todayReplies} new repl${totals.todayReplies !== 1 ? 'ies' : 'y'} received today`} />
              </div>
            </div>

            {/* Clients table */}
            <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, overflow: 'hidden', marginBottom: 40 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thS}>Client</th>
                    <th style={thR}>Total</th>
                    <th style={thR}>Initial Sent</th>
                    <th style={thR}>This Week</th>
                    <th style={thR}>Followup 1</th>
                    <th style={thR}>Followup 2</th>
                    <th style={thR}>Followup 3</th>
                    <th style={thR}>Replies</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.map(r => (
                    <tr key={r.id}
                      onClick={() => navigate('/analytics')}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                      style={{ cursor: 'pointer', transition: 'background 0.1s' }}>
                      <td style={tdS}>
                        <div style={{ fontWeight: 400, color: INK }}>{r.name}</div>
                        {r.error && <span style={{ fontSize: FS.sc, color: RED, marginLeft: 8, fontWeight: 500 }}>{r.error}</span>}
                      </td>
                      <td style={tdNum}>{r.error ? '—' : r.total}</td>
                      <td style={tdNum}>{r.error ? '—' : r.initialSent}</td>
                      <td style={tdNum}>{r.error ? '—' : r.thisWeek}</td>
                      <td style={tdNum}>{r.error ? '—' : r.f1}</td>
                      <td style={tdNum}>{r.error ? '—' : r.f2}</td>
                      <td style={tdNum}>{r.error ? '—' : r.f3}</td>
                      <td style={tdNum}>{r.error ? '—' : r.replies}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={totLabel}>{overview.filter(r => !r.error).length} clients total</td>
                    <td style={totTd}>{totals.total}</td>
                    <td style={totTd}>{totals.initialSent}</td>
                    <td style={totTd}>{totals.thisWeek}</td>
                    <td style={totTd}>{totals.f1}</td>
                    <td style={totTd}>{totals.f2}</td>
                    <td style={totTd}>{totals.f3}</td>
                    <td style={totTd}>{totals.replies}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Needs Attention */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: FS.c, fontWeight: 500, color: RED, marginBottom: 6 }}>Needs Attention</div>
              <h2 style={{ fontSize: FS.sh, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 20px', color: INK }}>
                {alerts.length === 0 ? 'Everything looks good' : `${alerts.length} item${alerts.length !== 1 ? 's' : ''} need review`}
              </h2>
            </div>

            {alerts.length === 0 ? (
              <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: '28px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: GREEN + '18', display: 'grid', placeItems: 'center', color: GREEN, fontSize: 18, flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontSize: FS.c, fontWeight: 500, color: INK, marginBottom: 2 }}>All clear</div>
                  <div style={{ fontSize: FS.sc, color: MUTED }}>No escalations, invalid emails, or overdue followups found.</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                {alertSections.map(sec => {
                  const rows = grouped[sec.key]
                  if (!rows?.length) return (
                    <div key={sec.key} style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: GREEN + '15', display: 'grid', placeItems: 'center', color: GREEN, fontSize: 14, flexShrink: 0 }}>✓</div>
                      <div>
                        <div style={{ fontSize: FS.c, fontWeight: 500, color: INK }}>{sec.title}</div>
                        <div style={{ fontSize: FS.sc, color: MUTED, marginTop: 2 }}>None found</div>
                      </div>
                    </div>
                  )
                  return (
                    <div key={sec.key} style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, overflow: 'hidden' }}>
                      <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${LINE}`, background: 'rgba(0,0,0,0.02)' }}>
                        <span style={{ fontSize: FS.c, fontWeight: 500, color: sec.color, fontFamily: FONT }}>{sec.title}</span>
                        <span style={{ background: sec.color + '18', color: sec.color, fontSize: FS.sc, fontWeight: 500, padding: '2px 9px', borderRadius: 999, fontFamily: MONO }}>{rows.length}</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={thS}>Client</th>
                            <th style={thS}>ID</th>
                            <th style={thS}>Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 8).map((r, i) => (
                            <tr key={i}>
                              <td style={{ ...tdS, fontSize: FS.sc }}>{r.client}</td>
                              <td style={{ ...tdS, fontFamily: MONO, fontSize: FS.sc, color: MUTED }}>{r.id || '—'}</td>
                              <td style={{ ...tdS, fontSize: FS.sc, color: sec.color }}>{r.detail}</td>
                            </tr>
                          ))}
                          {rows.length > 8 && (
                            <tr><td colSpan={3} style={{ ...tdS, color: MUTED, fontSize: FS.sc, fontStyle: 'italic' }}>+{rows.length - 8} more</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Mail Validation */}
            {(() => {
              const safe    = mailRows.filter(r => r.status === 'safe')
              const risky   = mailRows.filter(r => r.status === 'risky')
              const invalid = mailRows.filter(r => r.status === 'invalid')
              const unknown = mailRows.filter(r => !['safe','risky','invalid'].includes(r.status))
              return (
                <div style={{ marginTop: 48 }}>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: FS.c, fontWeight: 500, color: BLUE, marginBottom: 6 }}>Email Health</div>
                    <h2 style={{ fontSize: FS.sh, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 4px', color: INK }}>Mail Validation & Bounce Check</h2>
                    <p style={{ fontSize: FS.c, color: MUTED, margin: '0 0 16px' }}>Validity status of investor emails across all campaigns.</p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {[
                        { status: 'Valid',   color: GREEN, desc: 'Email address is deliverable — domain exists, mailbox is active, and our outreach tool confirmed it can receive mail safely.' },
                        { status: 'Risky',   color: AMBER, desc: 'Deliverable but flagged — typically a catch-all domain, role-based address (info@, contact@), or a domain with low sender reputation. May bounce or go unread.' },
                        { status: 'Invalid', color: RED,   desc: 'Not deliverable — domain does not exist, mailbox is inactive or rejected, or the address failed SMTP verification. Sending to these will hard-bounce.' },
                        { status: 'Unknown', color: MUTED, desc: "Reacher couldn't determine deliverability — usually due to a timeout, greylisting, or the server not responding to SMTP checks. Treat with caution." },
                      ].map(({ status, color, desc }) => (
                        <div key={status} style={{ flex: '1 1 200px', background: NEU_SURF, borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', boxShadow: NEU_SHADOW }}>
                          <span style={{ display: 'inline-block', marginTop: 1, padding: '2px 10px', borderRadius: 999, fontSize: FS.sc, fontWeight: 500, fontFamily: MONO, background: color + '20', color, flexShrink: 0 }}>{status}</span>
                          <span style={{ fontSize: FS.sc, color: MUTED, lineHeight: 1.5 }}>{desc}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14, padding: '10px 16px', background: NEU_SURF, borderRadius: 10, fontSize: FS.sc, color: MUTED, lineHeight: 1.6, boxShadow: NEU_SHADOW }}>
                      <span style={{ fontWeight: 600, color: A }}>About Reacher accuracy — </span>
                      Our self-hosted <span style={{ fontWeight: 600, color: INK }}>Reacher</span> uses real-time SMTP handshakes for verification, similar to <span style={{ fontWeight: 600, color: INK }}>Hunter.io</span>. Hunter is a mature commercial product with a larger data set and domain reputation database, making it generally more reliable — especially on catch-all and role-based addresses. Reacher's advantage is privacy (no data leaves our infrastructure) and no per-lookup cost. The <em>unknown</em> results you see here are cases where the target mail server timed out or blocked the SMTP probe.
                    </div>
                  </div>

                  {mailLoading ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: MUTED, fontSize: FS.c }}>Loading mail validation data…</div>
                  ) : mailRows.length === 0 ? (
                    <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: '32px 24px', color: MUTED, fontSize: FS.c, textAlign: 'center' }}>
                      No validation data found.
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const mailStages = [
                          { label: 'Valid',   value: safe.length,    color: GREEN,      colorLight: GREEN + '40' },
                          { label: 'Risky',   value: risky.length,   color: AMBER,      colorLight: AMBER + '40' },
                          { label: 'Invalid', value: invalid.length, color: RED,        colorLight: RED + '40' },
                          { label: 'Unknown', value: unknown.length, color: '#9CA3AF',  colorLight: 'rgba(0,0,0,0.10)' },
                        ]
                        // Build one bar per email, grouped by status, each with a random-ish height for organic look
                        const seed = (i) => 0.45 + (((i * 7 + 13) % 17) / 17) * 0.55
                        const bars = mailStages.flatMap(({ value, color, colorLight }) =>
                          Array.from({ length: value }, (_, i) => ({ color, colorLight, h: seed(i) }))
                        )
                        const CHART_H = 56
                        return (
                          <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, padding: '24px 28px', marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                              <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, letterSpacing: '-0.2px' }}>Email Status</div>
                              <div style={{ fontSize: FS.sc, color: MUTED, fontFamily: MONO }}>{mailRows.length.toLocaleString()} checked</div>
                            </div>

                            {/* Bar chart — one thin bar per email */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: CHART_H, marginBottom: 12, overflow: 'hidden' }}>
                              {bars.map((b, i) => (
                                <div key={i} style={{
                                  flex: '0 0 auto', width: 4, borderRadius: '2px 2px 0 0',
                                  height: `${Math.round(b.h * CHART_H)}px`,
                                  background: b.color,
                                  opacity: 0.8,
                                }} />
                              ))}
                            </div>

                            {/* Total label bar */}
                            <div style={{ background: 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '6px 12px', marginBottom: 16, fontSize: FS.sc, color: MUTED, textAlign: 'center', fontFamily: MONO }}>
                              {mailRows.length} total checked
                            </div>

                            {/* Legend */}
                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                              {mailStages.map(s => (
                                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                                  <span style={{ fontSize: FS.sc, color: MUTED }}>{s.label}</span>
                                  <span style={{ fontSize: FS.sc, fontFamily: MONO, fontWeight: 600, color: INK }}>{s.value}</span>
                                  <span style={{ fontSize: FS.sc, color: MUTED }}>{Math.round(s.value / Math.max(1, mailRows.length) * 100)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}

                      {(() => {
                        const bySheet = {}
                        mailRows.forEach(r => {
                          if (!bySheet[r.sheetId]) bySheet[r.sheetId] = []
                          bySheet[r.sheetId].push(r)
                        })
                        const clientRows = Object.entries(bySheet).map(([sheetId, rows]) => {
                          const match = overview.find(o => o.id === sheetId)
                          return {
                            sheetId,
                            name:    match?.name || sheetId,
                            total:   rows.length,
                            valid:   rows.filter(r => r.status === 'safe').length,
                            risky:   rows.filter(r => r.status === 'risky').length,
                            invalid: rows.filter(r => r.status === 'invalid').length,
                            unknown: rows.filter(r => !['safe','risky','invalid'].includes(r.status)).length,
                            rows,
                          }
                        })
                        const totValid   = clientRows.reduce((s, r) => s + r.valid,   0)
                        const totRisky   = clientRows.reduce((s, r) => s + r.risky,   0)
                        const totInvalid = clientRows.reduce((s, r) => s + r.invalid, 0)
                        const totUnknown = clientRows.reduce((s, r) => s + r.unknown, 0)
                        const totTotal   = clientRows.reduce((s, r) => s + r.total,   0)
                        return (
                          <div style={{ background: NEU_SURF, borderRadius: 20, boxShadow: NEU_SHADOW, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={thS}>Client</th>
                                  <th style={thR}>Total</th>
                                  <th style={thR}>Valid</th>
                                  <th style={thR}>Risky</th>
                                  <th style={thR}>Invalid</th>
                                  <th style={thR}>Unknown</th>
                                  <th style={thS}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {clientRows.map((r, i) => (
                                  <tr key={i}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                    <td style={{ ...tdS, fontWeight: 400, color: INK }}>{r.name}</td>
                                    <td style={tdNum}>{r.total}</td>
                                    <td style={tdNum}>{r.valid}</td>
                                    <td style={tdNum}>{r.risky}</td>
                                    <td style={tdNum}>{r.invalid}</td>
                                    <td style={tdNum}>{r.unknown}</td>
                                    <td style={{ ...tdS, textAlign: 'right' }}>
                                      <button onClick={() => setMailPopup({ clientName: r.name, rows: r.rows })}
                                        style={{ fontSize: FS.sc, fontWeight: 500, color: A, background: A + '12', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontFamily: FONT }}>
                                        View all
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td style={totLabel}>{clientRows.length} clients total</td>
                                  <td style={totTd}>{totTotal}</td>
                                  <td style={totTd}>{totValid}</td>
                                  <td style={totTd}>{totRisky}</td>
                                  <td style={totTd}>{totInvalid}</td>
                                  <td style={totTd}>{totUnknown}</td>
                                  <td style={{ ...totTd }}></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </main>

      {/* Mail detail popup */}
      {mailPopup && (
        <div onClick={() => setMailPopup(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: NEU_SURF, borderRadius: 20, width: '90%', maxWidth: 560,
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 2 }}>Mail Validation</div>
                <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK }}>{mailPopup.clientName}</div>
              </div>
              <button onClick={() => setMailPopup(null)} style={{ border: 'none', background: NEU_SURF, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: MUTED, display: 'grid', placeItems: 'center', boxShadow: NEU_BTN }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={thS}>ID</th>
                    <th style={thS}>Email</th>
                    <th style={thS}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mailPopup.rows.map((r, i) => {
                    const c = r.status === 'safe' ? GREEN : r.status === 'risky' ? AMBER : RED
                    return (
                      <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ ...tdS, fontFamily: MONO, fontSize: FS.sc, color: MUTED }}>{r.id || '—'}</td>
                        <td style={{ ...tdS, fontSize: FS.c }}>{r.email || '—'}</td>
                        <td style={tdS}>
                          <span style={{ display: 'inline-block', padding: '3px 11px', borderRadius: 999, fontSize: FS.sc, fontWeight: 500, fontFamily: MONO, background: c + '18', color: c, textTransform: 'capitalize' }}>
                            {r.status || '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 24px', borderTop: `1px solid ${LINE}`, fontSize: FS.sc, color: MUTED, flexShrink: 0 }}>
              {mailPopup.rows.length} emails total
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
