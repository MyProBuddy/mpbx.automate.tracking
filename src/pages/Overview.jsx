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
const LINE  = T.border
const MONO  = T.mono
const SANS  = T.sans

const parseDate = v => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d }
const parseList = v => String(v || '').replace(/^\[/, '').replace(/\]$/, '').split(',').map(s => parseDate(s.trim())).filter(Boolean)
const asBool = v => ['1','true','yes','pending','escalated','active'].includes(String(v||'').trim().toLowerCase())
const isToday = d => { if (!d) return false; const t = new Date(); return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate() }

function Pill({ n, color }) {
  return (
    <span style={{
      display: 'inline-block', minWidth: 44, textAlign: 'center',
      padding: '4px 12px', borderRadius: 999,
      fontSize: 12, fontWeight: 700, fontFamily: MONO,
      background: color + '15', color,
      letterSpacing: '0.01em',
    }}>{n}</span>
  )
}

function ReportRow({ icon, iconColor, label, value, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 22px' }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: iconColor + '15', display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: MUTED, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: INK, fontFamily: SANS }}>{detail}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: MONO, letterSpacing: '-0.03em', color: value > 0 ? iconColor : MUTED, flexShrink: 0 }}>{value}</div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: `1px solid ${LINE}`,
      padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: color || INK, fontFamily: MONO, lineHeight: 1 }}>{value}</div>
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
  const [mailPopup,   setMailPopup]   = useState(null) // { clientName, rows }
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

  // table styles
  const th = (right) => ({
    padding: '11px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
    textTransform: 'uppercase', color: MUTED, borderBottom: `1px solid ${LINE}`,
    textAlign: right ? 'right' : 'left', background: '#FAFAFA', whiteSpace: 'nowrap',
    fontFamily: SANS,
  })
  const td = { padding: '14px 18px', fontSize: 13, color: INK, borderBottom: `1px solid ${LINE}`, fontFamily: SANS }
  const tdNum = { ...td, textAlign: 'right', fontFamily: MONO, fontSize: 12 }
  const totTd = { ...tdNum, fontWeight: 700, background: '#F4F4F8', borderTop: `2px solid ${LINE}`, borderBottom: 'none', fontSize: 13 }
  const totLabel = { ...td, fontWeight: 700, background: '#F4F4F8', borderTop: `2px solid ${LINE}`, borderBottom: 'none' }

  const thA = { ...th(false), background: '#FAFAFA' }
  const tdA = { ...td, fontSize: 12 }

  const connectButton = !googleSyncing && !connected && role === 'superadmin' && (
    <button disabled={!googleReady} onClick={() => { initTokenClient(() => setConnected(true), (rt) => setNewRefreshToken(rt)); requestToken() }}
      style={{ height: 36, border: 0, borderRadius: 8, padding: '0 18px', background: INK, color: '#fff', cursor: 'pointer', fontFamily: SANS, fontWeight: 600, fontSize: 13 }}>
      Connect Google
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: SANS }}>
      <Nav title="Overview" backTo="/hub" extra={connectButton} />

      <main style={{ padding: '40px 32px 100px' }}>

        {/* New Refresh Token display */}
        {newRefreshToken && (
          <div style={{ padding: '16px 20px', background: '#F0FDF4', border: `1px solid ${GREEN}30`, borderRadius: 10, fontSize: 13, color: GREEN, fontWeight: 500, marginBottom: 32 }}>
            ✓ Google Account connected permanently. The authorization has been securely stored in your Gist and is now active for all users and browsers!
          </div>
        )}

        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: A, marginBottom: 8 }}>All Clients</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px', color: INK }}>Outreach at a glance</h1>
          <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.6 }}>Live summary across every client campaign. Click a row to drill into Analytics.</p>
        </div>

        {/* Not connected */}
        {!connected && role !== 'superadmin' && (
          <div style={{ padding: '16px 20px', background: '#FEF2F2', border: `1px solid ${RED}30`, borderRadius: 10, fontSize: 13, color: RED, fontWeight: 500, marginBottom: 32 }}>
            Google not connected — ask your Super Admin to connect Google first.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding: '80px 0', textAlign: 'center', color: MUTED, fontSize: 13 }}>
            Scanning all client sheets…
          </div>
        )}

        {!loading && overview.length > 0 && (
          <>
            {/* Stat summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 28 }}>
              <StatCard label="Total"        value={totals.total}       />
              <StatCard label="Initial Sent" value={totals.initialSent} color="#5B4AE8" />
              <StatCard label="This Week"    value={totals.thisWeek}    color={BLUE} />
              <StatCard label="Followup 1"   value={totals.f1}          color={AMBER} />
              <StatCard label="Followup 2"   value={totals.f2}          color={AMBER} />
              <StatCard label="Followup 3"   value={totals.f3}          color={AMBER} />
              <StatCard label="Replies"      value={totals.replies}     color={GREEN} />
            </div>

            {/* Today's Report */}
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${LINE}`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: 28 }}>
              <div style={{ padding: '14px 22px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAFA' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, boxShadow: `0 0 0 3px ${GREEN}30` }} />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED, fontFamily: SANS }}>Today's Report</span>
                <span style={{ fontSize: 11, color: MUTED, fontFamily: MONO, marginLeft: 'auto' }}>
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div style={{ padding: '6px 0' }}>
                <ReportRow
                  icon="✉"
                  iconColor="#5B4AE8"
                  label="New mail outreached"
                  value={totals.todayInitial}
                  detail={totals.todayInitial === 0 ? 'No initial emails sent today' : `${totals.todayInitial} sent today across ${todayClientsInitial} client${todayClientsInitial !== 1 ? 's' : ''}`}
                />
                <div style={{ height: 1, background: LINE, margin: '0 22px' }} />
                <ReportRow
                  icon="↩"
                  iconColor={AMBER}
                  label="Followups sent"
                  value={totals.todayFollowup}
                  detail={totals.todayFollowup === 0 ? 'No followups sent today' : `${totals.todayFollowup} sent today across ${todayClientsFollowup} client${todayClientsFollowup !== 1 ? 's' : ''}`}
                />
                <div style={{ height: 1, background: LINE, margin: '0 22px' }} />
                <ReportRow
                  icon="💬"
                  iconColor={GREEN}
                  label="Replies detected"
                  value={totals.todayReplies}
                  detail={totals.todayReplies === 0 ? 'No new replies today' : `${totals.todayReplies} new repl${totals.todayReplies !== 1 ? 'ies' : 'y'} received today`}
                />
              </div>
            </div>

            {/* Clients table */}
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${LINE}`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: 40 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th(false)}>Client</th>
                    <th style={th(true)}>Total</th>
                    <th style={th(true)}>Initial Sent</th>
                    <th style={th(true)}>This Week</th>
                    <th style={th(true)}>Followup 1</th>
                    <th style={th(true)}>Followup 2</th>
                    <th style={th(true)}>Followup 3</th>
                    <th style={th(true)}>Replies</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.map(r => (
                    <tr key={r.id}
                      onClick={() => navigate('/analytics')}
                      onMouseEnter={e => e.currentTarget.style.background = '#F6F5FF'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                      style={{ cursor: 'pointer', transition: 'background 0.1s' }}>
                      <td style={td}>
                        <span style={{ fontWeight: 600, color: A }}>{r.name}</span>
                        {r.error && <span style={{ fontSize: 11, color: RED, marginLeft: 8, fontWeight: 500 }}>{r.error}</span>}
                      </td>
                      <td style={tdNum}>{r.error ? '—' : r.total}</td>
                      <td style={tdNum}>{r.error ? '—' : <Pill n={r.initialSent} color="#5B4AE8" />}</td>
                      <td style={tdNum}>{r.error ? '—' : <Pill n={r.thisWeek}    color={BLUE} />}</td>
                      <td style={tdNum}>{r.error ? '—' : <Pill n={r.f1}          color={AMBER} />}</td>
                      <td style={tdNum}>{r.error ? '—' : <Pill n={r.f2}          color={AMBER} />}</td>
                      <td style={tdNum}>{r.error ? '—' : <Pill n={r.f3}          color={AMBER} />}</td>
                      <td style={tdNum}>{r.error ? '—' : <Pill n={r.replies}     color={GREEN} />}</td>
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
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: RED, marginBottom: 6 }}>Needs Attention</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 20px', color: INK }}>
                {alerts.length === 0 ? 'Everything looks good' : `${alerts.length} item${alerts.length !== 1 ? 's' : ''} need review`}
              </h2>
            </div>

            {alerts.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${LINE}`, padding: '32px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: GREEN + '18', display: 'grid', placeItems: 'center', color: GREEN, fontSize: 18, flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 2 }}>All clear</div>
                  <div style={{ fontSize: 13, color: MUTED }}>No escalations, invalid emails, or overdue followups found.</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                {alertSections.map(sec => {
                  const rows = grouped[sec.key]
                  if (!rows?.length) return (
                    <div key={sec.key} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${LINE}`, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: GREEN + '15', display: 'grid', placeItems: 'center', color: GREEN, fontSize: 14, flexShrink: 0 }}>✓</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{sec.title}</div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>None found</div>
                      </div>
                    </div>
                  )
                  return (
                    <div key={sec.key} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
                      <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${LINE}`, background: sec.color + '08' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: sec.color, fontFamily: SANS }}>{sec.title}</span>
                        <span style={{ background: sec.color + '18', color: sec.color, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, fontFamily: MONO }}>{rows.length}</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={thA}>Client</th>
                            <th style={thA}>ID</th>
                            <th style={thA}>Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 8).map((r, i) => (
                            <tr key={i}>
                              <td style={{ ...tdA, fontWeight: 600, color: A }}>{r.client}</td>
                              <td style={{ ...tdA, fontFamily: MONO, fontSize: 11, color: MUTED }}>{r.id || '—'}</td>
                              <td style={{ ...tdA, color: sec.color, fontWeight: 500 }}>{r.detail}</td>
                            </tr>
                          ))}
                          {rows.length > 8 && (
                            <tr><td colSpan={3} style={{ ...tdA, color: MUTED, fontSize: 11, fontStyle: 'italic' }}>+{rows.length - 8} more</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Mail Validation & Bounce Check */}
            {(() => {
              const safe    = mailRows.filter(r => r.status === 'safe')
              const risky   = mailRows.filter(r => r.status === 'risky')
              const invalid = mailRows.filter(r => r.status === 'invalid')
              const unknown = mailRows.filter(r => !['safe','risky','invalid'].includes(r.status))
              const statusColor = s => s === 'safe' ? GREEN : s === 'risky' ? AMBER : s === 'invalid' ? RED : MUTED
              const statusLabel = s => s === 'safe' ? 'Safe' : s === 'risky' ? 'Risky' : s === 'invalid' ? 'Invalid' : 'Unknown'
              return (
                <div style={{ marginTop: 48 }}>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: BLUE, marginBottom: 6 }}>Email Health</div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px', color: INK }}>Mail Validation & Bounce Check</h2>
                    <p style={{ fontSize: 13, color: MUTED, margin: '0 0 16px' }}>Validity status of investor emails across all campaigns.</p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {[
                        {
                          status: 'Valid', color: GREEN,
                          desc: 'Email address is deliverable — domain exists, mailbox is active, and our outreach tool confirmed it can receive mail safely.',
                        },
                        {
                          status: 'Risky', color: AMBER,
                          desc: 'Deliverable but flagged — typically a catch-all domain (accepts all mail), role-based address (info@, contact@), or a domain with low sender reputation. May bounce or go unread.',
                        },
                        {
                          status: 'Invalid', color: RED,
                          desc: 'Not deliverable — domain does not exist, mailbox is inactive or rejected, or the address failed SMTP verification. Sending to these will hard-bounce.',
                        },
                        {
                          status: 'Unknown', color: MUTED,
                          desc: "Reacher couldn't determine deliverability — usually due to a timeout, greylisting, or the server not responding to SMTP checks. Treat with caution; may or may not deliver.",
                        },
                      ].map(({ status, color, desc }) => (
                        <div key={status} style={{ flex: '1 1 200px', background: color + '08', border: `1px solid ${color}25`, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ display: 'inline-block', marginTop: 1, padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, fontFamily: MONO, background: color + '20', color, flexShrink: 0 }}>{status}</span>
                          <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{desc}</span>
                        </div>
                      ))}
                    </div>
                    {/* Reacher accuracy note */}
                    <div style={{ marginTop: 14, padding: '10px 16px', background: '#F8F7FF', border: `1px solid ${A}20`, borderRadius: 8, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 700, color: A }}>About Reacher accuracy — </span>
                      Our self-hosted <span style={{ fontWeight: 600, color: INK }}>Reacher</span> uses real-time SMTP handshakes for verification, similar to <span style={{ fontWeight: 600, color: INK }}>Hunter.io</span>. Hunter is a mature commercial product with a larger data set and domain reputation database, making it generally more reliable — especially on catch-all and role-based addresses. Reacher's advantage is privacy (no data leaves our infrastructure) and no per-lookup cost. The <em>unknown</em> results you see here are cases where the target mail server timed out or blocked the SMTP probe — Hunter may classify some of these as valid using its historical data, which can lead to different results between the two tools.
                    </div>
                  </div>

                  {mailLoading ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: MUTED, fontSize: 13 }}>Loading mail validation data…</div>
                  ) : mailRows.length === 0 ? (
                    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${LINE}`, padding: '32px 24px', color: MUTED, fontSize: 13, textAlign: 'center' }}>
                      No validation data found.
                    </div>
                  ) : (
                    <>
                      {/* Summary cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
                        {[
                          { label: 'Total Checked', value: mailRows.length, color: INK },
                          { label: 'Valid',         value: safe.length,     color: GREEN },
                          { label: 'Risky',         value: risky.length,    color: AMBER },
                          { label: 'Invalid',       value: invalid.length,  color: RED },
                          { label: 'Unknown',       value: unknown.length,  color: MUTED },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${LINE}`, padding: '18px 22px', borderTop: `3px solid ${color}` }}>
                            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED, marginBottom: 6 }}>{label}</div>
                            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color, fontFamily: MONO, lineHeight: 1 }}>{value}</div>
                            {mailRows.length > 0 && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{Math.round(value / mailRows.length * 100)}% of total</div>}
                          </div>
                        ))}
                      </div>

                      {/* Grouped by client table */}
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
                          <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${LINE}`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={th(false)}>Client</th>
                                  <th style={th(true)}>Total</th>
                                  <th style={th(true)}>Valid</th>
                                  <th style={th(true)}>Risky</th>
                                  <th style={th(true)}>Invalid</th>
                                  <th style={th(true)}>Unknown</th>
                                  <th style={th(false)}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {clientRows.map((r, i) => (
                                  <tr key={i}
                                    onMouseEnter={e => e.currentTarget.style.background = '#F6F5FF'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                    <td style={{ ...td, fontWeight: 600, color: A }}>{r.name}</td>
                                    <td style={tdNum}>{r.total}</td>
                                    <td style={tdNum}><Pill n={r.valid}   color={GREEN} /></td>
                                    <td style={tdNum}><Pill n={r.risky}   color={AMBER} /></td>
                                    <td style={tdNum}><Pill n={r.invalid} color={RED}   /></td>
                                    <td style={tdNum}><Pill n={r.unknown} color={MUTED} /></td>
                                    <td style={{ ...td, textAlign: 'right' }}>
                                      <button onClick={() => setMailPopup({ clientName: r.name, rows: r.rows })}
                                        style={{ fontSize: 12, fontWeight: 600, color: A, background: A + '12', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontFamily: SANS }}>
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
                                  <td style={{ ...totTd, background: '#F4F4F8' }}></td>
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
            background: '#fff', borderRadius: 16, width: '90%', maxWidth: 560,
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED, marginBottom: 2 }}>Mail Validation</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{mailPopup.clientName}</div>
              </div>
              <button onClick={() => setMailPopup(null)} style={{ border: 'none', background: '#F3F4F6', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: MUTED, display: 'grid', placeItems: 'center' }}>✕</button>
            </div>
            {/* Scrollable list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={th(false)}>ID</th>
                    <th style={th(false)}>Email</th>
                    <th style={th(false)}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mailPopup.rows.map((r, i) => {
                    const c = r.status === 'safe' ? GREEN : r.status === 'risky' ? AMBER : RED
                    return (
                      <tr key={i} onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ ...tdA, fontFamily: MONO, fontSize: 11, color: MUTED }}>{r.id || '—'}</td>
                        <td style={{ ...tdA, fontSize: 12 }}>{r.email || '—'}</td>
                        <td style={tdA}>
                          <span style={{ display: 'inline-block', padding: '3px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: MONO, background: c + '18', color: c, textTransform: 'capitalize' }}>
                            {r.status || '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 24px', borderTop: `1px solid ${LINE}`, fontSize: 12, color: MUTED, flexShrink: 0 }}>
              {mailPopup.rows.length} emails total
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
