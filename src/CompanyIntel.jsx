import { useState, useEffect } from 'react'
import {
  initTokenClient, requestToken, revokeToken, isConnected,
  listClientSheets, getSheetTabs, getSheetValues, appendSheetValues,
} from './google.js'
import { useAuth } from './AuthContext.jsx'
import Nav from './components/Nav.jsx'
import { T } from './constants.js'

const amber = '#D97706'
const amberLight = '#FFFBEB'

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: T.sans }}>{children}</div>
}

function TextInput({ value, onChange, placeholder, disabled, mono }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '11px 14px',
        background: disabled ? T.bg : focused ? T.surface : T.bg,
        border: `1.5px solid ${focused && !disabled ? T.accent : T.border}`,
        borderRadius: 8, fontSize: mono ? 12 : 14, fontFamily: mono ? T.mono : T.sans,
        color: disabled ? T.faint : T.text,
        outline: 'none', transition: 'border-color 0.15s, background 0.15s',
        letterSpacing: '-0.01em', boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'text',
      }}
    />
  )
}

function TextArea({ value, onChange, placeholder, disabled, rows = 4 }) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '11px 14px',
        background: disabled ? T.bg : focused ? T.surface : T.bg,
        border: `1.5px solid ${focused && !disabled ? T.accent : T.border}`,
        borderRadius: 8, fontSize: 14, fontFamily: T.sans,
        color: disabled ? T.faint : T.text,
        outline: 'none', transition: 'border-color 0.15s, background 0.15s',
        letterSpacing: '-0.01em', boxSizing: 'border-box',
        resize: 'vertical', lineHeight: 1.6,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
    />
  )
}

function Btn({ onClick, disabled, children, variant = 'primary', small }) {
  const styles = {
    primary: { background: T.accent, color: '#fff', border: 'none' },
    ghost:   { background: 'transparent', color: T.text, border: `1.5px solid ${T.border}` },
    danger:  { background: T.red, color: '#fff', border: 'none' },
  }
  const s = styles[variant] || styles.primary
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '7px 16px' : '11px 22px',
      ...s,
      borderRadius: 8, fontSize: small ? 12 : 14, fontWeight: 600,
      fontFamily: T.sans, letterSpacing: '-0.01em',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'opacity 0.15s', whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}

function Card({ children, style }) {
  return <div style={{ background: T.surface, borderRadius: 14, border: `1.5px solid ${T.border}`, padding: 28, ...style }}>{children}</div>
}

function Badge({ children, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, background: color + '18', color, borderRadius: 6, padding: '3px 10px', fontFamily: T.sans }}>{children}</span>
}

function utcTimestamp() {
  const d = new Date()
  const offsetMs = -4 * 60 * 60 * 1000
  const local = new Date(d.getTime() + offsetMs)
  return local.toISOString().replace('Z', '-04:00')
}

