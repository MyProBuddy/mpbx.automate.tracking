const GIST_ID   = import.meta.env.VITE_GIST_ID
const GH_TOKEN  = import.meta.env.VITE_GITHUB_TOKEN
const ENC_KEY   = import.meta.env.VITE_ENCRYPT_KEY   // min 16 chars

// ── AES-GCM encrypt/decrypt via Web Crypto ───────────────────────────────────

async function getKey() {
  const raw = new TextEncoder().encode(ENC_KEY.padEnd(32).slice(0, 32))
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encrypt(text) {
  const key = await getKey()
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))
  const buf = new Uint8Array(iv.byteLength + enc.byteLength)
  buf.set(iv, 0)
  buf.set(new Uint8Array(enc), iv.byteLength)
  return btoa(String.fromCharCode(...buf))
}

async function decrypt(b64) {
  const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const iv  = buf.slice(0, 12)
  const enc = buf.slice(12)
  const key = await getKey()
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, enc)
  return new TextDecoder().decode(dec)
}

// ── Gist read/write ──────────────────────────────────────────────────────────

const GIST_FILE = 'token.enc'
const headers   = {
  Authorization: `Bearer ${GH_TOKEN}`,
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
}

export async function pushTokenToStore(token) {
  if (!GIST_ID || !GH_TOKEN || !ENC_KEY) return
  try {
    const encrypted = await encrypt(token)
    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ files: { [GIST_FILE]: { content: encrypted } } }),
    })
  } catch {}
}

export async function pullTokenFromStore() {
  if (!GIST_ID || !GH_TOKEN || !ENC_KEY) return null
  try {
    const r    = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers })
    const data = await r.json()
    const enc  = data?.files?.[GIST_FILE]?.content
    if (!enc) return null
    return await decrypt(enc)
  } catch { return null }
}
