import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import apiFetch from '../lib/apiFetch.js'

const FONT     = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const INK      = '#1a1a1a'
const MUTED    = '#626260'
const NEU_BG   = '#F0F0F0'
const NEU_SURF = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHD  = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const NEU_BTN  = '-4px -4px 10px rgba(255,255,255,0.9), 4px 4px 10px rgba(0,0,0,0.10)'
const GREEN    = '#3ECF8E'
const LINE     = 'rgba(0,0,0,0.08)'

function badge(label, color, bg) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 99,
      background: bg, color,
      letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>{label}</span>
  )
}

function statusBadge(row) {
  const replied = row.reply_timestamp && row.reply_timestamp !== 'N/A' && row.reply_timestamp !== ''
  if (row.escalation)              return badge('Escalated',     '#7c3aed', '#ede9fe')
  if (row.not_interested_outreach) return badge('Rejected',      '#dc2626', '#fee2e2')
  if (replied)                     return badge('Replied',        GREEN,     '#edfdf6')
  if ((row['followup count'] || 0) >= 2) return badge('Followed Up', '#d97706', '#fef3c7')
  if ((row['followup count'] || 0) >= 1) return badge('Contacted',   '#2563eb', '#dbeafe')
  return badge('Not Contacted', MUTED, 'rgba(0,0,0,0.08)')
}

