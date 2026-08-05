import { useState, useEffect } from 'react'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'
import { listClientSheets, isConnected, initTokenClient, requestToken } from '../google.js'
import { useAuth } from '../AuthContext.jsx'

export default function CheckSentMail() {
  const { role, googleConnected: connected, googleSyncing, setConnected } = useAuth()
  const [googleReady, setGoogleReady] = useState(false)
  const [sheets,      setSheets]      = useState([])
  const [sheetsLoading, setSheetsLoading] = useState(false)
  const [selected,    setSelected]    = useState('')

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
      .then(list => { setSheets(list); if (list.length) setSelected(list[0].id) })
      .catch(() => {})
      .finally(() => setSheetsLoading(false))
  }, [connected])

  const selectedSheet = sheets.find(s => s.id === selected)

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

        {/* Client selector */}
        {connected && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Select Client</div>
            {sheetsLoading ? (
              <div style={{ fontSize: 13, color: T.muted }}>Loading clients…</div>
            ) : sheets.length === 0 ? (
              <div style={{ fontSize: 13, color: T.muted }}>No client sheets found in your Google Drive folder.</div>
            ) : (
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                style={{ padding: '10px 14px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, background: '#fff', outline: 'none', cursor: 'pointer', minWidth: 320 }}
              >
                {sheets.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Placeholder content area — will be filled in next step */}
        {connected && selectedSheet && (
          <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>{selectedSheet.name}</div>
            <div style={{ fontSize: 13, color: T.muted }}>Sheet ID: <span style={{ fontFamily: T.mono, fontSize: 11 }}>{selectedSheet.id}</span></div>
            <div style={{ fontSize: 13, color: T.faint, marginTop: 20, fontStyle: 'italic' }}>Select a view to continue…</div>
          </div>
        )}

      </div>
    </div>
  )
}
