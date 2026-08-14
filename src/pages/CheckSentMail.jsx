import { useState, useEffect, useRef } from 'react'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'
import { listClientSheets, getSheetTabs, getSheetValues, initTokenClient, requestToken, syncTokenFromServer } from '../google.js'
import { useAuth } from '../AuthContext.jsx'
import apiFetch from '../lib/apiFetch.js'

const FONT  = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FS    = { h: 32, sh: 18, c: 14, sc: 12 }
const INK   = '#1a1a1a'
const MUTED = '#626260'
const LINE  = 'rgba(0,0,0,0.08)'
const RED   = '#DC2626'

const NEU_BG     = '#F0F0F0'
const NEU_SURF   = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHADOW = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const NEU_BTN    = '-4px -4px 10px rgba(255,255,255,0.9), 4px 4px 10px rgba(0,0,0,0.10)'

const hIdx = (headers, name) => headers.findIndex(h => h.trim().toLowerCase() === name.toLowerCase())

export default function CheckSentMail() {
  const { role, googleConnected: connected, googleSyncing, setConnected } = useAuth()
  const [googleReady,   setGoogleReady]   = useState(false)
  const [sheets,        setSheets]        = useState([])
  const [sheetsLoading, setSheetsLoading] = useState(false)
  const [sheetsError,   setSheetsError]   = useState('')
  const [clientId,      setClientId]      = useState('')
  const [investors,     setInvestors]     = useState([])
  const [invLoading,    setInvLoading]    = useState(false)
  const [invError,      setInvError]      = useState('')
  const [selectedInv,   setSelectedInv]   = useState(null)
  const [dropOpen,      setDropOpen]      = useState(false)
  const [query,         setQuery]         = useState('')
  const [checking,      setChecking]      = useState(false)
  const [checkResult,   setCheckResult]   = useState(null)
  const [checkError,    setCheckError]    = useState('')
  const [n8nAccounts,   setN8nAccounts]   = useState([])
  const [n8nClientId,   setN8nClientId]   = useState('')
  const dropRef = useRef(null)

  const ACCOUNTS_WEBHOOK  = '/api/n8n?type=accounts'
  const SENT_MAIL_WEBHOOK = '/api/n8n?type=sent-mail'

  useEffect(() => {
    apiFetch(ACCOUNTS_WEBHOOK)
      .then(r => r.json())
      .then(data => {
        const accounts = data?.[0]?.accounts || []
        setN8nAccounts(accounts)
        if (accounts.length) setN8nClientId(accounts[0].clientId)
      })
      .catch(() => {})
  }, [])

  async function handleCheckSentMail() {
    if (!selectedInv || !n8nClientId) return
    setChecking(true)
    setCheckResult(null)
    setCheckError('')
    try {
      const res = await apiFetch(SENT_MAIL_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: n8nClientId, emails: [selectedInv.email] }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { data = text }
      if (!res.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data))
      setCheckResult(data)
    } catch (e) {
      setCheckError(e.message || 'Webhook call failed.')
    } finally {
      setChecking(false)
    }
  }

  // init google
  useEffect(() => {
    window.scrollTo(0, 0)
    const timer = setInterval(() => {
      if (window.google) {
        initTokenClient(() => setConnected(true))
        setGoogleReady(true)
        clearInterval(timer)
      }
    }, 200)
    return () => clearInterval(timer)
  }, [])

  // load sheets — retries when google script loads (googleReady) covers the refresh case
  useEffect(() => {
    if (!connected) return
    setSheetsLoading(true)
    setSheetsError('')
    ;(async () => {
      try {
        await syncTokenFromServer().catch(() => {})
        const list = await listClientSheets()
        setSheets(list)
        if (list.length && !clientId) setClientId(list[0].id)
      } catch (e) {
        setSheetsError(e?.message || 'Failed to load client sheets.')
      } finally {
        setSheetsLoading(false)
      }
    })()
  }, [connected, googleReady])

  // load investors from Investors tab when client changes
  useEffect(() => {
    if (!clientId) return
    setInvestors([])
    setSelectedInv(null)
    setQuery('')
    setInvError('')
    setInvLoading(true)
    ;(async () => {
      try {
        const tabs    = await getSheetTabs(clientId)
        const invTab  = tabs.find(t => /^investors?$/i.test(t.title))
        if (!invTab) { setInvError('No Investors tab found in this sheet.'); return }
        const values  = await getSheetValues(clientId, `${invTab.title}!A1:Z5000`)
        if (!values.length) { setInvError('Investors tab is empty.'); return }
        const headers = values[0].map(v => String(v).trim().toLowerCase())
        const rows    = values.slice(1).filter(r => r.some(Boolean))
        const firstI  = hIdx(headers, 'first name')
        const lastI   = hIdx(headers, 'last name')
        const firmI   = hIdx(headers, 'company')
        const emailI  = hIdx(headers, 'email')
        const idI     = hIdx(headers, 'investor_id')
        const parsed  = rows.map((row, i) => ({
          key:   row[idI] || String(i),
          first: row[firstI] || '',
          last:  row[lastI]  || '',
          firm:  row[firmI]  || '',
          email: row[emailI] || '',
          _headers: headers,
          _row: row,
        })).filter(r => r.first || r.last || r.email)
        setInvestors(parsed)
      } catch (e) {
        setInvError(e.message || 'Failed to load investors.')
      } finally {
        setInvLoading(false)
      }
    })()
  }, [clientId])

  // close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropOpen])

  const filtered = investors.filter(inv => {
    if (!query) return true
    const q = query.toLowerCase()
    return [inv.first, inv.last, inv.firm, inv.email].some(v => v.toLowerCase().includes(q))
  })

  const selectStyle = { padding: '10px 14px', border: `1px solid ${LINE}`, borderRadius: 10, fontSize: FS.c, fontFamily: FONT, color: INK, background: NEU_SURF, outline: 'none', cursor: 'pointer', minWidth: 320, boxShadow: NEU_BTN }

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Check Sent Mail" backTo="/tools" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>

        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: FS.c, fontWeight: 500, color: '#7C3AED', marginBottom: 8 }}>Tools</div>
          <div style={{ fontSize: FS.h, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.2, color: INK, marginBottom: 6 }}>Check Sent Mail</div>
          <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.5 }}>Review sent emails across your outreach campaigns.</div>
        </div>

        {!googleSyncing && !connected && (
          <div style={{ background: NEU_SURF, borderRadius: 16, boxShadow: NEU_SHADOW, padding: '32px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, marginBottom: 8 }}>Google not connected</div>
            <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.5, marginBottom: 20 }}>Connect Google to load your client sheets.</div>
            {role === 'superadmin' && (
              <button disabled={!googleReady} onClick={() => { initTokenClient(() => setConnected(true)); requestToken() }}
                style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: NEU_SURF, color: INK, fontSize: FS.c, fontWeight: 600, cursor: googleReady ? 'pointer' : 'default', fontFamily: FONT, boxShadow: NEU_BTN }}>
                Connect Google
              </button>
            )}
          </div>
        )}

        {connected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 36 }}>

            {/* Client selector */}
            <div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: FS.c, fontWeight: 500, color: INK }}>Client</div>
              </div>
              {sheetsError && <div style={{ fontSize: FS.sc, color: RED, marginBottom: 8 }}>{sheetsError}</div>}
              {!sheetsLoading && sheets.length === 0 && !sheetsError && (
                <div style={{ fontSize: FS.c, color: MUTED }}>No client sheets found.</div>
              )}
              {sheets.length > 0 && (
                <select value={clientId} onChange={e => setClientId(e.target.value)} style={selectStyle}>
                  {sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>

            {/* Investor dropdown */}
            {clientId && (
              <div>
                <div style={{ fontSize: FS.c, fontWeight: 500, color: INK, marginBottom: 8 }}>
                  Investor
                  {investors.length > 0 && <span style={{ fontWeight: 400, marginLeft: 8, color: MUTED }}>({investors.length} total)</span>}
                </div>
                {invLoading && <div style={{ fontSize: FS.c, color: MUTED }}>Loading investors…</div>}
                {invError  && <div style={{ fontSize: FS.c, color: RED }}>{invError}</div>}
                {!invLoading && !invError && investors.length === 0 && (
                  <div style={{ fontSize: FS.c, color: MUTED }}>No investors found in the Investors tab.</div>
                )}

                {!invLoading && investors.length > 0 && (
                  <div ref={dropRef} style={{ position: 'relative', maxWidth: 560 }}>
                    <div onClick={() => setDropOpen(o => !o)} style={{
                      padding: '10px 14px', borderRadius: 10, background: NEU_SURF,
                      boxShadow: dropOpen ? 'inset 3px 3px 8px rgba(0,0,0,0.10), inset -3px -3px 8px rgba(255,255,255,0.80)' : NEU_BTN,
                      cursor: 'pointer', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      transition: 'box-shadow 0.15s', fontFamily: FONT,
                    }}>
                      {selectedInv ? (
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: FS.c, fontWeight: 500, color: INK }}>{[selectedInv.first, selectedInv.last].filter(Boolean).join(' ') || '—'}</div>
                          <div style={{ fontSize: FS.sc, color: MUTED, marginTop: 2 }}>{[selectedInv.firm, selectedInv.email].filter(Boolean).join('  ·  ')}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: FS.c, color: MUTED }}>Select an investor…</span>
                      )}
                      <span style={{ fontSize: FS.sc, color: MUTED, flexShrink: 0 }}>{dropOpen ? '▲' : '▼'}</span>
                    </div>

                    {dropOpen && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                        background: NEU_SURF, borderRadius: 12,
                        boxShadow: NEU_SHADOW, zIndex: 50, overflow: 'hidden',
                      }}>
                        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${LINE}` }}>
                          <input
                            autoFocus value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Search by name, firm or email…"
                            style={{ width: '100%', border: `1px solid ${LINE}`, borderRadius: 8, padding: '6px 10px', fontSize: FS.sc, fontFamily: FONT, color: INK, outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)' }}
                          />
                        </div>
                        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                          {filtered.length === 0 && (
                            <div style={{ padding: '16px', fontSize: FS.sc, color: MUTED, textAlign: 'center' }}>No results</div>
                          )}
                          {filtered.map(inv => (
                            <div key={inv.key} onClick={() => { setSelectedInv(inv); setDropOpen(false); setQuery(''); setCheckResult(null); setCheckError('') }}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${LINE}`, transition: 'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                              onMouseLeave={e => e.currentTarget.style.background = ''}
                            >
                              <div style={{ fontSize: FS.c, fontWeight: 500, color: INK, marginBottom: 2 }}>
                                {[inv.first, inv.last].filter(Boolean).join(' ') || '—'}
                              </div>
                              <div style={{ display: 'flex', gap: 16, fontSize: FS.sc, color: MUTED }}>
                                {inv.firm  && <span>{inv.firm}</span>}
                                {inv.email && <span style={{ fontFamily: T.mono }}>{inv.email}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* n8n account selector */}
            {n8nAccounts.length > 0 && (
              <div>
                <div style={{ fontSize: FS.c, fontWeight: 500, color: INK, marginBottom: 8 }}>Sent From Account</div>
                <select value={n8nClientId} onChange={e => { setN8nClientId(e.target.value); setCheckResult(null); setCheckError('') }} style={selectStyle}>
                  {n8nAccounts.map(a => <option key={a.clientId} value={a.clientId}>{a.credentialName}</option>)}
                </select>
              </div>
            )}

          </div>
        )}

        {/* Selected investor info */}
        {selectedInv && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: NEU_SURF, borderRadius: 16, boxShadow: NEU_SHADOW, padding: '24px 28px' }}>
              <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 18, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Investor Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr)', gap: 20 }}>
                {selectedInv._headers.map((header, i) => {
                  const value = selectedInv._row[i]
                  if (!header) return null
                  return (
                    <div key={i}>
                      <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 4 }}>{header}</div>
                      <div style={{ fontSize: FS.c, color: value ? INK : MUTED, fontWeight: 400, wordBreak: 'break-all', lineHeight: 1.5 }}>{value || '—'}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={handleCheckSentMail}
                disabled={checking}
                style={{
                  padding: '10px 22px', borderRadius: 10, border: 'none',
                  background: NEU_SURF, color: INK,
                  fontSize: FS.c, fontWeight: 600,
                  cursor: checking ? 'default' : 'pointer', fontFamily: FONT,
                  boxShadow: checking ? 'inset 3px 3px 8px rgba(0,0,0,0.10), inset -3px -3px 8px rgba(255,255,255,0.80)' : NEU_BTN,
                  opacity: checking ? 0.6 : 1,
                }}
              >
                {checking ? 'Checking…' : 'Check Sent Mail'}
              </button>
              {checkError && <div style={{ fontSize: FS.sc, color: RED }}>{checkError}</div>}
            </div>

            {checkResult && (() => {
              const messages = Array.isArray(checkResult) ? checkResult : checkResult.messages ? checkResult.messages : checkResult.id ? [checkResult] : []
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED }}>Sent Mails</div>
                    <span style={{ fontSize: FS.sc, fontWeight: 500, background: messages.length > 0 ? '#EDE9FE' : 'rgba(0,0,0,0.06)', color: messages.length > 0 ? '#7C3AED' : MUTED, borderRadius: 99, padding: '2px 10px' }}>
                      {messages.length} found
                    </span>
                  </div>

                  {messages.length === 0 && (
                    <div style={{ background: NEU_SURF, borderRadius: 16, boxShadow: NEU_SHADOW, padding: '24px', textAlign: 'center', fontSize: FS.c, color: MUTED }}>
                      No sent mails found for this investor.
                    </div>
                  )}

                  {messages.map((msg, i) => {
                    const toList = (msg.toRecipients || msg.to || [])
                    const ccList = (msg.ccRecipients || msg.cc || [])
                    const hasHtml = msg.bodyContentType === 'html' || (msg.body && msg.body.trim().startsWith('<'))
                    const cleanBody = msg.body ? msg.body.replace(/<hr[^>]*>[\s\S]*/i, '</body></html>') : ''
                    return (
                      <div key={msg.id || i} style={{ background: NEU_SURF, borderRadius: 16, boxShadow: NEU_SHADOW, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ fontSize: FS.sh, fontWeight: 500, color: INK, lineHeight: 1.4 }}>{msg.subject || '(no subject)'}</div>
                          <div style={{ fontSize: FS.sc, color: MUTED, flexShrink: 0, marginTop: 2 }}>
                            {msg.sentDateTime ? new Date(msg.sentDateTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 24, fontSize: FS.sc, color: MUTED }}>
                          <div><span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</span>&nbsp;&nbsp;{toList.join(', ')}</div>
                          {ccList.length > 0 && <div><span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CC</span>&nbsp;&nbsp;{ccList.join(', ')}</div>}
                        </div>

                        {msg.body && (
                          <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
                            {hasHtml
                              ? <iframe srcDoc={cleanBody} style={{ width: '100%', border: 'none', minHeight: 200 }} scrolling="no"
                                  onLoad={e => { e.target.style.height = e.target.contentDocument.body.scrollHeight + 'px' }} />
                              : <div style={{ fontSize: FS.c, color: INK, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{cleanBody}</div>
                            }
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

      </div>
    </div>
  )
}
