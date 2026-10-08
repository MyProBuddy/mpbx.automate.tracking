import { useState, useEffect, useRef } from 'react'

function injectThinScroll() {
  if (document.getElementById('thin-scroll-style')) return
  const s = document.createElement('style')
  s.id = 'thin-scroll-style'
  s.textContent = '.thin-scroll::-webkit-scrollbar{width:3px;height:3px}.thin-scroll::-webkit-scrollbar-track{background:transparent}.thin-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.18);border-radius:99px}'
  document.head.appendChild(s)
}
import { useParams } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import apiFetch from '../lib/apiFetch.js'

const FONT     = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const INK      = '#1a1a1a'
const MUTED    = '#626260'
const NEU_BG   = '#F0F0F0'
const NEU_SURF = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHD  = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const GREEN    = '#3ECF8E'
const LINE     = 'rgba(0,0,0,0.08)'

const TABLE_ORDER = ['investors', 'tracking', 'conversation_log', 'thread_tracking', 'config', 'updates']

function fmt(val) {
  if (val === null || val === undefined) return <span style={{ color: '#ccc' }}>—</span>
  if (typeof val === 'boolean') return <span style={{ color: val ? GREEN : '#dc2626', fontWeight: 600 }}>{val ? 'true' : 'false'}</span>
  if (Array.isArray(val)) return <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{JSON.stringify(val)}</span>
  if (val instanceof Date) return <span>{val.toLocaleString()}</span>
  const s = String(val)
  if (s === 'N/A' || s === '') return <span style={{ color: '#ccc' }}>—</span>
  return s
}

const NEU_INSET = 'inset 3px 3px 8px rgba(0,0,0,0.10), inset -3px -3px 8px rgba(255,255,255,0.80)'
const NEU_BTN   = '-4px -4px 10px rgba(255,255,255,0.9), 4px 4px 10px rgba(0,0,0,0.10)'

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: MUTED, marginBottom: 4 }}>{label}</div>
      {type === 'textarea' ? (
        <textarea
          value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          rows={3}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', resize: 'vertical',
            background: 'rgba(0,0,0,0.04)', boxShadow: NEU_INSET, fontSize: 13, fontFamily: FONT,
            color: INK, outline: 'none', boxSizing: 'border-box' }}
        />
      ) : (
        <input
          value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none',
            background: 'rgba(0,0,0,0.04)', boxShadow: NEU_INSET, fontSize: 13, fontFamily: FONT,
            color: INK, outline: 'none', boxSizing: 'border-box' }}
        />
      )}
    </div>
  )
}

const PREVIEW_COLS = [
  'First Name', 'Last Name', 'Email', 'Title', 'Company', 'Company Country', 'Company State',
  'Person Linkedin Url', 'Website', 'Company Address', 'Total Funding', 'Latest Funding Amount',
  'Last Raised At', 'Overview', 'Description', 'Keywords', 'Fund focus', 'Fund stage',
  'Check Size', 'Fund description', 'Number of exists', 'Number of Investments', 'Portfolios',
  'Portfolio Company\'s', 'Sector focused', 'Investment thesis', 'Primary Phone Number',
  'Corporate Phone', 'Crunchbase profile', 'timezone_offset', 'timezone_num',
]

function ProgressBar({ label, done, total, color }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: MUTED }}>{done} / {total}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, background: color, width: `${pct}%`, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}

const STATUS_STYLE = {
  valid:      { bg: '#dcfce7', color: '#16a34a', label: 'Valid' },
  invalid:    { bg: '#fee2e2', color: '#dc2626', label: 'Invalid' },
  accept_all: { bg: '#fef9c3', color: '#ca8a04', label: 'Accept All' },
  webmail:    { bg: '#e0f2fe', color: '#0284c7', label: 'Webmail' },
  disposable: { bg: '#fce7f3', color: '#db2777', label: 'Disposable' },
  unknown:    { bg: '#f3f4f6', color: '#6b7280', label: 'Unknown' },
}

