const CLIENT_ID      = import.meta.env.VITE_GOOGLE_CLIENT_ID
const CLIENTS_FOLDER = import.meta.env.VITE_DRIVE_CLIENTS_FOLDER_ID
const SHEETS_FOLDER  = import.meta.env.VITE_DRIVE_SHEETS_FOLDER_ID
const SCOPES        = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets'

let tokenClient = null
let _silentRefreshCallback = null

function getToken()   { return localStorage.getItem('g_token') }
function saveToken(t) {
  localStorage.setItem('g_token', t)
  // push to server so all browsers share the same token
  fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: t }),
  }).catch(() => {})
}
export function clearToken() { localStorage.removeItem('g_token') }
export function isConnected() { return !!getToken() }

// On app boot, pull token from server if localStorage is empty
export async function syncTokenFromServer() {
  if (getToken()) return true   // already have one locally
  try {
    const r = await fetch('/api/token')
    const { token } = await r.json()
    if (token) { localStorage.setItem('g_token', token); return true }
  } catch {}
  return false
}

export function initTokenClient(onToken) {
  if (!window.google) return
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (res) => {
      if (res.access_token) {
        saveToken(res.access_token)
        onToken(res.access_token)
      }
    },
  })
  _silentRefreshCallback = onToken
}

export function requestToken() {
  tokenClient?.requestAccessToken({ prompt: 'consent' })
}

export function silentRefresh() {
  return new Promise((resolve, reject) => {
    if (!window.google) return reject(new Error('Google not loaded'))
    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (res) => {
        if (res.access_token) {
          saveToken(res.access_token)   // also pushes to server
          if (_silentRefreshCallback) _silentRefreshCallback(res.access_token)
          resolve(res.access_token)
        } else {
          reject(new Error('SILENT_REFRESH_FAILED'))
        }
      },
    })
    tc.requestAccessToken({ prompt: '' })
  })
}

export function revokeToken() {
  const t = getToken()
  if (t) window.google?.accounts.oauth2.revoke(t)
  clearToken()
}

async function gFetch(url, opts = {}, retry = true) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (res.status === 401) {
    if (retry) {
      // try a silent token refresh once before giving up
      try {
        await silentRefresh()
        return gFetch(url, opts, false)
      } catch {
        clearToken()
        throw new Error('TOKEN_EXPIRED')
      }
    }
    clearToken()
    throw new Error('TOKEN_EXPIRED')
  }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createClientFolder(name) {
  const data = await gFetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [CLIENTS_FOLDER],
    }),
  })
  return data.id
}

export async function uploadFile(file, folderId, onProgress) {
  const token = getToken()
  const metadata = { name: file.name, parents: [folderId] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)) }
    xhr.onload = () => xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(xhr.responseText))
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(form)
  })
}

export async function listClientSheets() {
  const q = encodeURIComponent(`'${SHEETS_FOLDER}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`)
  const data = await gFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,webViewLink)&orderBy=createdTime desc&pageSize=100`
  )
  return data.files || []
}

export async function listClientFolders() {
  const q = encodeURIComponent(`'${CLIENTS_FOLDER}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const data = await gFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,webViewLink)&orderBy=createdTime desc&pageSize=100`
  )
  return data.files || []
}

export { SHEETS_FOLDER }

// ── Sheets API ───────────────────────────────────────────────────────────────

export async function copySpreadsheetToFolder(fileId, name, folderId) {
  const copy = await gFetch(`https://www.googleapis.com/drive/v3/files/${fileId}/copy`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  // move to target folder
  await gFetch(
    `https://www.googleapis.com/drive/v3/files/${copy.id}?addParents=${folderId}&removeParents=root&fields=id`,
    { method: 'PATCH', body: JSON.stringify({}) }
  )
  return copy.id
}

export async function getSheetTabs(spreadsheetId) {
  const data = await gFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`
  )
  return (data.sheets || []).map(s => s.properties)
}

export async function getSheetValues(spreadsheetId, range) {
  const data = await gFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
  )
  return data.values || []
}

export async function writeSheetValues(spreadsheetId, range, values) {
  return gFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', body: JSON.stringify({ range, majorDimension: 'ROWS', values }) }
  )
}

export async function clearSheetRange(spreadsheetId, range) {
  return gFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    { method: 'POST', body: JSON.stringify({}) }
  )
}

export async function appendSheetValues(spreadsheetId, range, values) {
  return gFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values }) }
  )
}

// ── localStorage client store ────────────────────────────────────────────────

const STORE_KEY = 'wf_clients'

export function loadClients() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]') } catch { return [] }
}

export function saveClient(client) {
  const clients = loadClients()
  clients.unshift(client)
  localStorage.setItem(STORE_KEY, JSON.stringify(clients))
}

export function deleteClient(id) {
  const clients = loadClients().filter(c => c.id !== id)
  localStorage.setItem(STORE_KEY, JSON.stringify(clients))
}
