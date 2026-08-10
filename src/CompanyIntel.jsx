import { useState, useEffect } from 'react'
import {
  initTokenClient, requestToken, revokeToken, isConnected,
  listClientSheets, getSheetTabs, getSheetValues, appendSheetValues,
} from './google.js'
import { useAuth } from './AuthContext.jsx'
import Nav from './components/Nav.jsx'
import { T } from './constants.js'

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
const NEU_INSET  = 'inset 3px 3px 8px rgba(0,0,0,0.10), inset -3px -3px 8px rgba(255,255,255,0.80)'

function FieldLabel({ children }) {
  return <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 6, fontFamily: FONT }}>{children}</div>
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
        width: '100%', padding: '11px 14px', boxSizing: 'border-box',
        background: 'rgba(0,0,0,0.04)',
        border: 'none',
        borderRadius: 10,
        boxShadow: focused && !disabled ? NEU_INSET : 'inset 2px 2px 5px rgba(0,0,0,0.08), inset -2px -2px 5px rgba(255,255,255,0.7)',
        fontSize: FS.c, fontFamily: mono ? T.mono : FONT,
        color: disabled ? MUTED : INK,
        outline: 'none', transition: 'box-shadow 0.15s',
        cursor: disabled ? 'not-allowed' : 'text',
        opacity: disabled ? 0.6 : 1,
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
        width: '100%', padding: '11px 14px', boxSizing: 'border-box',
        background: 'rgba(0,0,0,0.04)',
        border: 'none',
        borderRadius: 10,
        boxShadow: focused && !disabled ? NEU_INSET : 'inset 2px 2px 5px rgba(0,0,0,0.08), inset -2px -2px 5px rgba(255,255,255,0.7)',
        fontSize: FS.c, fontFamily: FONT,
        color: disabled ? MUTED : INK,
        outline: 'none', transition: 'box-shadow 0.15s',
        resize: 'vertical', lineHeight: 1.6,
        cursor: disabled ? 'not-allowed' : 'text',
        opacity: disabled ? 0.6 : 1,
      }}
    />
  )
}

function Btn({ onClick, disabled, children, small, danger }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        padding: small ? '6px 14px' : '10px 20px',
        background: NEU_SURF,
        border: 'none', borderRadius: 10,
        fontSize: small ? FS.sc : FS.c, fontWeight: 500,
        fontFamily: FONT, lineHeight: 1.2,
        color: danger ? RED : INK,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        boxShadow: (pressed && !disabled) ? NEU_INSET : NEU_BTN,
        transition: 'box-shadow 0.15s, opacity 0.15s',
        whiteSpace: 'nowrap',
      }}
    >{children}</button>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: NEU_SURF, borderRadius: 16, boxShadow: NEU_SHADOW, padding: 24, ...style }}>
      {children}
    </div>
  )
}

function Badge({ children, color }) {
  return (
    <span style={{ fontSize: FS.sc, fontWeight: 500, background: color + '18', color, borderRadius: 99, padding: '3px 10px', fontFamily: FONT }}>
      {children}
    </span>
  )
}

function parseSheetDate(raw) {
  if (!raw) return null
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${parseInt(iso[3])} ${months[parseInt(iso[2]) - 1]} ${iso[1]}`
  }
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dmy) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${parseInt(dmy[1])} ${months[parseInt(dmy[2]) - 1]} ${dmy[3]}`
  }
  return raw
}

