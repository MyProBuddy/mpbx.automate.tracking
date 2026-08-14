import crypto from 'crypto'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function getKey() {
  const k = process.env.ENCRYPT_KEY || ''
  return Buffer.from(k.padEnd(32).slice(0, 32))
}

export function signSession(payload) {
  const data = JSON.stringify(payload)
  const mac  = crypto.createHmac('sha256', getKey()).update(data).digest('hex')
  return Buffer.from(data).toString('base64') + '.' + mac
}

export function verifySession(req) {
  const header = req.headers['authorization'] || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return false
  try {
    const [b64, mac] = token.split('.')
    const data       = Buffer.from(b64, 'base64').toString('utf8')
    const expected   = crypto.createHmac('sha256', getKey()).update(data).digest('hex')
    if (mac !== expected) return false
    const { exp } = JSON.parse(data)
    return Date.now() < exp
  } catch { return false }
}

// Per-IP rate limiter (resets on cold start — good enough for basic protection)
const _rl = new Map()
export function rateLimit(ip, max = 10, windowMs = 15 * 60 * 1000) {
  const now    = Date.now()
  const entry  = _rl.get(ip) || { count: 0, reset: now + windowMs }
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs }
  entry.count++
  _rl.set(ip, entry)
  return entry.count > max
}

export function setCors(res, methods = 'GET, POST, DELETE, OPTIONS') {
  const origin = process.env.VERCEL_ENV === 'production'
    ? 'https://track-mpbx.vercel.app'
    : '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}