function AddCard({ schema }) {
  const [mode, setMode] = useState(null)
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [validating, setValidating] = useState(false)
  const [msg, setMsg] = useState(null)

  const [rawText, setRawText] = useState('')
  const [previewRows, setPreviewRows] = useState(null)
  const [validation, setValidation] = useState({}) // email -> { status, score, ... }
  const [enriched, setEnriched] = useState({})     // email -> set of filled col keys
  const [enriching, setEnriching] = useState(false)
  const [timezoned, setTimezoned] = useState(false)
  const [timezoning, setTimezoning] = useState(false)
  const [progress, setProgress] = useState({ hunter: 0, hunterTotal: 0, perplexity: 0, perplexityTotal: 0, timezone: 0, timezoneTotal: 0 })

  const [updateText, setUpdateText] = useState('')

  async function parseInvestors() {
    if (!rawText.trim()) return setMsg({ ok: false, text: 'Paste some data first.' })
    setParsing(true); setMsg(null); setPreviewRows(null); setValidation({}); setEnriched({}); setTimezoned(false)
    try {
      const r = await apiFetch('/api/investors?action=parse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      if (!d.rows?.length) return setMsg({ ok: false, text: 'No valid rows found in your data.' })
      setPreviewRows(d.rows)
    } catch(e) { setMsg({ ok: false, text: e.message }) }
    setParsing(false)
  }

  async function runValidation() {
    if (!previewRows?.length) return
    const emails = previewRows.map(r => r['Email']).filter(Boolean)
    if (!emails.length) return setMsg({ ok: false, text: 'No emails to validate.' })
    setValidating(true); setMsg(null)
    setProgress(p => ({ ...p, hunter: 0, hunterTotal: emails.length }))
    const results = {}
    for (let i = 0; i < emails.length; i++) {
      try {
        const r = await apiFetch('/api/investors?action=validate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: [emails[i]] }),
        })
        const d = await r.json()
        if (r.ok && d.results) Object.assign(results, d.results)
      } catch { /* skip */ }
      setProgress(p => ({ ...p, hunter: i + 1 }))
    }
    setValidation(results)
    setValidating(false)
  }

  async function runEnrichment() {
    if (!previewRows?.length) return
    setEnriching(true); setMsg(null)
    const validRows = previewRows.filter(r => validation[r['Email']]?.status === 'valid')
    setProgress(p => ({ ...p, perplexity: 0, perplexityTotal: validRows.length }))
    const updated = [...previewRows]
    const newEnriched = { ...enriched }
    for (let i = 0; i < updated.length; i++) {
      const row = updated[i]
      if (validation[row['Email']]?.status !== 'valid') continue
      try {
        const r = await apiFetch('/api/investors?action=enrich', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim(),
            firm: row['Company'] || '',
            title: row['Title'] || '',
            email: row['Email'] || '',
          }),
        })
        const d = await r.json()
        if (!r.ok || !d.enriched) continue
        const e = d.enriched
        const filledKeys = new Set()
        const MAP = {
          linkedin:          'Person Linkedin Url',
          website:           'Website',
          sector_focus:      'Sector focused',
          fund_stage:        'Fund stage',
          check_size:        'Check Size',
          fund_description:  'Fund description',
          investment_thesis: 'Investment thesis',
          overview:          'Overview',
          notable_portfolios:'Portfolio Company\'s',
          keywords:          'Keywords',
        }
        for (const [eKey, colKey] of Object.entries(MAP)) {
          if (e[eKey] && !updated[i][colKey]) {
            updated[i] = { ...updated[i], [colKey]: e[eKey] }
            filledKeys.add(colKey)
          }
        }
        newEnriched[row['Email']] = filledKeys
      } catch { /* skip on error */ }
      setProgress(p => ({ ...p, perplexity: p.perplexity + 1 }))
      // 1.2s gap between calls — stays under Perplexity's 50 req/min limit
      if (i < updated.length - 1) await new Promise(r => setTimeout(r, 1200))
    }
    setPreviewRows(updated)
    setEnriched(newEnriched)
    setEnriching(false)
  }

  async function runTimezone() {
    if (!previewRows?.length) return
    setTimezoning(true); setMsg(null)
    const validRows = previewRows.filter(r => validation[r['Email']]?.status === 'valid')
    setProgress(p => ({ ...p, timezone: 0, timezoneTotal: validRows.length }))

    // Build batch: only valid rows, track their previewRows indices
    const indices = []
    const tzRows = []
    previewRows.forEach((row, i) => {
      if (validation[row['Email']]?.status === 'valid') {
        indices.push(i)
        tzRows.push({ index: tzRows.length, ...row })
      }
    })

    try {
      const r = await apiFetch('/api/investors?action=timezone', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: tzRows }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      const updated = [...previewRows]
      const newEnriched = { ...enriched }
      for (const item of (d.results || [])) {
        const previewIdx = indices[item.index]
        if (previewIdx === undefined) continue
        const row = updated[previewIdx]
        updated[previewIdx] = { ...row, timezone_offset: item.timezone_offset, timezone_num: String(item.timezone_num) }
        if (!newEnriched[row['Email']]) newEnriched[row['Email']] = new Set()
        newEnriched[row['Email']].add('timezone_offset')
        newEnriched[row['Email']].add('timezone_num')
      }
      setPreviewRows(updated)
      setEnriched(newEnriched)
      setProgress(p => ({ ...p, timezone: validRows.length }))
      setTimezoned(true)
    } catch(e) { setMsg({ ok: false, text: `Timezone detection failed: ${e.message}` }) }
    setTimezoning(false)
  }

  async function confirmInsert() {
    if (!previewRows?.length) return
    setSaving(true); setMsg(null)

    // Only send valid rows to the API — it handles dedup, sequencing, and both inserts in one transaction
    const validRows = previewRows.filter(r => validation[r['Email']]?.status === 'valid')
    try {
      const r = await apiFetch('/api/investors?action=bulk-insert', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, rows: validRows }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      const parts = [`${d.inserted} investor${d.inserted !== 1 ? 's' : ''} inserted`]
      if (d.dupes)   parts.push(`${d.dupes} duplicate${d.dupes !== 1 ? 's' : ''} skipped`)
      if (d.notz)    parts.push(`${d.notz} skipped (no timezone)`)
      if (d.failed)  parts.push(`${d.failed} failed`)
      setMsg({ ok: true, text: parts.join(' · ') })
      if (d.inserted > 0) { setPreviewRows(null); setRawText(''); setValidation({}); setEnriched({}); setTimezoned(false) }
    } catch(e) { setMsg({ ok: false, text: e.message }) }
    setSaving(false)
  }

  async function saveUpdate() {
    if (!updateText.trim()) return setMsg({ ok: false, text: 'Update text is required.' })
    setSaving(true); setMsg(null)
    try {
      const r = await apiFetch('/api/schema-add-row', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, table: 'updates', row: { update: updateText.trim() } }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setMsg({ ok: true, text: 'Update saved.' })
      setUpdateText('')
    } catch(e) { setMsg({ ok: false, text: e.message }) }
    setSaving(false)
  }

  return (
    <div style={{ background: NEU_SURF, borderRadius: 16, boxShadow: NEU_SHD, padding: '24px 28px', fontFamily: FONT }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 20 }}>Add New</div>

      {/* Option selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: mode ? 24 : 0 }}>
        {[{ id: 'investor', label: 'Investor Contact' }, { id: 'update', label: 'Company Update' }].map(o => (
          <button key={o.id} onClick={() => { setMode(m => m === o.id ? null : o.id); setPreviewRows(null); setMsg(null) }} style={{
            padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: FONT, fontSize: 13, fontWeight: 600,
            background: mode === o.id ? INK : 'rgba(0,0,0,0.07)',
            color: mode === o.id ? '#fff' : MUTED,
            boxShadow: mode === o.id ? 'none' : NEU_BTN,
            transition: 'all 0.15s',
          }}>{o.label}</button>
        ))}
      </div>

      {/* Investor form */}
      {mode === 'investor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Paste area */}
          {!previewRows && (
            <>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 4 }}>Paste your investor data</div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>
                  Any format works — tab-separated, CSV, copied from a spreadsheet, or raw text.{' '}
                  <span style={{ color: '#3b82f6' }}>AI will parse it automatically.</span>
                </div>
                <textarea
                  value={rawText}
                  onChange={e => { setRawText(e.target.value); setMsg(null) }}
                  placeholder={'Paste rows here — e.g.:\nSojitz Corporation    Japan    Krieattisak    krieattisak.s@sojitz.com\nAsia Alternatives    California    Raghav Mahajan    rmahajan@asiaalt.com\n\nOr paste a full spreadsheet export with many columns — Gemini will figure it out.'}
                  rows={8}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 14px',
                    borderRadius: 8, border: `1px solid ${LINE}`, resize: 'vertical',
                    background: '#fff', fontSize: 12, fontFamily: "'SF Mono','Fira Code',monospace", color: INK,
                    outline: 'none', lineHeight: 1.7,
                  }}
                />
              </div>

              {/* File upload */}
              <div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>
                  Or load from a file <span style={{ color: '#3b82f6' }}>(Excel, CSV or TXT)</span>
                </div>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '28px 20px', borderRadius: 8,
                  border: `1.5px dashed ${LINE}`, background: 'rgba(0,0,0,0.02)', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 24 }}>📂</span>
                  <span style={{ fontSize: 13, color: MUTED }}>Select a file</span>
                  <input type="file" accept=".xlsx,.xls,.csv,.txt,.tsv" style={{ display: 'none' }}
                    onChange={async e => {
                      const file = e.target.files[0]
                      if (!file) return
                      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
                      if (isExcel) {
                        const buf = await file.arrayBuffer()
                        const XLSX = await import('xlsx')
                        const wb = XLSX.read(buf)
                        const ws = wb.Sheets[wb.SheetNames[0]]
                        const tsv = XLSX.utils.sheet_to_csv(ws, { FS: '\t' })
                        setRawText(t => (t ? t + '\n' : '') + tsv)
                      } else {
                        const reader = new FileReader()
                        reader.onload = ev => setRawText(t => (t ? t + '\n' : '') + ev.target.result)
                        reader.readAsText(file)
                      }
                    }}
                  />
                </label>
              </div>

              {msg && <div style={{ fontSize: 12, color: msg.ok ? GREEN : '#dc2626' }}>{msg.text}</div>}
              <button onClick={parseInvestors} disabled={parsing || !rawText.trim()} style={{
                padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600,
                fontFamily: FONT, alignSelf: 'flex-start', opacity: (parsing || !rawText.trim()) ? 0.6 : 1,
              }}>{parsing ? '✨ Parsing…' : '✨ Parse with AI'}</button>
            </>
          )}

          {/* Preview */}
          {previewRows && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Preview — {previewRows.length} row{previewRows.length !== 1 ? 's' : ''} found</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Review before adding. Rows without an email will be skipped.</div>
                </div>
                <button onClick={() => { setPreviewRows(null); setMsg(null) }} style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'rgba(0,0,0,0.07)', color: MUTED, fontSize: 12, fontFamily: FONT,
                }}>← Edit</button>
              </div>

              <div className="thin-scroll" ref={() => injectThinScroll()} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 6 * 37 + 41, borderRadius: 10, border: `1px solid ${LINE}`, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.18) transparent' }}>
                <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONT }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr style={{ background: '#ececec' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: MUTED, whiteSpace: 'nowrap', borderBottom: `1px solid ${LINE}` }}>Status</th>
                      {PREVIEW_COLS.map(c => (
                        <th key={c} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: MUTED, whiteSpace: 'nowrap', borderBottom: `1px solid ${LINE}` }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => {
                      const vResult = validation[row['Email']]
                      const st = STATUS_STYLE[vResult?.status] || null
                      const isValid = vResult?.status === 'valid'
                      const isInvalid = vResult?.status === 'invalid'
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${LINE}`, background: isValid ? 'rgba(22,163,74,0.06)' : isInvalid ? 'rgba(220,38,38,0.06)' : !row['Email'] ? 'rgba(220,38,38,0.04)' : i % 2 === 0 ? '#fff' : 'rgba(0,0,0,0.02)' }}>
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                            {st ? (
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color }}>{st.label}{vResult?.score != null ? ` ${vResult.score}` : ''}</span>
                            ) : (
                              <span style={{ color: '#ccc', fontSize: 11 }}>—</span>
                            )}
                          </td>
                          {PREVIEW_COLS.map(c => {
                            const isEnrichedCell = enriched[row['Email']]?.has(c)
                            return (
                              <td key={c} style={{ padding: '8px 12px', color: isEnrichedCell ? '#16a34a' : row[c] ? INK : '#ccc', whiteSpace: 'nowrap', fontWeight: isEnrichedCell ? 500 : 400 }}>
                                {row[c] || '—'}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Progress bars */}
              {validating && progress.hunterTotal > 0 && (
                <ProgressBar label="Hunter.io Validation" done={progress.hunter} total={progress.hunterTotal} color="#f97316" />
              )}
              {enriching && progress.perplexityTotal > 0 && (
                <ProgressBar label="Perplexity Enrichment" done={progress.perplexity} total={progress.perplexityTotal} color="#7c3aed" />
              )}
              {timezoning && progress.timezoneTotal > 0 && (
                <ProgressBar label="Timezone Detection" done={progress.timezone} total={progress.timezoneTotal} color="#0284c7" />
              )}

              {msg && <div style={{ fontSize: 12, color: msg.ok ? GREEN : '#dc2626' }}>{msg.text}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                {Object.keys(validation).length === 0 && (
                  <button onClick={runValidation} disabled={validating} style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 600,
                    fontFamily: FONT, opacity: validating ? 0.6 : 1,
                  }}>{validating ? 'Validating…' : '🔍 Run Hunter.io Validation'}</button>
                )}
                {Object.keys(validation).length > 0 && Object.keys(enriched).length === 0 && (
                  <button onClick={runEnrichment} disabled={enriching} style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 600,
                    fontFamily: FONT, opacity: enriching ? 0.6 : 1,
                  }}>{enriching ? 'Enriching…' : '✦ Enrich with Perplexity Sonar'}</button>
                )}
                {Object.keys(enriched).length > 0 && !timezoned && (
                  <button onClick={runTimezone} disabled={timezoning} style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: '#0284c7', color: '#fff', fontSize: 13, fontWeight: 600,
                    fontFamily: FONT, opacity: timezoning ? 0.6 : 1,
                  }}>{timezoning ? 'Detecting…' : '🌐 Detect Timezones'}</button>
                )}
                {timezoned && (
                  <button onClick={confirmInsert} disabled={saving} style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: GREEN, color: '#fff', fontSize: 13, fontWeight: 600,
                    fontFamily: FONT, opacity: saving ? 0.6 : 1,
                  }}>{saving ? 'Adding…' : `Add ${previewRows.filter(r => validation[r['Email']]?.status === 'valid' && r['timezone_offset']).length} Investors`}</button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Update form */}
      {mode === 'update' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Update" value={updateText} onChange={setUpdateText} placeholder="Write the company update here…" type="textarea" />
          {msg && <div style={{ fontSize: 12, color: msg.ok ? GREEN : '#dc2626' }}>{msg.text}</div>}
          <button onClick={saveUpdate} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: GREEN, color: '#fff', fontSize: 13, fontWeight: 600,
            fontFamily: FONT, alignSelf: 'flex-start', opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving…' : 'Save Update'}</button>
        </div>
      )}
    </div>
  )
}

function DataTable({ name, data, open, onToggle, editing }) {
  const { columns, rows, error } = data

  const badge = (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: error ? '#fee2e2' : `${GREEN}22`, color: error ? '#dc2626' : GREEN,
      marginLeft: 8,
    }}>
      {error ? 'error' : `${rows.length} rows`}
    </span>
  )

  return (
    <div style={{ background: NEU_SURF, borderRadius: 16, boxShadow: NEU_SHD, overflow: 'hidden', fontFamily: FONT }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: open ? `1px solid ${LINE}` : 'none',
      }}>
        <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none', flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: 'monospace' }}>{name}</span>
          {badge}
        </div>
        <span onClick={onToggle} style={{ fontSize: 12, color: MUTED, cursor: 'pointer' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        error ? (
          <div style={{ padding: '16px 24px', fontSize: 13, color: '#dc2626' }}>{error}</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '16px 24px', fontSize: 13, color: MUTED }}>No rows</div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONT }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: '#eaeaea', zIndex: 1 }}>
                  {columns.map(c => (
                    <th key={c} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: MUTED, whiteSpace: 'nowrap', borderBottom: `1px solid ${LINE}` }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${LINE}`, background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                    {columns.map(c => (
                      <td key={c} style={{ padding: '8px 12px', color: INK, whiteSpace: 'nowrap', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fmt(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

export default function SchemaDetail() {
  const { schema } = useParams()
  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)
  const [openTables, setOpenTables]   = useState(TABLE_ORDER.reduce((a, t) => ({ ...a, [t]: true }), {}))
  const [editing, setEditing]         = useState(false)

  const label = schema.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  useEffect(() => {
    apiFetch(`/api/schema-tables?schema=${encodeURIComponent(schema)}`)
      .then(async r => {
        const t = await r.text()
        try { setData(JSON.parse(t)) } catch { setError(t) }
      })
      .catch(e => setError(e.message))
  }, [schema])

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Add Data" backTo="/add-data" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Supabase Schema</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '-0.3px' }}>{label}</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 4, fontFamily: 'monospace' }}>{schema}</div>
          </div>
          <button
            onClick={() => {
              if (editing) {
                setEditing(false)
                setOpenTables(TABLE_ORDER.reduce((a, t) => ({ ...a, [t]: true }), {}))
              } else {
                setEditing(true)
                setOpenTables(TABLE_ORDER.reduce((a, t) => ({ ...a, [t]: false }), {}))
              }
            }}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: editing ? GREEN : NEU_SURF,
              boxShadow: NEU_SHD,
              color: editing ? '#fff' : MUTED,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
            }}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 10, padding: '12px 20px', marginBottom: 24 }}>{error}</div>}
        {!data && !error && <div style={{ color: MUTED, fontSize: 14 }}>Loading…</div>}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {editing && <AddCard schema={schema} onDone={() => {
              setEditing(false)
              setOpenTables(TABLE_ORDER.reduce((a, t) => ({ ...a, [t]: true }), {}))
            }} />}
            {TABLE_ORDER.map(t => data[t] && (
              <DataTable
                key={t} name={t} data={data[t]}
                open={openTables[t]}
                onToggle={() => setOpenTables(p => ({ ...p, [t]: !p[t] }))}
                editing={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
