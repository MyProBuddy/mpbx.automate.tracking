// Deduplication script for investors and firms.
// Finds duplicates by email (investors) and name (firms), keeps oldest, removes rest.
// Run: node scripts/dedup.mjs [--dry-run]
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
const DRY_RUN = process.argv.includes('--dry-run')

if (DRY_RUN) console.log('[DRY RUN MODE — no changes will be made]\n')

function normalize(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

async function dedupInvestors() {
  console.log('=== Deduplicating Investors (by email) ===')
  const { data, error } = await supabase
    .from('investors')
    .select('contact_id, email, first_name, last_name')
    .not('email', 'is', null)
    .order('contact_id', { ascending: true })

  if (error) { console.error('Error:', error.message); return }

  const seen = new Map()
  const dupes = []

  for (const inv of data) {
    const key = (inv.email || '').toLowerCase().trim()
    if (!key) continue
    if (seen.has(key)) {
      dupes.push({ keep: seen.get(key), remove: inv })
    } else {
      seen.set(key, inv)
    }
  }

  console.log(`Found ${dupes.length} duplicate investors`)
  for (const { keep, remove } of dupes) {
    console.log(`  DUPE: ${remove.contact_id} (${remove.first_name} ${remove.last_name}) → keep ${keep.contact_id}`)
    if (!DRY_RUN) {
      // Reassign any tracking/thread records to the kept investor first
      await supabase.from('tracking').update({ inv_id: keep.contact_id }).eq('inv_id', remove.contact_id)
      await supabase.from('thread_tracking').update({ inv_id: keep.contact_id }).eq('inv_id', remove.contact_id)
      await supabase.from('conversation_log').update({ inv_id: keep.contact_id }).eq('inv_id', remove.contact_id)
      const { error: delErr } = await supabase.from('investors').delete().eq('contact_id', remove.contact_id)
      if (delErr) console.error(`    Error deleting ${remove.contact_id}:`, delErr.message)
      else console.log(`    Deleted ${remove.contact_id}`)
    }
  }
}

async function dedupFirms() {
  console.log('\n=== Deduplicating Firms (by normalized name) ===')
  const { data, error } = await supabase
    .from('firms')
    .select('firm_id, name')
    .order('firm_id', { ascending: true })

  if (error) { console.error('Error:', error.message); return }

  const seen = new Map()
  const dupes = []

  for (const firm of data) {
    const key = normalize(firm.name)
    if (!key) continue
    if (seen.has(key)) {
      dupes.push({ keep: seen.get(key), remove: firm })
    } else {
      seen.set(key, firm)
    }
  }

  console.log(`Found ${dupes.length} duplicate firms`)
  for (const { keep, remove } of dupes) {
    console.log(`  DUPE: ${remove.firm_id} "${remove.name}" → keep ${keep.firm_id}`)
    if (!DRY_RUN) {
      await supabase.from('investors').update({ firm_id: keep.firm_id }).eq('firm_id', remove.firm_id)
      const { error: delErr } = await supabase.from('firms').delete().eq('firm_id', remove.firm_id)
      if (delErr) console.error(`    Error deleting ${remove.firm_id}:`, delErr.message)
      else console.log(`    Deleted ${remove.firm_id}`)
    }
  }
}

async function main() {
  await dedupInvestors()
  await dedupFirms()
  console.log('\nDone.')
}

main()
