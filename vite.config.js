import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

// Load .env manually for the plugin
function loadEnv() {
  try {
    const lines = readFileSync('.env', 'utf8').split('\n')
    for (const line of lines) {
      const [k, ...v] = line.split('=')
      if (k && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim()
    }
  } catch {}
}

function apiPlugin() {
  return {
    name: 'local-api',
    async configureServer(server) {
      loadEnv()
      const apis = ['auth', 'n8n', 'client-analytics', 'supabase', 'ai', 'db-stats', 'create-client-schema', 'schema-tables', 'schema-add-row']
      const handlers = {}
      for (const name of apis) {
        try {
          const mod = await import(`./api/${name}.js`)
          handlers[`/api/${name}`] = mod.default
          console.log(`  ✓ /api/${name}`)
        } catch (e) {
          console.warn(`  ✗ /api/${name}: ${e.message}`)
        }
      }

      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        const handler = handlers[path]
        if (!handler) return next()

        // Parse body
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          await new Promise(resolve => {
            let body = ''
            req.on('data', c => body += c)
            req.on('end', () => {
              try { req.body = JSON.parse(body) } catch { req.body = {} }
              resolve()
            })
          })
        }

        // Parse query
        const url = new URL(req.url, 'http://localhost')
        req.query = Object.fromEntries(url.searchParams)

        // Add Express-like helpers to res
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (data) => {
          if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        }
        res.end = res.end.bind(res)

        try {
          await handler(req, res)
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
})
