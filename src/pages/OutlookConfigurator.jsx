import { useState } from 'react'
import templateJson from '../../template.json'
import { T, OUTLOOK_DEFAULTS } from '../constants.js'
import Nav from '../components/Nav.jsx'
import { Card, CardTitle, CardDesc, FieldLabel, TextInput, DiffValue } from '../components/UI.jsx'

function deepReplace(obj, map) {
  if (typeof obj === 'string') {
    let s = obj
    for (const [o, n] of Object.entries(map)) {
      if (o && n && o !== n) s = s.split(o).join(n)
    }
    return s
  }
  if (Array.isArray(obj)) return obj.map(v => deepReplace(v, map))
  if (obj && typeof obj === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(obj)) out[k] = deepReplace(v, map)
    return out
  }
  return obj
}

function fixSheetTabModes(nodes) {
  return nodes.map(node => {
    if (node.type !== 'n8n-nodes-base.googleSheets' && node.type !== 'n8n-nodes-base.googleSheetsV2') return node
    const p = node.parameters || {}
    const fixField = (field) => {
      if (field && typeof field === 'object' && field.__rl === true && field.mode === 'list' && field.cachedResultName && typeof field.value === 'number') {
        return { __rl: true, mode: 'name', value: field.cachedResultName }
      }
      return field
    }
    return { ...node, parameters: { ...p, sheetName: fixField(p.sheetName) } }
  })
}

function replaceOutlookCred(nodes, newId, newName) {
  return nodes.map(node => {
    const creds = node.credentials || {}
    if (!creds.microsoftOutlookOAuth2Api) return node
    const c = { ...creds.microsoftOutlookOAuth2Api }
    if (newId)   c.id   = newId
    if (newName) c.name = newName
    return { ...node, credentials: { ...creds, microsoftOutlookOAuth2Api: c } }
  })
}

export default function OutlookConfigurator() {
  const [form, setForm] = useState({ filename: '', workflow_name: '', outlook_cred_id: '', outlook_cred_name: '', sheet_id_master: '', drive_folder_id: '' })
  const [status, setStatus] = useState('idle')
  const set = k => v => setForm(f => ({ ...f, [k]: v }))
  const pendingCount = [form.workflow_name, form.outlook_cred_id, form.outlook_cred_name, form.sheet_id_master, form.drive_folder_id].filter(v => v.trim()).length

  const generate = () => {
    let data = JSON.parse(JSON.stringify(templateJson))
    if (form.outlook_cred_id || form.outlook_cred_name)
      data.nodes = replaceOutlookCred(data.nodes, form.outlook_cred_id, form.outlook_cred_name)
    if (form.workflow_name) data.name = form.workflow_name
    if (form.sheet_id_master) data.nodes = fixSheetTabModes(data.nodes)
    const strMap = {}
    if (form.sheet_id_master) strMap[OUTLOOK_DEFAULTS.sheet_id_master] = form.sheet_id_master
    if (Object.keys(strMap).length) data = deepReplace(data, strMap)
    if (form.sheet_id_master) {
      const sheetNode = data.nodes.find(n => n.name === 'Master Config - Sheets')
      if (sheetNode) sheetNode.parameters.jsCode = `return [{ json: { sheetId: '${form.sheet_id_master}' } }];`
    }
    if (form.drive_folder_id) {
      const driveNode = data.nodes.find(n => n.name === 'Master Config - Drive')
      if (driveNode) driveNode.parameters.jsCode = `return [{ json: { folderId: '${form.drive_folder_id}' } }];`
    }
    const name = (form.filename.trim() || 'workflow') + (form.filename.endsWith('.json') ? '' : '.json')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: name }).click()
    URL.revokeObjectURL(url)
    setStatus('done')
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans, color: T.text }}>
      <Nav title="Outlook Outreach" subtitle="· configure" pendingCount={pendingCount} onDownload={generate} status={status} backTo="/workflow" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 8 }}>Workflow</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: T.text, marginBottom: 6 }}>Configure Outlook outreach</div>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>Set your credentials and IDs, then download a ready-to-import n8n workflow.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'stretch' }}>
          <Card>
            <CardTitle>Output file</CardTitle>
            <CardDesc>Name the file and the workflow as it appears inside n8n.</CardDesc>
            <FieldLabel>Filename</FieldLabel>
            <TextInput value={form.filename} onChange={set('filename')} placeholder="outreach-client-a" />
            <div style={{ fontSize: 11, color: T.faint, marginTop: 6, marginBottom: 20 }}>.json appended automatically</div>
            <FieldLabel>Workflow name (inside n8n)</FieldLabel>
            <DiffValue current={templateJson.name || 'outreach investor (outlook) Testing'} next={form.workflow_name} />
            <TextInput value={form.workflow_name} onChange={set('workflow_name')} placeholder="e.g. Outreach – Client A" />
          </Card>
          <Card>
            <CardTitle>Outlook account</CardTitle>
            <CardDesc>Swap the Microsoft credential across all nodes.</CardDesc>
            <div style={{ marginBottom: 20 }}>
              <FieldLabel>Credential ID</FieldLabel>
              <DiffValue current={OUTLOOK_DEFAULTS.outlook_cred_id} next={form.outlook_cred_id} mono />
              <TextInput value={form.outlook_cred_id} onChange={set('outlook_cred_id')} placeholder="New credential ID" mono />
            </div>
            <FieldLabel>Account name</FieldLabel>
            <DiffValue current={OUTLOOK_DEFAULTS.outlook_cred_name} next={form.outlook_cred_name} />
            <TextInput value={form.outlook_cred_name} onChange={set('outlook_cred_name')} placeholder="New account name" />
          </Card>
          <Card>
            <CardTitle>Google Sheet</CardTitle>
            <CardDesc>Replace the Master Config sheet ID across all Sheet nodes.</CardDesc>
            <FieldLabel>Sheet ID</FieldLabel>
            <DiffValue current={OUTLOOK_DEFAULTS.sheet_id_master} next={form.sheet_id_master} mono />
            <TextInput value={form.sheet_id_master} onChange={set('sheet_id_master')} placeholder="Paste new Sheet ID" mono />
          </Card>
          <Card>
            <CardTitle>Drive folder</CardTitle>
            <CardDesc>Replace the folder ID in the Master Config – Drive node.</CardDesc>
            <FieldLabel>Folder ID</FieldLabel>
            <DiffValue current={OUTLOOK_DEFAULTS.drive_folder_id} next={form.drive_folder_id} mono />
            <TextInput value={form.drive_folder_id} onChange={set('drive_folder_id')} placeholder="Paste new Folder ID" mono />
          </Card>
        </div>
        <div style={{ marginTop: 24, fontSize: 12, color: T.faint }}>Blank fields keep their original value. Only filled fields are replaced in the output.</div>
      </div>
    </div>
  )
}