export default function CompanyIntel() {
  const { role, googleConnected: connected, googleSyncing, setConnected } = useAuth()
  const [googleReady, setGoogleReady] = useState(false)

  const [sheets, setSheets]           = useState([])
  const [sheetsLoading, setSheetsLoading] = useState(false)

  const [selectedSheetId, setSelectedSheetId] = useState('')
  const [selectedSheetName, setSelectedSheetName] = useState('')

  // updates tab data
  const [updateTabName, setUpdateTabName] = useState('Updates')
  const [rows, setRows]                   = useState([])   // existing rows [[...], ...]
  const [headers, setHeaders]             = useState([])
  const [loading, setLoading]             = useState(false)
  const [loadError, setLoadError]         = useState('')

  // add-update form
  const [update, setUpdate]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [saveOk, setSaveOk]     = useState(false)
  const [saveErr, setSaveErr]   = useState('')

  useEffect(() => {
    setConnected(isConnected())
    const iv = setInterval(() => {
      if (window.google) {
        initTokenClient(() => setConnected(true))
        setGoogleReady(true)
        clearInterval(iv)
      }
    }, 200)
    return () => clearInterval(iv)
  }, [])

  const fetchSheets = async () => {
    setSheetsLoading(true)
    try {
      const list = await listClientSheets()
      setSheets(list)
    } catch (e) {
      // silently keep empty
    } finally {
      setSheetsLoading(false)
    }
  }

  const connect = () => {
    initTokenClient((token) => { setConnected(true); fetchSheets() })
    requestToken()
  }
  const disconnect = () => { revokeToken(); setConnected(false) }

  useEffect(() => {
    if (connected) fetchSheets()
  }, [connected])

  const loadSheet = async (sheetId) => {
    if (!sheetId) return
    setLoading(true); setLoadError(''); setRows([]); setHeaders([])
    try {
      const tabs = await getSheetTabs(sheetId)
      const tab = tabs.find(t => /update/i.test(t.title)) || tabs.find(t => /intel/i.test(t.title))
      if (!tab) {
        setLoadError('No "Updates" tab found in this sheet. Create a tab named "Updates" with columns: Company, Date, Update.')
        setLoading(false)
        return
      }
      setUpdateTabName(tab.title)
      const values = await getSheetValues(sheetId, `${tab.title}!A1:Z1000`)
      const hdrs = values[0] || ['Company', 'Date', 'Update']
      const dataRows = values.slice(1).filter(r => r.some(c => c))
      setHeaders(hdrs)
      setRows(dataRows)
    } catch (e) {
      setLoadError(e.message === 'TOKEN_EXPIRED' ? 'Google session expired. Please reconnect.' : e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSheetChange = (id) => {
    setSelectedSheetId(id)
    const found = sheets.find(s => s.id === id)
    setSelectedSheetName(found?.name || '')
    setRows([]); setHeaders([]); setLoadError('')
    if (id) loadSheet(id)
  }

  const handleSave = async () => {
    if (!update.trim() || !selectedSheetId) return
    setSaving(true); setSaveErr(''); setSaveOk(false)
    try {
      const newRow = [update.trim(), utcTimestamp()]
      await appendSheetValues(selectedSheetId, `${updateTabName}!A:C`, [newRow])
      setRows(prev => [...prev, newRow])
      setUpdate('')
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch (e) {
      setSaveErr(e.message === 'TOKEN_EXPIRED' ? 'Google session expired. Please reconnect.' : e.message)
    } finally {
      setSaving(false)
    }
  }

  // resolve column indices for display
  const colIdx = (pattern) => headers.findIndex(h => pattern.test(h))
  const updateCol = colIdx(/update|note|intel/i)
  const dateCol   = colIdx(/date|time/i)

  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans, color: T.text }}>

      <Nav title="Company Intel" backTo="/hub" extra={
        connected
          ? <><Badge color={T.green}>Google Connected</Badge>{role === 'superadmin' && <Btn onClick={disconnect} variant="ghost" small>Disconnect</Btn>}</>
          : googleSyncing
            ? null
            : role === 'superadmin'
              ? <Btn onClick={connect} disabled={!googleReady} small>Connect Google</Btn>
              : <Badge color={T.red}>Google not connected — contact Super Admin</Badge>
      } />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 48px 80px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 8 }}>Intel</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: T.text, marginBottom: 6 }}>Company Intel</div>
          <div style={{ fontSize: 13, color: T.muted, maxWidth: 520, lineHeight: 1.6 }}>
            Log company updates — funding rounds, leadership changes, news — so the AI references them during followups to write sharper, more relevant pitch emails.
          </div>
        </div>

        {/* Sheet selector */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: T.text }}>Select client sheet</div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
            Choose the investor sheet that has an <strong style={{ color: T.text }}>Updates</strong> tab. The AI reads this tab when composing followup emails.
          </div>

          {!connected && (
            <div style={{ fontSize: 13, color: amber, background: amberLight, padding: '10px 14px', borderRadius: 8, marginBottom: 16, border: `1px solid ${amber}30` }}>
              Connect Google to load your client sheets.
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select
              value={selectedSheetId}
              onChange={e => handleSheetChange(e.target.value)}
              disabled={!connected}
              style={{
                flex: 1, maxWidth: 480, padding: '11px 14px',
                border: `1.5px solid ${T.border}`, borderRadius: 8,
                fontSize: 14, fontFamily: T.sans,
                color: selectedSheetId ? T.text : T.muted,
                background: T.surface, outline: 'none',
                cursor: connected ? 'pointer' : 'not-allowed',
                opacity: connected ? 1 : 0.5,
              }}
            >
              <option value="">{sheetsLoading ? 'Loading sheets…' : 'Select a client sheet…'}</option>
              {sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSheetId && (
              <Btn onClick={() => loadSheet(selectedSheetId)} disabled={loading} variant="ghost" small>
                {loading ? 'Loading…' : '↻ Reload'}
              </Btn>
            )}
          </div>

          {loadError && (
            <div style={{ fontSize: 13, color: T.red, background: T.redLight, padding: '10px 14px', borderRadius: 8, marginTop: 14, lineHeight: 1.5 }}>
              {loadError}
            </div>
          )}
        </Card>

        {selectedSheetId && !loadError && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

            {/* Add update form */}
            <Card>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: T.text }}>Add update</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 24, lineHeight: 1.55 }}>
                Record a company signal — news, funding, leadership change, product launch. The AI will reference this in the next followup.
              </div>

              <div style={{ marginBottom: 24 }}>
                <FieldLabel>Update</FieldLabel>
                <TextArea
                  value={update}
                  onChange={setUpdate}
                  placeholder="e.g. Acme just closed a $50M Series B. They announced expansion into Southeast Asia. Reference this in the next followup to show awareness of their growth trajectory."
                  disabled={saving}
                  rows={5}
                />
              </div>

              {saveErr && (
                <div style={{ fontSize: 13, color: T.red, background: T.redLight, padding: '10px 14px', borderRadius: 8, marginBottom: 14 }}>{saveErr}</div>
              )}

              {saveOk && (
                <div style={{ fontSize: 13, color: T.green, background: T.greenLight, padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontWeight: 500 }}>
                  ✓ Update saved to <strong>{updateTabName}</strong> tab.
                </div>
              )}

              <Btn onClick={handleSave} disabled={!update.trim() || saving || loading}>
                {saving ? 'Saving…' : 'Save to sheet'}
              </Btn>

              <div style={{ marginTop: 14, padding: '12px 14px', background: T.accentLight, borderRadius: 8, fontSize: 12, color: T.accent, lineHeight: 1.6 }}>
                <strong>How it works:</strong> Updates are appended to the <strong>{updateTabName}</strong> tab of <em>{selectedSheetName}</em>. The n8n workflow reads this tab before composing each followup, so the AI always has the latest intel.
              </div>
            </Card>

            {/* Existing updates */}
            <Card>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: T.text }}>
                Logged updates
                {rows.length > 0 && (
                  <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 500, color: T.muted, letterSpacing: 0 }}>({rows.length})</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
                All entries in the <strong style={{ color: T.text }}>{updateTabName}</strong> tab, newest at the bottom.
              </div>

              {loading ? (
                <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 14, color: T.muted }}>Loading updates…</div>
              ) : rows.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>No updates yet</div>
                  <div style={{ fontSize: 13, color: T.muted }}>Add the first company intel entry using the form.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
                  {[...rows].reverse().map((row, i) => {
                    const upd = updateCol >= 0 ? row[updateCol] : row[0]
                    const dt  = dateCol   >= 0 ? row[dateCol]   : row[1]
                    return (
                      <div key={i} style={{ padding: '14px 16px', background: T.bg, borderRadius: 10, border: `1.5px solid ${T.border}` }}>
                        <div style={{ marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: T.faint, fontFamily: T.mono }}>{dt || '—'}</span>
                        </div>
                        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{upd || '—'}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

          </div>
        )}

        {/* Empty state before sheet selected */}
        {!selectedSheetId && !loadError && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 72, height: 72, background: T.accentLight, borderRadius: 20, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🧠</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.03em', marginBottom: 10 }}>Select a sheet to get started</div>
            <div style={{ fontSize: 14, color: T.muted, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
              Pick the client's investor sheet above. Make sure it has an <strong style={{ color: T.text }}>Updates</strong> tab for the AI to read during followups.
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