function LogCard({ row, updateCol, dateCol }) {
  const upd = (updateCol >= 0 ? row[updateCol] : row[0]) ?? ''
  const dt  = (dateCol >= 0 ? row[dateCol] : row[1]) ?? ''
  const dateStr = parseSheetDate(dt)

  return (
    <div style={{ background: NEU_SURF, borderRadius: 12, boxShadow: NEU_BTN, padding: '12px 16px' }}>
      {dateStr && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, background: 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '2px 8px' }}>{dateStr}</span>
        </div>
      )}
      <div style={{ fontSize: FS.c, color: INK, lineHeight: 1.7 }}>{upd || '—'}</div>
    </div>
  )
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

  const [sheets, setSheets]               = useState([])
  const [sheetsLoading, setSheetsLoading] = useState(false)

  const [selectedSheetId, setSelectedSheetId]     = useState('')
  const [selectedSheetName, setSelectedSheetName] = useState('')

  const [updateTabName, setUpdateTabName] = useState('Updates')
  const [rows, setRows]                   = useState([])
  const [headers, setHeaders]             = useState([])
  const [loading, setLoading]             = useState(false)
  const [loadError, setLoadError]         = useState('')

  const [update, setUpdate]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [saveOk, setSaveOk]   = useState(false)
  const [saveErr, setSaveErr] = useState('')

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

  const connect    = () => { initTokenClient((token) => { setConnected(true); fetchSheets() }); requestToken() }
  const disconnect = () => { revokeToken(); setConnected(false) }

  useEffect(() => { if (connected) fetchSheets() }, [connected])

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

  const colIdx = (pattern) => headers.findIndex(h => pattern.test(h))
  const updateCol = colIdx(/update|note|intel/i)
  const dateCol = headers.findIndex((h, i) => i !== updateCol && /date|time/i.test(h))

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG, color: INK }}>

      <Nav title="Company Intel" backTo="/hub" extra={
        connected
          ? <><Badge color={T.green}>Google Connected</Badge>{role === 'superadmin' && <Btn onClick={disconnect} small>Disconnect</Btn>}</>
          : googleSyncing
            ? null
            : role === 'superadmin'
              ? <Btn onClick={connect} disabled={!googleReady} small>Connect Google</Btn>
              : <Badge color={RED}>Google not connected — contact Super Admin</Badge>
      } />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 48px 80px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: FS.c, fontWeight: 500, color: '#D97706', marginBottom: 8 }}>Intel</div>
          <div style={{ fontSize: FS.h, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.2, color: INK, marginBottom: 6 }}>Company Intel</div>
          <div style={{ fontSize: FS.c, color: MUTED, maxWidth: 520, lineHeight: 1.6 }}>
            Log company updates — funding rounds, leadership changes, news — so the AI references them during followups to write sharper, more relevant pitch emails.
          </div>
        </div>

        {/* Sheet selector */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: FS.sh, fontWeight: 600, letterSpacing: '-0.2px', marginBottom: 6, color: INK }}>Select client sheet</div>
          <div style={{ fontSize: FS.c, color: MUTED, marginBottom: 20 }}>
            Choose the investor sheet that has an <strong style={{ color: INK }}>Updates</strong> tab. The AI reads this tab when composing followup emails.
          </div>

          {!connected && (
            <div style={{ fontSize: FS.c, color: '#D97706', background: 'rgba(217,119,6,0.08)', padding: '10px 14px', borderRadius: 10, marginBottom: 16, boxShadow: NEU_INSET }}>
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
                background: NEU_SURF, border: 'none', borderRadius: 10,
                boxShadow: NEU_INSET,
                fontSize: FS.c, fontFamily: FONT,
                color: selectedSheetId ? INK : MUTED,
                outline: 'none',
                cursor: connected ? 'pointer' : 'not-allowed',
                opacity: connected ? 1 : 0.5,
              }}
            >
              <option value="">{sheetsLoading ? 'Loading sheets…' : 'Select a client sheet…'}</option>
              {sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSheetId && (
              <Btn onClick={() => loadSheet(selectedSheetId)} disabled={loading} small>
                {loading ? 'Loading…' : '↻ Reload'}
              </Btn>
            )}
          </div>

          {loadError && (
            <div style={{ fontSize: FS.c, color: RED, background: 'rgba(220,38,38,0.06)', padding: '10px 14px', borderRadius: 10, marginTop: 14, lineHeight: 1.5, boxShadow: NEU_INSET }}>
              {loadError}
            </div>
          )}
        </Card>

        {selectedSheetId && !loadError && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

            {/* Add update form */}
            <Card>
              <div style={{ fontSize: FS.sh, fontWeight: 600, letterSpacing: '-0.2px', marginBottom: 6, color: INK }}>Add update</div>
              <div style={{ fontSize: FS.c, color: MUTED, marginBottom: 24, lineHeight: 1.55 }}>
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
                <div style={{ fontSize: FS.c, color: RED, background: 'rgba(220,38,38,0.06)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, boxShadow: NEU_INSET }}>{saveErr}</div>
              )}

              {saveOk && (
                <div style={{ fontSize: FS.c, color: T.green, background: 'rgba(22,163,74,0.06)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontWeight: 500, boxShadow: NEU_INSET }}>
                  Update saved to <strong>{updateTabName}</strong> tab.
                </div>
              )}

              <Btn onClick={handleSave} disabled={!update.trim() || saving || loading}>
                {saving ? 'Saving…' : 'Save to sheet'}
              </Btn>

              <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(0,0,0,0.04)', borderRadius: 10, boxShadow: NEU_INSET, fontSize: FS.sc, color: MUTED, lineHeight: 1.6 }}>
                <strong style={{ color: INK }}>How it works:</strong> Updates are appended to the <strong style={{ color: INK }}>{updateTabName}</strong> tab of <em>{selectedSheetName}</em>. The n8n workflow reads this tab before composing each followup, so the AI always has the latest intel.
              </div>
            </Card>

            {/* Existing updates */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: FS.sh, fontWeight: 600, letterSpacing: '-0.2px', color: INK }}>Logged updates</div>
                {rows.length > 0 && (
                  <span style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, background: 'rgba(0,0,0,0.06)', borderRadius: 99, padding: '1px 9px' }}>{rows.length}</span>
                )}
              </div>
              <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 20, lineHeight: 1.5 }}>
                Entries from the <strong style={{ color: INK, fontWeight: 500 }}>{updateTabName}</strong> tab — newest first.
              </div>

              {loading ? (
                <div style={{ padding: '32px 0', textAlign: 'center', fontSize: FS.c, color: MUTED }}>Loading updates…</div>
              ) : rows.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: FS.c, fontWeight: 600, color: INK, marginBottom: 6 }}>No updates yet</div>
                  <div style={{ fontSize: FS.sc, color: MUTED }}>Add the first company intel entry using the form.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
                  {[...rows].reverse().map((row, i) => (
                    <LogCard key={i} row={row} updateCol={updateCol} dateCol={dateCol} />
                  ))}
                </div>
              )}
            </Card>

          </div>
        )}

        {/* Empty state before sheet selected */}
        {!selectedSheetId && !loadError && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 72, height: 72, background: NEU_SURF, boxShadow: NEU_SHADOW, borderRadius: 20, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🧠</div>
            <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, letterSpacing: '-0.2px', marginBottom: 10 }}>Select a sheet to get started</div>
            <div style={{ fontSize: FS.c, color: MUTED, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
              Pick the client's investor sheet above. Make sure it has an <strong style={{ color: INK }}>Updates</strong> tab for the AI to read during followups.
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
