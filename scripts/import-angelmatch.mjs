// Import angelmatch_transformed.csv into investors table.
// IDs: AM00001, AM00002, ...  All get firm_id = 'f00000' (unconfirmed).
// Run: node scripts/import-angelmatch.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

const CSV_PATH = resolve('F:/finequs/myprobuddy/scrapping/investor list/osint-agent-skills/pipeline/angelmatch_transformed.csv')
const BATCH_SIZE = 200

function pad(n) {
  return 'AM' + String(n).padStart(5, '0')
}

function toNullable(v) {
  return (v === '' || v === undefined) ? null : v
}

async function getStartIndex() {
  // Find highest existing AM-prefixed contact_id
  const { data, error } = await supabase
    .from('investors')
    .select('contact_id')
    .like('contact_id', 'AM%')
    .order('contact_id', { ascending: false })
    .limit(1)
  if (error || !data.length) return 1
  const num = parseInt(data[0].contact_id.replace('AM', '')) || 0
  return num + 1
}

async function main() {
  const raw = readFileSync(CSV_PATH, 'utf-8')
  const records = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, trim: true })
  console.log(`Parsed ${records.length} rows from CSV`)

  let startIdx = await getStartIndex()
  console.log(`Starting at contact_id: ${pad(startIdx)}`)

  let inserted = 0, skipped = 0, errors = 0

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const rows = batch.map((r, offset) => ({
      contact_id: pad(startIdx + i + offset),
      first_name: toNullable(r['First Name']),
      last_name: toNullable(r['Last Name']),
      title: toNullable(r['Title']),
      firm_id: 'f00000',
      firm_name_raw: toNullable(r['Company']),
      email: toNullable(r['Email']),
      phone: toNullable(r['Corporate Phone']) || toNullable(r['Primary Phone Number']),
      address: toNullable(r['Company Address']),
      city: toNullable(r['City']),
      state: toNullable(r['State']),
      country: toNullable(r['Country']),
      linkedin: toNullable(r['Person Linkedin Url']),
      twitter: toNullable(r['Twitter']),
      fund_stage: toNullable(r['Fund stage']),
      investment_stages: toNullable(r['Fund stage']),
      sector_focus: toNullable(r['Sector focused']) || toNullable(r['Fund focus']),
      investment_thesis: toNullable(r['Investment thesis']),
      activity_status: toNullable(r['activity_status']) || 'inactive',
    }))

    const { error } = await supabase.from('investors').insert(rows)
    if (error) {
      console.error(`  Batch ${i / BATCH_SIZE + 1} error:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
      if ((i / BATCH_SIZE) % 10 === 0) {
        console.log(`  Progress: ${inserted}/${records.length} inserted...`)
      }
    }
  }

  console.log('\n--- Done ---')
  console.log(`Inserted: ${inserted}`)
  console.log(`Errors: ${errors}`)
  console.log(`ID range: ${pad(startIdx)} → ${pad(startIdx + inserted - 1)}`)
}

main()