function SentMailPanel({ investor, onClose }) {
  const [accounts,   setAccounts]   = useState([])
  const [accountId,  setAccountId]  = useState('')
  const [checking,   setChecking]   = useState(false)
  const [result,     setResult]     = useState(null)
  const [error,      setError]      = useState('')

  useEffect(() => {
    apiFetch('/api/n8n?type=accounts')
      .then(r => r.json())
      .then(data => {
        const list = data?.[0]?.accounts || []
        setAccounts(list)
        if (list.length) setAccountId(list[0].clientId)
      })
      .catch(() => {})
  }, [])

  async function check() {
    if (!accountId || !investor.Email) return
    setChecking(true)
    setResult(null)
    setError('')
    try {
      const res = await apiFetch('/api/n8n?type=sent-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: accountId, emails: [investor.Email] }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { data = text }
      if (!res.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data))
      setResult(data)
    } catch (e) {
      setError(e.message || 'Webhook call failed.')
    } finally {
      setChecking(false)
    }
  }

  const messages = result
    ? Array.isArray(result) ? result : result.messages ? result.messages : result.id ? [result] : []
    : null

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 540, maxHeight: '85vh',
        background: NEU_BG, zIndex: 101, overflowY: 'auto',
        borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        fontFamily: FONT, padding: '32px 28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Check Sent Mail</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: INK }}>
              {investor['First Name']} {investor['Last Name']}
            </div>
            <div style={{ fontSize: 13, color: '#2563eb', marginTop: 2 }}>{investor.Email || 'No email'}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: MUTED, lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        {/* Account selector */}
        {accounts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: MUTED, marginBottom: 6 }}>Sent From Account</div>
            <select value={accountId} onChange={e => { setAccountId(e.target.value); setResult(null) }} style={{
              width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none',
              background: NEU_SURF, boxShadow: NEU_BTN,
              fontSize: 13, fontFamily: FONT, color: INK, outline: 'none',
            }}>
              {accounts.map(a => <option key={a.clientId} value={a.clientId}>{a.credentialName}</option>)}
            </select>
          </div>
        )}

        {!investor.Email && (
          <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 16 }}>This investor has no email address.</div>
        )}

        <button
          onClick={check}
          disabled={checking || !investor.Email || !accountId}
          style={{
            width: '100%', padding: '11px', borderRadius: 10, border: 'none',
            background: NEU_SURF, color: INK, fontSize: 14, fontWeight: 600,
            cursor: checking || !investor.Email ? 'default' : 'pointer',
            fontFamily: FONT, marginBottom: 24,
            boxShadow: checking ? 'inset 3px 3px 8px rgba(0,0,0,0.10), inset -3px -3px 8px rgba(255,255,255,0.80)' : NEU_BTN,
            opacity: (!investor.Email || !accountId) ? 0.5 : 1,
          }}
        >
          {checking ? 'Checking…' : 'Check Sent Mail'}
        </button>

        {error && <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

        {messages !== null && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sent Mails</div>
              <span style={{
                fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '2px 10px',
                background: messages.length > 0 ? '#EDE9FE' : 'rgba(0,0,0,0.06)',
                color: messages.length > 0 ? '#7C3AED' : MUTED,
              }}>{messages.length} found</span>
            </div>

            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: MUTED, fontSize: 13, padding: 24 }}>
                No sent mails found for this investor.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((msg, i) => {
                const toList  = msg.toRecipients || msg.to || []
                const ccList  = msg.ccRecipients || msg.cc || []
                const hasHtml = msg.bodyContentType === 'html' || (msg.body && msg.body.trim().startsWith('<'))
                const cleanBody = msg.body ? msg.body.replace(/<hr[^>]*>[\s\S]*/i, '</body></html>') : ''
                return (
                  <div key={msg.id || i} style={{
                    background: NEU_SURF, borderRadius: 14, boxShadow: NEU_SHD,
                    padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: INK, lineHeight: 1.4 }}>{msg.subject || '(no subject)'}</div>
                      <div style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>
                        {msg.sentDateTime ? new Date(msg.sentDateTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: MUTED }}>
                      <b>To</b> {toList.join(', ')}
                      {ccList.length > 0 && <>&nbsp;&nbsp;<b>CC</b> {ccList.join(', ')}</>}
                    </div>
                    {msg.body && (
                      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
                        {hasHtml
                          ? <iframe srcDoc={cleanBody} style={{ width: '100%', border: 'none', minHeight: 160 }} scrolling="no"
                              onLoad={e => { e.target.style.height = e.target.contentDocument.body.scrollHeight + 'px' }} />
                          : <div style={{ fontSize: 13, color: INK, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{cleanBody}</div>
                        }
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const FUNNEL_STAGES = [
  { key: 'total',       label: 'Total',           sub: 'In database' },
  { key: 'contacted',   label: 'Contacted',        sub: 'Initial mail sent' },
  { key: 'in_followup', label: 'Followups',        sub: '≥1 followup sent' },
  { key: 'replied',     label: 'Replied',          sub: 'Replied to mail' },
  { key: 'mid_convo',   label: 'Mid Conversation', sub: 'We replied back' },
]

// Tufte thesis: data-ink ratio. Rams thesis: less but better.
// Van Schneider: numbers are the hero, shape is the vessel.
// Single accent color, opacity encodes depth, whitespace is structure.
function Funnel({ data }) {
  const total   = data.total || 1
  const vals    = FUNNEL_STAGES.map(s => data[s.key] || 0)
  const SEG_H   = 64
  const GAP     = 3
  const W       = 500
  const MIN_F   = 0.28
  const ACCENT  = GREEN  // one color, the app's voice

  const fracs   = vals.map(v => Math.max(MIN_F, v / total))

  // Continuous trapezoid: bottom of stage i = top of stage i+1
  const segs = FUNNEL_STAGES.map((_, i) => {
    const topF = fracs[i]
    const botF = i < fracs.length - 1 ? fracs[i + 1] : fracs[i] * 0.78
    const y    = i * (SEG_H + GAP)
    const tl   = ((1 - topF) / 2) * W
    const tr   = W - tl
    const bl   = ((1 - botF) / 2) * W
    const br   = W - bl
    // opacity darkens as funnel narrows — more exclusive = richer
    const opacity = 0.52 + (i / (FUNNEL_STAGES.length - 1)) * 0.38
    return { tl, tr, bl, br, y, opacity }
  })

  const svgH = FUNNEL_STAGES.length * (SEG_H + GAP)

  return (
    <div style={{
      background: NEU_SURF, borderRadius: 16, boxShadow: NEU_SHD,
      padding: '28px 32px', marginBottom: 24, fontFamily: FONT,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 28 }}>
        Outreach Funnel
      </div>

      {/* Master grid: 3 columns × 5 rows (one row per funnel stage) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${W}px 1fr 160px`,
        gridTemplateRows: `repeat(5, ${SEG_H + GAP}px)`,
        columnGap: 40,
      }}>

        {/* Col 1: SVG funnel — spans all 5 rows */}
        <svg
          width={W} height={svgH}
          style={{ gridColumn: '1', gridRow: '1 / 6', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="fshimmer" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.22)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          {segs.map(({ tl, tr, bl, br, y, opacity }, i) => {
            const stage = FUNNEL_STAGES[i]
            const val   = vals[i]
            const cx    = W / 2
            const pts   = `${tl},${y} ${tr},${y} ${br},${y+SEG_H} ${bl},${y+SEG_H}`
            return (
              <g key={stage.key}>
                <polygon points={pts} fill={ACCENT} fillOpacity={opacity} />
                <polygon points={`${tl},${y} ${tr},${y} ${tr+4},${y+18} ${tl-4},${y+18}`} fill="url(#fshimmer)" />
                <line x1={tl} y1={y} x2={tr} y2={y} stroke={ACCENT} strokeOpacity={opacity + 0.2} strokeWidth="1.5" />
                <text x={cx} y={y + SEG_H * 0.4} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 26, fontWeight: 800, fill: '#fff', fontFamily: FONT, letterSpacing: '-1px' }}>
                  {val}
                </text>
                <text x={cx} y={y + SEG_H * 0.72} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 10, fontWeight: 600, fill: 'rgba(255,255,255,0.85)', fontFamily: FONT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {stage.label}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Col 2: one stat row per grid row — perfectly aligned to funnel segments */}
        {FUNNEL_STAGES.map((stage, i) => {
          const val         = vals[i]
          const pctTotal    = Math.round((val / total) * 100)
          const prev        = i > 0 ? (vals[i - 1] || 1) : null
          const conv        = prev !== null ? Math.round((val / prev) * 100) : null
          const prevVal     = i > 0 ? vals[i - 1] : null
          const opportunity = prevVal !== null ? prevVal - val : null
          let insight = null
          if (conv !== null) {
            if (val > 0)             insight = { text: `${conv}% conversion rate`, color: GREEN }
            else if (opportunity > 0) insight = { text: `${opportunity} ready to engage`, color: '#f59e0b' }
          }
          return (
            <div key={stage.key} style={{
              gridColumn: '2', gridRow: `${i + 1}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>{stage.sub}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{pctTotal}%</span>
                <span style={{ fontSize: 10, color: MUTED }}>of total</span>
              </div>
              {insight && (
                <div style={{ fontSize: 10, fontWeight: 600, color: insight.color, marginTop: 2 }}>{insight.text}</div>
              )}
            </div>
          )
        })}

        {/* Col 3: 2 weekly cards — each spans ~2.5 rows, centred in their half */}
        <div style={{
          gridColumn: '3', gridRow: '1 / 3',
          display: 'flex', alignItems: 'center',
        }}>
          <div style={{ background: NEU_SURF, borderRadius: 12, boxShadow: NEU_SHD, padding: '14px 16px', width: '100%' }}>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.06em', marginBottom: 6 }}>This week</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: MUTED, letterSpacing: '-0.5px', lineHeight: 1 }}>{data.outreach_this_week}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4, opacity: 0.7 }}>Outreach sent</div>
          </div>
        </div>
        <div style={{
          gridColumn: '3', gridRow: '4 / 6',
          display: 'flex', alignItems: 'center',
        }}>
          <div style={{ background: NEU_SURF, borderRadius: 12, boxShadow: NEU_SHD, padding: '14px 16px', width: '100%' }}>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.06em', marginBottom: 6 }}>This week</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: MUTED, letterSpacing: '-0.5px', lineHeight: 1 }}>{data.followups_this_week}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4, opacity: 0.7 }}>Followups sent</div>
          </div>
        </div>

      </div>

      {data.rejected > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#fee2e2', color: '#dc2626' }}>
            {data.rejected} Rejected
          </span>
          <span style={{ fontSize: 11, color: MUTED }}>not interested</span>
        </div>
      )}
    </div>
  )
}

export default function ClientDetail() {
  const { client }            = useParams()
  const navigate              = useNavigate()
  const [rows, setRows]       = useState(null)
  const [funnel, setFunnel]   = useState(null)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')
  const [panel, setPanel]     = useState(null)

  const label = client.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  useEffect(() => {
    apiFetch(`/api/client-analytics?client=${encodeURIComponent(client)}`)
      .then(async r => {
        const text = await r.text()
        if (!r.ok) { setError(`HTTP ${r.status}: ${text}`); return }
        try {
          const d = JSON.parse(text)
          setRows(d.investors)
          setFunnel(d.funnel)
        }
        catch { setError(`Parse error: ${text}`) }
      })
      .catch(e => setError(`Fetch error: ${e.message}`))
  }, [client])

  const filtered = rows?.filter(r => {
    const q = search.toLowerCase()
    return (
      (r['First Name'] || '').toLowerCase().includes(q) ||
      (r['Last Name']  || '').toLowerCase().includes(q) ||
      (r['Email']      || '').toLowerCase().includes(q) ||
      (r['Company']    || '').toLowerCase().includes(q)
    )
  })

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Client Analytics" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button onClick={() => navigate('/client-analytics')} style={{
            background: NEU_SURF, border: 'none', borderRadius: 10,
            boxShadow: NEU_SHD, padding: '8px 16px', cursor: 'pointer',
            fontSize: 13, color: MUTED, fontFamily: FONT,
          }}>← Back</button>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CLIENT</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: INK, letterSpacing: '-0.3px' }}>{label}</div>
          </div>
          {rows && (
            <div style={{ marginLeft: 'auto', fontSize: 13, color: MUTED }}>
              {rows.length} investors
            </div>
          )}
        </div>

        {funnel && <Funnel data={funnel} />}

        {/* Search */}
        {rows && (
          <input
            placeholder="Search by name, email, company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 16px', borderRadius: 10, border: 'none',
              background: NEU_SURF, boxShadow: NEU_SHD,
              fontSize: 14, fontFamily: FONT, color: INK,
              marginBottom: 20, outline: 'none',
            }}
          />
        )}

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 10, padding: '12px 20px', fontSize: 14 }}>
            {error}
          </div>
        )}

        {!rows && !error && <div style={{ color: MUTED, fontSize: 14 }}>Loading…</div>}

        {/* Table */}
        {filtered && (
          <div style={{ background: NEU_SURF, borderRadius: 16, boxShadow: NEU_SHD, overflow: 'hidden' }}>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(5 * 48px + 45px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: FONT }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                  {['Name', 'Email', 'Company', 'Title', 'Fund Focus', 'Followups', 'Status', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 600, color: MUTED,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      position: 'sticky', top: 0, zIndex: 2,
                      background: '#efefef',
                      borderBottom: '1px solid rgba(0,0,0,0.08)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row.investor_id || i} style={{
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                  }}>
                    <td style={{ padding: '11px 16px', fontWeight: 600, color: INK, whiteSpace: 'nowrap' }}>
                      {row['First Name']} {row['Last Name']}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {row['Email'] ? (
                        <a href={`mailto:${row['Email']}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                          {row['Email']}
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', color: INK }}>{row['Company'] || '—'}</td>
                    <td style={{ padding: '11px 16px', color: MUTED, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row['Title'] || '—'}
                    </td>
                    <td style={{ padding: '11px 16px', color: MUTED }}>{row['Fund focus'] || '—'}</td>
                    <td style={{ padding: '11px 16px', color: INK, textAlign: 'center' }}>
                      {row['followup count'] || 0}
                    </td>
                    <td style={{ padding: '11px 16px' }}>{statusBadge(row)}</td>
                    <td style={{ padding: '8px 16px' }}>
                      <button
                        onClick={() => setPanel(row)}
                        style={{
                          width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                          background: NEU_SURF, boxShadow: NEU_BTN,
                          fontSize: 12, fontWeight: 600, color: INK,
                          cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap',
                          letterSpacing: '0.02em',
                        }}
                      >
                        Check Mail
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: MUTED }}>No results</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {panel && <SentMailPanel investor={panel} onClose={() => setPanel(null)} />}
    </div>
  )
}
