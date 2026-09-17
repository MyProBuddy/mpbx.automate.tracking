import express from 'express'
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(express.json())

// Dynamically load and serve each api/* handler
const apis = ['auth', 'n8n', 'client-analytics', 'supabase', 'ai', 'db-stats']

for (const name of apis) {
  try {
    const mod = await import(`./api/${name}.js`)
    const handler = mod.default
    app.all(`/api/${name}`, (req, res) => handler(req, res))
    console.log(`  ✓ /api/${name}`)
  } catch (e) {
    // skip missing
  }
}

app.listen(3001, () => console.log('API server running on http://localhost:3001'))
