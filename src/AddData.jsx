import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  initTokenClient, requestToken, revokeToken, isConnected,
  createClientFolder, uploadFile, loadClients, saveClient, deleteClient,
  listClientFolders, listClientSheets,
  copySpreadsheetToFolder, getSheetTabs, getSheetValues,
  writeSheetValues, appendSheetValues, clearSheetRange,
} from './google.js'
import { useAuth } from './AuthContext.jsx'
import Nav from './components/Nav.jsx'
import { T } from './constants.js'

import { getConfig } from './lib/config.js'

const FONT  = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FS    = { h: 32, sh: 18, c: 14, sc: 12 }
const INK   = '#1a1a1a'
const MUTED = '#626260'
const LINE  = 'rgba(0,0,0,0.08)'
const RED   = '#DC2626'
const GREEN = '#16A34A'

const NEU_BG     = '#F0F0F0'
const NEU_SURF   = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHADOW = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const NEU_BTN    = '-4px -4px 10px rgba(255,255,255,0.9), 4px 4px 10px rgba(0,0,0,0.10)'
const NEU_INSET  = 'inset 3px 3px 8px rgba(0,0,0,0.10), inset -3px -3px 8px rgba(255,255,255,0.80)'

let ROOT_FOLDER     = null
let TEMPLATE_SHEET  = null
let SHEETS_FOLDER_ID = null

getConfig().then(c => {
  ROOT_FOLDER      = c.clientsFolderId
  TEMPLATE_SHEET   = c.templateSheetId
  SHEETS_FOLDER_ID = c.sheetsFolderId
})

function FieldLabel({ children }) {
  return <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 6, fontFamily: FONT }}>{children}</div>
}

function TextInput({ value, onChange, placeholder, disabled }) {
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
        background: 'rgba(0,0,0,0.04)',
        border: 'none',
        borderRadius: 10, fontSize: FS.c, fontFamily: FONT,
        color: disabled ? MUTED : INK,
        outline: 'none', transition: 'box-shadow 0.15s',
        letterSpacing: 0, boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'text',
        boxShadow: focused ? NEU_INSET : 'inset 2px 2px 6px rgba(0,0,0,0.07), inset -2px -2px 6px rgba(255,255,255,0.65)',
      }}
    />
  )
}

function Btn({ onClick, disabled, children, variant = 'primary', small }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        padding: small ? '6px 14px' : '10px 20px',
        background: NEU_SURF,
        border: 'none',
        color: variant === 'danger' ? RED : INK,
        boxShadow: (pressed || disabled) ? NEU_INSET : NEU_BTN,
        borderRadius: 10,
        fontFamily: FONT,
        fontSize: small ? FS.sc : FS.c,
        fontWeight: 500,
        lineHeight: 1.2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'box-shadow 0.15s, opacity 0.15s',
        whiteSpace: 'nowrap',
      }}
    >{children}</button>
  )
}

function Card({ children, style }) {
  return <div style={{ background: NEU_SURF, borderRadius: 16, border: 'none', boxShadow: NEU_SHADOW, padding: 24, ...style }}>{children}</div>
}

function Badge({ children, color }) {
  return <span style={{ fontSize: FS.sc, fontWeight: 500, background: color + '18', color, borderRadius: 6, padding: '3px 10px', fontFamily: FONT }}>{children}</span>
}

const isIdCol = (h) => /^(investor.?id|inv.?id|id)$/i.test(h.trim())

