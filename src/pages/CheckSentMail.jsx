import { useState, useEffect } from 'react'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'
import { listClientSheets, getSheetTabs, getSheetValues, initTokenClient, requestToken } from '../google.js'
import { useAuth } from '../AuthContext.jsx'

const idx = (headers, name) => headers.findIndex(h => h.trim().toLowerCase() === name.toLowerCase())

export default function CheckSentMail() {
  const { role, googleConnected: connected, googleSyncing, setConnected } = useAuth()
  const [googleReady,    setGoogleReady]    = useState(false)
  const [sheets,         setSheets]         = useState([])
  const [sheetsLoading,  setSheetsLoading]  = useState(false)
  const [clientId,       setClientId]       = useState('')
  const [investors,      setInvestors]      = useState([])
  const [invLoading,     setInvLoading]     = useState(false)
  const [invError,       setInvError]       = useState('')
  const [selectedInv,   setSelectedInv]    = useState('')

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

  useEffect(() => {
    if (!connected) return
    setSheetsLoading(true)
    listClientSheets()
      .then(list => { setSheets(list); if (list.length) setClientId(list[0].id) })
      .catch(() => {})
      .finally(() => setSheetsLoading(false))
  }, [connected])

  // Load investors from tracking tab whenever client changes
  useEffect(() => {
    if (!clientId) return
    setInvestors([])
    setSelectedInv('')
    setInvError('')
    setInvLoading(true)
    ;(async () => {
      try {
        const tabs = await getSheetTabs(clientId)
        const trackTab = tabs.find(t => /^tracking$/i.test(t.title))
        if (!trackTab) { setInvError('No Tracking tab found in this sheet.'); return }
        const values = await getSheetValues(clientId, `${trackTab.title}!A1:AF5000`)
        if (!values.length) { setInvError('Tracking tab is empty.'); return }
        const headers = values[0].map(v => String(v).trim().toLowerCase())
        const rows    = values.slice(1).filter(r => r.some(Boolean))
        const firstI  = idx(headers, 'first name')
        const lastI   = idx(headers, 'last name')
        const firmI   = idx(headers, 'company')
        const emailI  = idx(headers, 'email')
        const invIdI  = idx(headers, 'investor_id')
        const parsed  = rows.map((row, i) => ({
          key:   row[invIdI] || String(i),
          first: row[firstI] || '',
          last:  row[lastI]  || '',
          firm:  row[firmI]  || '',
          email: row[emailI] || '',
        })).filter(r => r.first || r.last || r.email)
        setInvestors(parsed)
        if (parsed.length) setSelectedInv(parsed[0].key)
      } catch (e) {
        setInvError(e.message || 'Failed to load investors.')
      } finally {
        setInvLoading(false)
      }
    })()
  }, [clientId])

  const selectedSheet = sheets.find(s => s.id === clientId)
  const selectedInvestor = investors.find(i => i.key === selectedInv)

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
              <button
                disabled={!googleReady}
                onClick={() => { initTokenClient(() => setConnected(true)); requestToken() }}
                style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#C026D3,#F43F5E)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: googleReady ? 'pointer' : 'default', fontFamily: 'inherit' }}
              >
                Connect Google
              </button>
            )}
          </div>
        )}

        {connected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 36 }}>

            {/* Client selector */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Client</div>
              {sheetsLoading
                ? <div style={{ fontSize: 13, color: T.muted }}>Loading clients…</div>
                : sheets.length === 0
                  ? <div style={{ fontSize: 13, color: T.muted }}>No client sheets found.</div>
                  : (
                    <select value={clientId} onChange={e => setClientId(e.target.value)} style={selectStyle}>
                      {sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )
              }
            </div>

            {/* Investor selector */}
            {clientId && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Investor
                  {investors.length > 0 && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>({investors.length})</span>}
                </div>
                {invLoading && <div style={{ fontSize: 13, color: T.muted }}>Loading investors…</div>}
                {invError  && <div style={{ fontSize: 13, color: '#DC2626' }}>{invError}</div>}
                {!invLoading && !invError && investors.length === 0 && (
                  <div style={{ fontSize: 13, color: T.muted }}>No investors found in the Tracking tab.</div>
                )}
                {!invLoading && investors.length > 0 && (
                  <select value={selectedInv} onChange={e => setSelectedInv(e.target.value)} style={{ ...selectStyle, minWidth: 480 }}>
                    {investors.map(inv => (
                      <option key={inv.key} value={inv.key}>
                        {[inv.first, inv.last].filter(Boolean).join(' ')}
                        {inv.firm  ? `  —  ${inv.firm}`  : ''}
                        {inv.email ? `  —  ${inv.email}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

          </div>
        )}

        {/* Selected investor info card */}
        {selectedInvestor && (
          <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {[
                { label: 'First Name', value: selectedInvestor.first || '—' },
                { label: 'Last Name',  value: selectedInvestor.last  || '—' },
                { label: 'Firm',       value: selectedInvestor.firm  || '—' },
                { label: 'Email',      value: selectedInvestor.email || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600, wordBreak: 'break-all' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
