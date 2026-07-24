import { useState, useEffect } from 'react'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'
import { isConnected, listClientSheets, getSheetTabs, getSheetValues } from '../google.js'

const RED    = '#DC2626'
const AMBER  = '#D97706'
const INK    = T.text
const MUTED  = T.muted
const LINE   = T.border
const MONO   = T.mono
const FONT   = T.sans

const asBool = v => ['1','true','yes','pending','escalated','active'].includes(String(v||'').trim().toLowerCase())

export default function Alerts() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)
  const connected = isConnected()

  useEffect(() => {
    if (!connected) return
    setLoading(true)
    listClientSheets().then(sheets =>
      Promise.all(sheets.map(async sheet => {
        try {
          const tabs = await getSheetTabs(sheet.id)
          const trackTab = tabs.find(t => /^tracking$/i.test(t.title))
          if (!trackTab) return []
          const values = await getSheetValues(sheet.id, `${trackTab.title}!A1:AF5000`)
          if (!values.length) return []

          const headers = values[0].map(v => String(v).trim().toLowerCase())
          const rows    = values.slice(1).filter(r => r.some(Boolean))
          const fIdx    = pat => headers.findIndex(h => pat.test(h))

          const invIdI      = fIdx(/inv.?id|investor.?id/i)
          const emailI      = fIdx(/email/i)
          const countI      = fIdx(/follow.?up.?count/i)
          const sentAtI     = fIdx(/follow.?up.?timestamps?/i)
          const escalationI = fIdx(/^escalation$/i)
          const adminNotifI = fIdx(/admin.?noti/i)
          const stopOutI    = fIdx(/not.?interested.?outreach/i)
          const stopReplyI  = fIdx(/not.?interested.?reply/i)
          const replyAtI    = fIdx(/reply.?timestamps?/i)

          const now = new Date()
          const alerts = []

          rows.forEach(row => {
            const id      = String(row[invIdI] || '').toUpperCase()
            const email   = String(row[emailI] || '').trim()
            const count   = Math.max(0, Number(row[countI]) || 0)
            const stopped = asBool(row[stopOutI]) || asBool(row[stopReplyI])
            const escVal  = String(row[escalationI] || '').trim().toLowerCase()
            const adminVal= String(row[adminNotifI] || '').trim().toLowerCase()
            const escalated = asBool(escVal) || asBool(adminVal) || escVal === 'escalated'
            const replyVal = String(row[replyAtI] ?? '').trim()
            const replied  = replyVal !== '' && replyVal.toUpperCase() !== 'N/A' && replyVal.toUpperCase() !== 'FALSE'

            // Invalid email
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              alerts.push({ type: 'invalid_email', label: 'Invalid Email', color: RED, client: sheet.name, id, detail: email })
            }

            // Escalation
            if (escalated && !stopped) {
              alerts.push({ type: 'escalation', label: 'Escalation', color: RED, client: sheet.name, id, detail: escVal || adminVal })
            }

            // Overdue followup (sent but no reply, count < 4, last send > 7 days ago)
            if (count > 0 && count < 4 && !replied && !stopped) {
              const sentDates = String(row[sentAtI] || '').replace(/^\[/,'').replace(/\]$/,'').split(',')
                .map(s => { const d = new Date(s.trim()); return isNaN(d) ? null : d }).filter(Boolean)
              const lastSent = sentDates.at(-1)
              const delays   = [0, 2, 3, 5]
              if (lastSent) {
                const dueDate = new Date(lastSent.getTime() + delays[count] * 86400000)
                if (dueDate < now) {
                  const daysOverdue = Math.floor((now - dueDate) / 86400000)
                  alerts.push({ type: 'overdue', label: 'Overdue Followup', color: AMBER, client: sheet.name, id, detail: `${daysOverdue}d overdue` })
                }
              }
            }
          })

          return alerts
        } catch {
          return []
        }
      }))
    ).then(results => {
      setItems(results.flat())
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = []
    acc[item.type].push(item)
    return acc
  }, {})

  const sections = [
    { key: 'escalation',    title: 'Escalations',       color: RED   },
    { key: 'invalid_email', title: 'Invalid Emails',    color: RED   },
    { key: 'overdue',       title: 'Overdue Followups', color: AMBER },
  ]

  const tdS = { padding: '12px 16px', fontSize: 13, color: INK, borderBottom: `1px solid ${LINE}` }
  const thS = { padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED, borderBottom: `2px solid ${LINE}`, textAlign: 'left' }

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT }}>
      <Nav title="Needs Attention" backTo="/hub" />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 34px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: RED, marginBottom: 6 }}>ATTENTION</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px', color: INK }}>Items needing action</h1>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Invalid emails, escalations, and overdue followups across all clients.</p>
        </div>

        {!connected && (
          <div style={{ padding: '48px 0', color: MUTED, fontSize: 13 }}>Connect Google in Analytics to load alerts.</div>
        )}

        {connected && loading && (
          <div style={{ padding: '48px 0', color: MUTED, fontSize: 13 }}>Scanning all client sheets…</div>
        )}

        {connected && !loading && items.length === 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 4 }}>All clear</div>
            <div style={{ fontSize: 13, color: MUTED }}>No escalations, invalid emails, or overdue followups found.</div>
          </div>
        )}

        {connected && !loading && sections.map(sec => {
          const rows = grouped[sec.key]
          if (!rows?.length) return null
          return (
            <div key={sec.key} style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: sec.color }}>{sec.title}</span>
                <span style={{ background: sec.color + '18', color: sec.color, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontFamily: MONO }}>{rows.length}</span>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#FAFAFA' }}>
                      <th style={thS}>Client</th>
                      <th style={thS}>Investor ID</th>
                      <th style={thS}>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td style={tdS}><span style={{ fontWeight: 600, color: T.accent }}>{r.client}</span></td>
                        <td style={{ ...tdS, fontFamily: MONO, fontSize: 12 }}>{r.id || '—'}</td>
                        <td style={{ ...tdS, color: sec.color }}>{r.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