function MappingTable({ templateHeaders, csvHeaders, mapping, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {templateHeaders.map(h => isIdCol(h) ? (
        <div key={h} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: FS.sc, fontWeight: 500, color: INK, padding: '7px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8, border: 'none', boxShadow: NEU_INSET }}>{h}</div>
          <div style={{ fontSize: FS.sc, color: GREEN, padding: '7px 10px', background: 'rgba(22,163,74,0.08)', border: 'none', borderRadius: 8, fontWeight: 600 }}>Auto (INV-0001…)</div>
        </div>
      ) : (
        <div key={h} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: FS.sc, fontWeight: 500, color: INK, padding: '7px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8, border: 'none', boxShadow: NEU_INSET, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</div>
          <select
            value={mapping[h] || ''}
            onChange={e => onChange(prev => ({ ...prev, [h]: e.target.value || undefined }))}
            style={{ fontSize: FS.sc, padding: '7px 10px', border: 'none', borderRadius: 8, background: NEU_SURF, boxShadow: NEU_BTN, color: mapping[h] ? INK : MUTED, fontFamily: FONT, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">— skip —</option>
            {csvHeaders.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

// ── chart colours ─────────────────────────────────────────────────────────────
const CHART_COLORS = ['#5647E0','#2DB67D','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#EC4899','#14B8A6','#6366F1']

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: NEU_SURF, border: 'none', borderRadius: 16, boxShadow: NEU_SHADOW, padding: '20px 24px' }}>
      <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 500, color: INK, letterSpacing: '-0.8px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: FS.sc, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

function DonutChart({ data, size = 160, label }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  const cx = size / 2, cy = size / 2, r = size * 0.34
  const strokeW = size * 0.14
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {data.map((d, i) => {
          const pct = d.value / total
          const dash = pct * circ
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={strokeW}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-(offset * circ)}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          )
          offset += pct
          return el
        })}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={size * 0.18} fontWeight="800" fill={INK} fontFamily={FONT}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={size * 0.09} fill={MUTED} fontFamily={FONT}>{label}</text>
      </svg>
    </div>
  )
}

function HBarChart({ data, accentColor }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.slice(0, 8).map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: FS.sc, color: INK, fontWeight: 500, maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span style={{ fontSize: FS.sc, fontWeight: 700, color: accentColor }}>{d.value}</span>
          </div>
          <div style={{ height: 5, background: LINE, borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${(d.value / max) * 100}%`, background: INK, borderRadius: 3, transition: 'width 0.7s ease' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Legend({ data }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 16 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
          <span style={{ fontSize: FS.sc, color: MUTED, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
          <span style={{ fontSize: FS.sc, fontWeight: 600, color: INK }}>{d.value}</span>
        </div>
      ))}
    </div>
  )
}

function countByCol(rows, headers, pattern) {
  const idx = headers.findIndex(h => pattern.test(h))
  if (idx < 0) return []
  const counts = {}
  rows.forEach(row => {
    const val = (row[idx] || '').trim()
    if (!val || val === '[unknown]' || val === 'Unspecified') return
    val.split(/[,;|]/).forEach(v => {
      const k = v.trim()
      if (k) counts[k] = (counts[k] || 0) + 1
    })
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }))
}

export default function AddData() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [googleReady, setGoogleReady]     = useState(false)
  const { googleConnected: connected, googleSyncing, setConnected } = useAuth()
  const [tab, setTab]                     = useState('new')   // 'new' | 'clients'

  // new client form
  const [clientName, setClientName]       = useState('')
  const [folderName, setFolderName]       = useState('')
  const [folderId, setFolderId]           = useState(null)
  const [files, setFiles]                 = useState([])
  const [progress, setProgress]           = useState({})    // { filename: pct }
  const [step, setStep]                   = useState('form') // form | creating | uploading | done
  const [error, setError]                 = useState('')
  const [dragging, setDragging]           = useState(false)
  const fileRef                           = useRef()

  // clients list (from Drive)
  const [clients, setClients]             = useState([])
  const [sheets, setSheets]               = useState([])  // sheets from SHEETS_FOLDER
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientsError, setClientsError]   = useState('')

  // investor sheet
  const [invCsv, setInvCsv]               = useState(null)   // { headers, rows }
  const [invHeaders, setInvHeaders]        = useState([])     // template Investors tab headers
  const [trackInitRow, setTrackInitRow]    = useState([])     // template Tracking tab row 2 (blank defaults)
  const [invMapping, setInvMapping]        = useState({})     // templateCol → csvCol
  const [invSheetName, setInvSheetName]    = useState('')
  const [invStep, setInvStep]             = useState('idle') // idle|loading|mapping|creating|done
  const [invError, setInvError]           = useState('')
  const [invSheetUrl, setInvSheetUrl]     = useState('')
  const [invTabNames, setInvTabNames]     = useState({ investors: '', tracking: '' })
  const csvRef                             = useRef()

  // data visualisation
  const [vizSheetId, setVizSheetId]       = useState('')
  const [vizData, setVizData]             = useState(null)  // { headers, rows }
  const [vizLoading, setVizLoading]       = useState(false)
  const [vizError, setVizError]           = useState('')

  useEffect(() => {
    setConnected(isConnected())
    const interval = setInterval(() => {
      if (window.google) {
        initTokenClient((token) => setConnected(true))
        setGoogleReady(true)
        clearInterval(interval)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  const fetchClients = async () => {
    setClientsLoading(true)
    setClientsError('')
    try {
      const [folders, sheetFiles] = await Promise.all([listClientFolders(), listClientSheets()])
      setClients(folders)
      setSheets(sheetFiles)
    } catch (e) {
      setClientsError('Failed to load. ' + (e.message === 'TOKEN_EXPIRED' ? 'Please reconnect Google.' : e.message))
    } finally {
      setClientsLoading(false)
    }
  }

  const connect = () => {
    initTokenClient((token) => { setConnected(true); fetchClients() })
    requestToken()
  }

  const disconnect = () => { revokeToken(); setConnected(false) }

  const addFiles = (incoming) => {
    const arr = Array.from(incoming)
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...arr.filter(f => !names.has(f.name))]
    })
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name))

  const handleCreateAndUpload = async () => {
    if (!clientName.trim() || !folderName.trim()) return
    setError('')
    try {
      setStep('creating')
      const id = await createClientFolder(folderName.trim())
      setFolderId(id)

      if (files.length > 0) {
        setStep('uploading')
        for (const file of files) {
          await uploadFile(file, id, (pct) =>
            setProgress(p => ({ ...p, [file.name]: pct }))
          )
        }
      }

      const client = {
        id: 'client_' + Date.now(),
        name: clientName.trim(),
        folderName: folderName.trim(),
        folderId: id,
        folderUrl: `https://drive.google.com/drive/folders/${id}`,
        fileCount: files.length,
        createdAt: new Date().toISOString(),
      }
      saveClient(client)
      setClients(loadClients())
      setStep('done')
    } catch (e) {
      setError(e.message === 'TOKEN_EXPIRED' ? 'Google session expired. Please reconnect.' : e.message)
      setStep('form')
    }
  }

  const parseCsv = (text) => {
    const parseLine = (line) => {
      const fields = []
      let cur = '', inQuote = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuote) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
          else if (ch === '"') inQuote = false
          else cur += ch
        } else {
          if (ch === '"') inQuote = true
          else if (ch === ',') { fields.push(cur.trim()); cur = '' }
          else cur += ch
        }
      }
      fields.push(cur.trim())
      return fields
    }
    const lines = text.trim().split(/\r?\n/)
    const headers = parseLine(lines[0])
    const rows = lines.slice(1).map(parseLine).filter(r => r.some(c => c))
    return { headers, rows }
  }

  const handleCsvUpload = async (file) => {
    setInvError('')
    const text = await file.text()
    const parsed = parseCsv(text)
    setInvCsv(parsed)
    setInvStep('loading')
    try {
      const tabs = await getSheetTabs(TEMPLATE_SHEET)
      const invTab   = tabs.find(t => /investor/i.test(t.title)) || tabs[0]
      const trackTab = tabs.find(t => /track/i.test(t.title))    || tabs[1]
      setInvTabNames({ investors: invTab?.title || '', tracking: trackTab?.title || '' })

      const [invRows, trackRows] = await Promise.all([
        getSheetValues(TEMPLATE_SHEET, `${invTab.title}!1:1`),
        trackTab ? getSheetValues(TEMPLATE_SHEET, `${trackTab.title}!1:2`) : Promise.resolve([]),
      ])
      const iHeaders = invRows[0]   || []
      const tInitRow = trackRows[1] || []
      setInvHeaders(iHeaders)
      setTrackInitRow(tInitRow)

      const m = {}
      iHeaders.forEach(h => {
        const match = parsed.headers.find(c => c.toLowerCase() === h.toLowerCase())
        if (match) m[h] = match
      })
      setInvMapping(m)
    } catch (e) {
      // template read failed — fall back to mapping using CSV headers directly
      setInvHeaders(parsed.headers)
      setInvTabNames({ investors: 'Investors', tracking: 'Tracking' })
      setInvError('Could not read template sheet (' + e.message + '). Mapping CSV headers directly.')
    }
    setInvStep('mapping')
  }

  const buildRows = (headers, mapping, idColOverride) =>
    invCsv.rows.map((row, i) =>
      headers.map(h => {
        if (isIdCol(h)) return idColOverride ? idColOverride[i] : `INV-${String(i + 1).padStart(4, '0')}`
        const csvCol = mapping[h]
        if (!csvCol) return '[unknown]'
        const idx = invCsv.headers.indexOf(csvCol)
        const val = idx >= 0 ? row[idx] : ''
        return val?.trim() || '[unknown]'
      })
    )

  const handleCreateSheet = async () => {
    if (!invSheetName.trim()) return
    setInvStep('creating')
    setInvError('')
    try {
      const sheetId = await copySpreadsheetToFolder(TEMPLATE_SHEET, invSheetName.trim(), SHEETS_FOLDER_ID)

      // INV-0001, INV-0002 … format
      const ids = invCsv.rows.map((_, i) => `INV-${String(i + 1).padStart(4, '0')}`)

      // Investors tab — clear old sample rows then write fresh
      if (invHeaders.length > 0) {
        await clearSheetRange(sheetId, `${invTabNames.investors}!A2:Z10000`)
        const rows = buildRows(invHeaders, invMapping, ids)
        if (rows.length > 0) await writeSheetValues(sheetId, `${invTabNames.investors}!A2`, rows)
      }

      // Tracking tab — clear old rows, read headers, write N fresh rows
      if (invTabNames.tracking) {
        await clearSheetRange(sheetId, `${invTabNames.tracking}!A2:Z10000`)
        const trackHdrValues = await getSheetValues(sheetId, `${invTabNames.tracking}!1:1`)
        const tHdrs = trackHdrValues[0] || []
        const trackRows = ids.map(id => {
          return tHdrs.map((h, i) => {
            if (isIdCol(h)) return id
            const v = trackInitRow[i]
            if (v !== undefined && v !== '') return v
            const isDescriptive = /name|company|firm|title|note|comment|remark/i.test(h)
            return isDescriptive ? '[unknown]' : ''
          })
        })
        if (trackRows.length > 0) await writeSheetValues(sheetId, `${invTabNames.tracking}!A2`, trackRows)
      }

      setInvSheetUrl(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`)
      setInvStep('done')
    } catch (e) {
      setInvError(e.message === 'TOKEN_EXPIRED' ? 'Google session expired. Please reconnect.' : e.message)
      setInvStep('mapping')
    }
  }

  const resetInvSheet = () => {
    setInvCsv(null); setInvHeaders([]); setTrackInitRow([])
    setInvMapping({}); setInvSheetName('')
    setInvStep('idle'); setInvError(''); setInvSheetUrl('')
    setInvTabNames({ investors: '', tracking: '' })
  }

  const loadVizData = async (sheetId) => {
    if (!sheetId) return
    setVizLoading(true); setVizError(''); setVizData(null)
    try {
      const tabs = await getSheetTabs(sheetId)
      const invTab = tabs.find(t => /investor/i.test(t.title)) || tabs[0]
      const values = await getSheetValues(sheetId, `${invTab.title}!A1:Z1000`)
      const headers = values[0] || []
      const rows = values.slice(1).filter(r => r.some(c => c && c !== '[unknown]'))
      setVizData({ headers, rows })
    } catch (e) {
      setVizError(e.message === 'TOKEN_EXPIRED' ? 'Google session expired. Please reconnect.' : e.message)
    } finally {
      setVizLoading(false)
    }
  }

  const reset = () => {
    setClientName(''); setFolderName(''); setFolderId(null)
    setFiles([]); setProgress({}); setStep('form'); setError('')
  }


  const stepLabel = { form: null, creating: 'Creating folder…', uploading: 'Uploading files…', done: null }

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, color: INK, background: NEU_BG }}>

      <Nav title="Add Data" backTo="/hub" extra={
        connected
          ? <><Badge color={GREEN}>Google Connected</Badge>{role === 'superadmin' && <Btn onClick={disconnect} variant="ghost" small>Disconnect</Btn>}</>
          : googleSyncing
            ? null
            : role === 'superadmin'
              ? <Btn onClick={connect} disabled={!googleReady} small>Connect Google</Btn>
              : <Badge color={RED}>Google not connected — contact Super Admin</Badge>
      } />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 48px 80px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: FS.c, fontWeight: 500, color: MUTED, marginBottom: 8 }}>Data</div>
          <div style={{ fontSize: FS.h, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.15, color: INK, marginBottom: 8 }}>Manage investor data</div>
          <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.5 }}>Create client folders, upload pitch docs, and set up sheets.</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[
            { id: 'new', label: 'New Client' },
            { id: 'clients', label: `All Clients${clients.length ? ` (${clients.length})` : ''}` },
            { id: 'viz', label: 'Data Visualisation' },
          ].map(t => (
            <button key={t.id} onClick={() => {
              setTab(t.id)
              if (t.id === 'clients') fetchClients()
              if (t.id === 'viz') fetchClients()
            }} style={{
              padding: '10px 20px',
              background: NEU_SURF,
              border: 'none',
              borderRadius: 10,
              boxShadow: tab === t.id ? NEU_INSET : NEU_BTN,
              fontSize: FS.c,
              fontWeight: 500,
              color: tab === t.id ? INK : MUTED,
              cursor: 'pointer',
              transition: 'box-shadow 0.15s, color 0.15s',
              fontFamily: FONT,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* NEW CLIENT TAB */}
        {tab === 'new' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

            {/* Left: form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Card>
                <div style={{ fontSize: FS.sh, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: INK }}>Client details</div>
                <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 22 }}>Enter the client name and the Drive folder name to create.</div>
                <div style={{ marginBottom: 16 }}>
                  <FieldLabel>Client Name</FieldLabel>
                  <TextInput value={clientName} onChange={setClientName} placeholder="e.g. Enlighten Capital" disabled={step !== 'form'} />
                </div>
                <div>
                  <FieldLabel>Drive Folder Name</FieldLabel>
                  <TextInput value={folderName} onChange={setFolderName} placeholder="e.g. Enlighten Capital – Pitch Docs" disabled={step !== 'form'} />
                  <div style={{ fontSize: FS.sc, color: MUTED, marginTop: 6 }}>Created inside your root Drive folder</div>
                </div>
              </Card>

              {/* Investor Sheet */}
              <Card>
                <div style={{ fontSize: FS.sh, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: INK }}>Investor Sheet</div>
                <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 20 }}>
                  Upload a CSV — map columns to the template sheet, then create the client sheet in Drive.
                </div>

                {invStep === 'done' ? (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ width: 48, height: 48, background: T.greenLight, borderRadius: 12, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✓</div>
                    <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, marginBottom: 4 }}>Sheet created!</div>
                    <div style={{ fontSize: FS.c, color: MUTED, marginBottom: 16 }}>{invCsv?.rows.length} investors added.</div>
                    <a href={invSheetUrl} target="_blank" rel="noreferrer" style={{ fontSize: FS.c, color: INK, textDecoration: 'none', fontWeight: 500 }}>Open sheet →</a>
                    <div style={{ marginTop: 16 }}><Btn onClick={resetInvSheet} variant="ghost" small>Create another</Btn></div>
                  </div>
                ) : invStep === 'creating' ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', fontSize: FS.c, color: MUTED }}>Creating sheet…</div>
                ) : invStep === 'loading' ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', fontSize: FS.c, color: MUTED }}>Reading template structure…</div>
                ) : invStep === 'mapping' ? (
                  <div>
                    <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 16, padding: '10px 14px', background: 'rgba(0,0,0,0.04)', boxShadow: NEU_INSET, borderRadius: 10, border: 'none' }}>
                      CSV loaded — <strong style={{ color: INK }}>{invCsv.rows.length} investors</strong>, {invCsv.headers.length} columns. Map columns below.
                    </div>

                    <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(0,0,0,0.04)', boxShadow: NEU_INSET, borderRadius: 10, border: 'none' }}>
                      <FieldLabel>Sheet Name {!invSheetName.trim() && <span style={{ color: RED, fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>← required to create</span>}</FieldLabel>
                      <TextInput value={invSheetName} onChange={setInvSheetName} placeholder="e.g. Enlighten Capital – Investors" />
                    </div>

                    {invHeaders.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: FS.sc, fontWeight: 700, color: MUTED, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {invTabNames.investors} tab
                        </div>
                        <MappingTable templateHeaders={invHeaders} csvHeaders={invCsv.headers} mapping={invMapping} onChange={setInvMapping} />
                      </div>
                    )}

                    {invTabNames.tracking && (
                      <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 20, padding: '10px 14px', background: 'rgba(0,0,0,0.04)', boxShadow: NEU_INSET, borderRadius: 10, border: 'none' }}>
                        <strong style={{ color: INK }}>{invTabNames.tracking}</strong> tab will be auto-populated — {invCsv.rows.length} rows with sequential IDs and template initial values.
                      </div>
                    )}

                    {invError && <div style={{ fontSize: FS.sc, color: RED, background: 'rgba(220,38,38,0.06)', boxShadow: NEU_INSET, padding: '10px 14px', borderRadius: 10, border: 'none', marginBottom: 12 }}>{invError}</div>}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <Btn onClick={handleCreateSheet} disabled={!connected || !invSheetName.trim()}>
                        {!connected ? 'Connect Google first' : 'Create Sheet'}
                      </Btn>
                      <Btn onClick={resetInvSheet} variant="ghost">Cancel</Btn>
                    </div>
                  </div>
                ) : (
                  <div>
                    {!connected && (
                      <div style={{ fontSize: FS.sc, color: RED, background: 'rgba(220,38,38,0.06)', boxShadow: NEU_INSET, padding: '10px 14px', borderRadius: 10, border: 'none', marginBottom: 12 }}>Connect Google first to enable sheet creation.</div>
                    )}
                    <div onClick={() => connected && csvRef.current?.click()} style={{
                      border: 'none', borderRadius: 12, padding: '32px 20px',
                      textAlign: 'center', background: 'rgba(0,0,0,0.04)',
                      boxShadow: NEU_INSET,
                      cursor: connected ? 'pointer' : 'not-allowed',
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
                      <div style={{ fontSize: FS.c, fontWeight: 600, color: INK, marginBottom: 4 }}>Upload investor CSV</div>
                      <div style={{ fontSize: FS.sc, color: MUTED }}>Click to browse</div>
                      <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleCsvUpload(e.target.files[0])} />
                    </div>
                    {invError && <div style={{ fontSize: FS.sc, color: RED, background: 'rgba(220,38,38,0.06)', boxShadow: NEU_INSET, padding: '10px 14px', borderRadius: 10, border: 'none', marginTop: 12 }}>{invError}</div>}
                  </div>
                )}
              </Card>
            </div>

            {/* Right: file upload + action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Card>
                <div style={{ fontSize: FS.sh, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: INK }}>Pitch Documents</div>
                <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 20 }}>Upload files to be stored in the client's Drive folder.</div>

                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => step === 'form' && fileRef.current?.click()}
                  style={{
                    border: 'none', borderRadius: 12, padding: '28px 20px', textAlign: 'center',
                    background: dragging ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.04)',
                    boxShadow: NEU_INSET,
                    cursor: step === 'form' ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📂</div>
                  <div style={{ fontSize: FS.c, fontWeight: 600, color: INK, marginBottom: 4 }}>Drop files here</div>
                  <div style={{ fontSize: FS.sc, color: MUTED }}>or click to browse</div>
                  <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
                </div>

                {files.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {files.map(f => (
                      <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: NEU_SURF, borderRadius: 10, border: 'none', boxShadow: NEU_BTN }}>
                        <span style={{ fontSize: FS.c }}>📄</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: FS.sc, fontWeight: 500, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                          {progress[f.name] != null && progress[f.name] < 100 && (
                            <div style={{ marginTop: 4, height: 2, background: LINE, borderRadius: 2 }}>
                              <div style={{ height: '100%', width: `${progress[f.name]}%`, background: INK, borderRadius: 2, transition: 'width 0.2s' }} />
                            </div>
                          )}
                          {progress[f.name] === 100 && <div style={{ fontSize: FS.sc, color: GREEN, marginTop: 2 }}>Uploaded</div>}
                        </div>
                        <span style={{ fontSize: FS.sc, color: MUTED, flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} KB</span>
                        {step === 'form' && <button onClick={() => removeFile(f.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: FS.c, padding: 0, lineHeight: 1 }}>×</button>}
                      </div>
                    ))}
                  </div>
                )}

                {error && <div style={{ fontSize: FS.sc, color: RED, background: 'rgba(220,38,38,0.06)', boxShadow: NEU_INSET, padding: '10px 14px', borderRadius: 10, border: 'none', marginBottom: 12 }}>{error}</div>}
                {stepLabel[step] && <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 12, fontWeight: 500 }}>{stepLabel[step]}</div>}

                {step === 'done' ? (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{ width: 44, height: 44, background: T.greenLight, borderRadius: 10, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✓</div>
                    <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, marginBottom: 4 }}>Client created!</div>
                    <div style={{ fontSize: FS.c, color: MUTED, marginBottom: 16 }}>Folder and files are ready in Drive.</div>
                    <a href={`https://drive.google.com/drive/folders/${folderId}`} target="_blank" rel="noreferrer" style={{ fontSize: FS.c, color: INK, textDecoration: 'none', fontWeight: 500 }}>Open folder →</a>
                    <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <Btn onClick={() => { reset(); setTab('clients') }} variant="ghost" small>View all clients</Btn>
                      <Btn onClick={reset} small>Add another</Btn>
                    </div>
                  </div>
                ) : (
                  <Btn onClick={handleCreateAndUpload} disabled={!connected || !clientName.trim() || !folderName.trim() || step !== 'form'}>
                    {!connected ? 'Connect Google first' : 'Create Folder & Upload'}
                  </Btn>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ALL CLIENTS TAB */}
        {tab === 'clients' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn onClick={fetchClients} variant="ghost" small>↻ Refresh</Btn>
            </div>

            {clientsError && <div style={{ color: RED, fontSize: FS.sc, background: 'rgba(220,38,38,0.06)', boxShadow: NEU_INSET, padding: '10px 14px', borderRadius: 10, border: 'none' }}>{clientsError}</div>}

            {/* Docs Folders */}
            <Card>
              <div style={{ fontSize: FS.sh, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4, color: INK }}>📁 Docs</div>
              <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 20 }}>Client pitch document folders in Drive.</div>
              {clientsLoading ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: FS.c, color: MUTED }}>Loading…</div>
              ) : clients.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: FS.sc, color: MUTED }}>No folders found.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Name', 'Created', ''].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', padding: '0 12px 12px', fontSize: FS.sc, fontWeight: 500, color: MUTED, borderBottom: `1px solid ${LINE}`, background: 'rgba(0,0,0,0.02)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(c => (
                      <tr key={c.id}>
                        <td style={{ padding: '13px 12px', fontSize: FS.c, fontWeight: 600, color: INK, borderBottom: `1px solid ${LINE}` }}>{c.name}</td>
                        <td style={{ padding: '13px 12px', fontSize: FS.c, color: MUTED, borderBottom: `1px solid ${LINE}` }}>{new Date(c.createdTime).toLocaleDateString()}</td>
                        <td style={{ padding: '13px 12px', borderBottom: `1px solid ${LINE}` }}>
                          <a href={c.webViewLink} target="_blank" rel="noreferrer" style={{ fontSize: FS.c, color: INK, textDecoration: 'none', fontWeight: 500 }}>Open →</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            {/* Investor Sheets */}
            <Card>
              <div style={{ fontSize: FS.sh, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4, color: INK }}>📊 Sheets</div>
              <div style={{ fontSize: FS.sc, color: MUTED, marginBottom: 20 }}>Investor sheets created for each client.</div>
              {clientsLoading ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: FS.c, color: MUTED }}>Loading…</div>
              ) : sheets.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: FS.sc, color: MUTED }}>No sheets found.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Name', 'Created', ''].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', padding: '0 12px 12px', fontSize: FS.sc, fontWeight: 500, color: MUTED, borderBottom: `1px solid ${LINE}`, background: 'rgba(0,0,0,0.02)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheets.map(s => (
                      <tr key={s.id}>
                        <td style={{ padding: '13px 12px', fontSize: FS.c, fontWeight: 600, color: INK, borderBottom: `1px solid ${LINE}` }}>{s.name}</td>
                        <td style={{ padding: '13px 12px', fontSize: FS.c, color: MUTED, borderBottom: `1px solid ${LINE}` }}>{new Date(s.createdTime).toLocaleDateString()}</td>
                        <td style={{ padding: '13px 12px', borderBottom: `1px solid ${LINE}` }}>
                          <a href={s.webViewLink} target="_blank" rel="noreferrer" style={{ fontSize: FS.c, color: INK, textDecoration: 'none', fontWeight: 500 }}>Open →</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}
        {/* DATA VISUALISATION TAB */}
        {tab === 'viz' && (() => {
          const fundStage   = vizData ? countByCol(vizData.rows, vizData.headers, /fund.?stage/i) : []
          const sectors     = vizData ? countByCol(vizData.rows, vizData.headers, /sector/i) : []
          const countries   = vizData ? countByCol(vizData.rows, vizData.headers, /country/i) : []
          const focus       = vizData ? countByCol(vizData.rows, vizData.headers, /fund.?focus/i) : []
          const uniqueCountries = countries.length
          const uniqueSectors  = sectors.length

          return (
            <div>
              {/* Sheet picker */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 32 }}>
                <select
                  value={vizSheetId}
                  onChange={e => setVizSheetId(e.target.value)}
                  style={{ flex: 1, maxWidth: 400, padding: '11px 14px', border: 'none', borderRadius: 10, fontSize: FS.c, fontFamily: FONT, color: vizSheetId ? INK : MUTED, background: NEU_SURF, boxShadow: NEU_BTN, outline: 'none' }}
                >
                  <option value="">Select a client sheet…</option>
                  {sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <Btn onClick={() => loadVizData(vizSheetId)} disabled={!vizSheetId || vizLoading}>
                  {vizLoading ? 'Loading…' : 'Load'}
                </Btn>
              </div>

              {vizError && <div style={{ fontSize: FS.sc, color: RED, background: 'rgba(220,38,38,0.06)', boxShadow: NEU_INSET, padding: '10px 14px', borderRadius: 10, border: 'none', marginBottom: 24 }}>{vizError}</div>}

              {!vizData && !vizLoading && (
                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
                  <div style={{ fontSize: FS.sh, fontWeight: 700, color: INK, marginBottom: 8 }}>Select a sheet to visualise</div>
                  <div style={{ fontSize: FS.c, color: MUTED }}>Pick a client investor sheet from the dropdown above.</div>
                </div>
              )}

              {vizData && (
                <>
                  {/* Stat cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                    <StatCard label="Total Investors" value={vizData.rows.length} />
                    <StatCard label="Fund Stages" value={fundStage.length} sub="distinct stages" />
                    <StatCard label="Countries" value={uniqueCountries} sub="represented" />
                    <StatCard label="Sectors" value={uniqueSectors} sub="tracked" />
                  </div>

                  {/* Charts row 1 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

                    {/* Fund stage donut */}
                    {fundStage.length > 0 && (
                      <Card>
                        <div style={{ fontSize: FS.c, fontWeight: 500, color: INK, letterSpacing: '-0.01em', marginBottom: 20 }}>Fund Stage</div>
                        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                          <DonutChart data={fundStage} size={150} label="funds" />
                          <Legend data={fundStage} />
                        </div>
                      </Card>
                    )}

                    {/* Sector bar */}
                    {sectors.length > 0 && (
                      <Card>
                        <div style={{ fontSize: FS.c, fontWeight: 500, color: INK, letterSpacing: '-0.01em', marginBottom: 20 }}>Sector Focus</div>
                        <HBarChart data={sectors} accentColor={INK} />
                      </Card>
                    )}
                  </div>

                  {/* Charts row 2 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                    {/* Country bar */}
                    {countries.length > 0 && (
                      <Card>
                        <div style={{ fontSize: FS.c, fontWeight: 500, color: INK, letterSpacing: '-0.01em', marginBottom: 20 }}>Geography</div>
                        <HBarChart data={countries} accentColor="#2DB67D" />
                      </Card>
                    )}

                    {/* Fund focus donut */}
                    {focus.length > 0 && (
                      <Card>
                        <div style={{ fontSize: FS.c, fontWeight: 500, color: INK, letterSpacing: '-0.01em', marginBottom: 20 }}>Fund Focus</div>
                        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                          <DonutChart data={focus} size={150} label="funds" />
                          <Legend data={focus} />
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Fallback if no recognisable columns */}
                  {fundStage.length === 0 && sectors.length === 0 && countries.length === 0 && (
                    <Card>
                      <div style={{ textAlign: 'center', padding: '32px 0', color: MUTED, fontSize: FS.c }}>
                        No recognisable categorical columns found (fund stage, sector, country).<br />
                        <span style={{ fontSize: FS.sc, marginTop: 8, display: 'block' }}>Available columns: {vizData.headers.join(', ')}</span>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </div>
          )
        })()}

      </div>
    </div>
  )
}
