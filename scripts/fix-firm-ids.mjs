// Fix null firm_id for investors imported without firm matching.
// Run: node scripts/fix-firm-ids.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

function normalize(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

async function main() {
  // Fetch all investors with null firm_id
  const { data: investors, error: invErr } = await supabase
    .from('investors')
    .select('contact_id, firm_name_raw')
    .is('firm_id', null)

  if (invErr) { console.error('Error fetching investors:', invErr.message); process.exit(1) }
  console.log(`Found ${investors.length} investors with null firm_id`)

  // Fetch ALL existing firms (paginate to bypass Supabase 1000-row limit)
  let firms = [], firmPage = 0
  while (true) {
    const { data, error: firmErr } = await supabase
      .from('firms')
      .select('firm_id, name')
      .range(firmPage * 1000, firmPage * 1000 + 999)
    if (firmErr) { console.error('Error fetching firms:', firmErr.message); process.exit(1) }
    firms = firms.concat(data)
    if (data.length < 1000) break
    firmPage++
  }
  console.log(`Found ${firms.length} existing firms`)

  // Build normalized lookup map
  const firmMap = new Map()
  for (const f of firms) {
    firmMap.set(normalize(f.name), f.firm_id)
  }

  // Get next firm_id number (firms use format f00001, f00002...)
  const maxNum = firms.reduce((max, f) => {
    const n = parseInt(f.firm_id?.replace(/\D/g, '') || '0')
    return n > max ? n : max
  }, 0)
  let nextNum = maxNum + 1

  const stats = { angel: 0, matched: 0, created: 0, errors: 0 }

  for (const inv of investors) {
    const raw = (inv.firm_name_raw || '').trim()

    if (!raw) {
      // Angel / no firm → assign f00000
      const { error } = await supabase
        .from('investors')
        .update({ firm_id: 'f00000' })
        .eq('contact_id', inv.contact_id)
      if (error) { console.error(`  Error updating ${inv.contact_id}:`, error.message); stats.errors++ }
      else { console.log(`  [ANGEL] ${inv.contact_id} → f00000`); stats.angel++ }
      continue
    }

    const key = normalize(raw)
    let firmId = firmMap.get(key)

    if (firmId) {
      // Exact match found
      const { error } = await supabase
        .from('investors')
        .update({ firm_id: firmId })
        .eq('contact_id', inv.contact_id)
      if (error) { console.error(`  Error updating ${inv.contact_id}:`, error.message); stats.errors++ }
      else { console.log(`  [MATCH] ${inv.contact_id} "${raw}" → ${firmId}`); stats.matched++ }
    } else {
      // New firm — create it
      const newFirmId = 'f' + String(nextNum).padStart(5, '0')
      nextNum++

      const { error: insertErr } = await supabase
        .from('firms')
        .insert({ firm_id: newFirmId, name: raw })

      if (insertErr) {
        console.error(`  Error creating firm "${raw}":`, insertErr.message)
        stats.errors++
        continue
      }

      firmMap.set(key, newFirmId)

      const { error: updateErr } = await supabase
        .from('investors')
        .update({ firm_id: newFirmId })
        .eq('contact_id', inv.contact_id)

      if (updateErr) { console.error(`  Error updating ${inv.contact_id}:`, updateErr.message); stats.errors++ }
      else { console.log(`  [NEW FIRM] ${inv.contact_id} "${raw}" → ${newFirmId}`); stats.created++ }
    }
  }

  console.log('\n--- Done ---')
  console.log(`Angels (f00000): ${stats.angel}`)
  console.log(`Matched existing firm: ${stats.matched}`)
  console.log(`New firms created: ${stats.created}`)
  console.log(`Errors: ${stats.errors}`)
}

main()
