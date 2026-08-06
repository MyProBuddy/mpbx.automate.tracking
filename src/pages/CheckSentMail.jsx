import { useState, useEffect, useRef } from 'react'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'
import { listClientSheets, getSheetTabs, getSheetValues, initTokenClient, requestToken, syncTokenFromServer } from '../google.js'
import { useAuth } from '../AuthContext.jsx'

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

  const ACCOUNTS_WEBHOOK  = 'https://n8n-appservice-prod-a7awa4ghbxf6ezfk.centralindia-01.azurewebsites.net/webhook/e5672bfb-6a0e-4bea-9c21-75076cab0046'
  const SENT_MAIL_WEBHOOK = 'https://n8n-appservice-prod-a7awa4ghbxf6ezfk.centralindia-01.azurewebsites.net/webhook/909fa62b-bd15-4624-ad1a-496138b157d8'

  useEffect(() => {
    fetch(ACCOUNTS_WEBHOOK)
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
      const res = await fetch(SENT_MAIL_WEBHOOK, {
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

  const selectStyle = { padding: '10px 14px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, background: '#fff', outline: 'none', cursor: 'pointer', minWidth: 320 }

  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans }}>
      <Nav title="Check Sent Mail" backTo="/tools" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>

        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 8 }}>Tools</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: T.text, marginBottom: 6 }}>Check Sent Mail</div>
          <div style={{ fontSize: 13, color: T.muted }}>Review sent emails across your outreach campaigns.</div>
        </div>

        {/* Google connect */}
        {!googleSyncing && !connected && (
          <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '32px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>Google not connected</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Connect Google to load your client sheets.</div>
            {role === 'superadmin' && (
              <button disabled={!googleReady} onClick={() => { initTokenClient(() => setConnected(true)); requestToken() }}
                style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#C026D3,#F43F5E)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: googleReady ? 'pointer' : 'default', fontFamily: 'inherit' }}>
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
                <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</div>
              </div>
              {sheetsError && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{sheetsError}</div>}
              {!sheetsLoading && sheets.length === 0 && !sheetsError && (
                <div style={{ fontSize: 13, color: T.muted }}>No client sheets found.</div>
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
                <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Investor
                  {investors.length > 0 && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8, fontSize: 11, color: T.faint }}>({investors.length} total)</span>}
                </div>
                {invLoading && <div style={{ fontSize: 13, color: T.muted }}>Loading investors…</div>}
                {invError  && <div style={{ fontSize: 13, color: '#DC2626' }}>{invError}</div>}
                {!invLoading && !invError && investors.length === 0 && (
                  <div style={{ fontSize: 13, color: T.muted }}>No investors found in the Investors tab.</div>
                )}

                {!invLoading && investors.length > 0 && (
                  <div ref={dropRef} style={{ position: 'relative', maxWidth: 560 }}>
                    {/* Trigger */}
                    <div onClick={() => setDropOpen(o => !o)} style={{
                      padding: '10px 14px', border: `1.5px solid ${dropOpen ? '#7C3AED' : T.border}`,
                      borderRadius: 8, background: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      transition: 'border-color 0.15s',
                    }}>
                      {selectedInv ? (
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{[selectedInv.first, selectedInv.last].filter(Boolean).join(' ') || '—'}</div>
                          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{[selectedInv.firm, selectedInv.email].filter(Boolean).join('  ·  ')}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: T.faint }}>Select an investor…</span>
                      )}
                      <span style={{ fontSize: 12, color: T.faint, flexShrink: 0 }}>{dropOpen ? '▲' : '▼'}</span>
                    </div>

                    {/* Dropdown panel */}
                    {dropOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                        background: '#fff', border: `1.5px solid ${T.border}`, borderRadius: 10,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden',
                      }}>
                        {/* Search */}
                        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}` }}>
                          <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search by name, firm or email…"
                            style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', color: T.text, outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                        {/* List */}
                        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                          {filtered.length === 0 && (
                            <div style={{ padding: '16px', fontSize: 12, color: T.muted, textAlign: 'center' }}>No results</div>
                          )}
                          {filtered.map(inv => (
                            <div key={inv.key} onClick={() => { setSelectedInv(inv); setDropOpen(false); setQuery(''); setCheckResult(null); setCheckError('') }}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${T.border}`, transition: 'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background = T.bg}
                              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                            >
                              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 3 }}>
                                {[inv.first, inv.last].filter(Boolean).join(' ') || '—'}
                              </div>
                              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: T.muted }}>
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
                <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Sent From Account</div>
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
            <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '24px 28px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 18 }}>Investor Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr)', gap: 20 }}>
                {selectedInv._headers.map((header, i) => {
                  const value = selectedInv._row[i]
                  if (!header) return null
                  return (
                    <div key={i}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{header}</div>
                      <div style={{ fontSize: 13, color: value ? T.text : T.faint, fontWeight: value ? 600 : 400, wordBreak: 'break-all' }}>{value || '—'}</div>
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
                  padding: '11px 28px', borderRadius: 8, border: 'none',
                  background: checking ? T.border : 'linear-gradient(90deg,#7C3AED,#C026D3)',
                  color: checking ? T.muted : '#fff', fontSize: 13, fontWeight: 700,
                  cursor: checking ? 'default' : 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                {checking ? 'Checking…' : 'Check Sent Mail'}
              </button>
              {checkError && <div style={{ fontSize: 12, color: '#DC2626' }}>{checkError}</div>}
            </div>

            {checkResult && (() => {
              const messages = Array.isArray(checkResult) ? checkResult : checkResult.messages ? checkResult.messages : checkResult.id ? [checkResult] : []
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Sent Mails</div>
                    <span style={{ fontSize: 11, fontWeight: 700, background: messages.length > 0 ? '#EDE9FE' : T.bg, color: messages.length > 0 ? '#7C3AED' : T.muted, borderRadius: 99, padding: '2px 10px' }}>
                      {messages.length} found
                    </span>
                  </div>

                  {messages.length === 0 && (
                    <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '24px', textAlign: 'center', fontSize: 13, color: T.muted }}>
                      No sent mails found for this investor.
                    </div>
                  )}

                  {messages.map((msg, i) => {
                    const toList = (msg.toRecipients || msg.to || [])
                    const ccList = (msg.ccRecipients || msg.cc || [])
                    const hasHtml = msg.bodyContentType === 'html' || (msg.body && msg.body.trim().startsWith('<'))
                    const cleanBody = msg.body ? msg.body.replace(/<hr[^>]*>[\s\S]*/i, '</body></html>') : ''
                    return (
                      <div key={msg.id || i} style={{ background: '#fff', border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.4 }}>{msg.subject || '(no subject)'}</div>
                          <div style={{ fontSize: 11, color: T.muted, flexShrink: 0, marginTop: 2 }}>
                            {msg.sentDateTime ? new Date(msg.sentDateTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 24, fontSize: 11, color: T.muted }}>
                          <div><span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</span>&nbsp;&nbsp;{toList.join(', ')}</div>
                          {ccList.length > 0 && <div><span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CC</span>&nbsp;&nbsp;{ccList.join(', ')}</div>}
                        </div>

                        {msg.body && (
                          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                            {hasHtml
                              ? <iframe srcDoc={cleanBody} style={{ width: '100%', border: 'none', minHeight: 200 }} scrolling="no"
                                  onLoad={e => { e.target.style.height = e.target.contentDocument.body.scrollHeight + 'px' }} />
                              : <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{cleanBody}</div>
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
