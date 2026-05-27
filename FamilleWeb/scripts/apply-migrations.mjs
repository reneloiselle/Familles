#!/usr/bin/env node
/**
 * Applique les migrations SQL numérotées vers Supabase Postgres.
 * Usage:
 *   SUPABASE_DB_PASSWORD='votre_mdp' node scripts/apply-migrations.mjs
 *   SUPABASE_DB_PASSWORD='...' node scripts/apply-migrations.mjs 023 024 025
 */
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim()
    }
  } catch {
    // ignore
  }
}

loadEnvFile(join(root, '.env'))
loadEnvFile(join(root, '.env.local'))
loadEnvFile(join(root, '.env.migrations.local'))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const password =
  process.env.SUPABASE_DB_PASSWORD ||
  process.env.DATABASE_PASSWORD ||
  process.env.PGPASSWORD

if (!url) {
  console.error('NEXT_PUBLIC_SUPABASE_URL manquant (.env)')
  process.exit(1)
}
if (!password) {
  console.error(
    'Mot de passe DB requis: SUPABASE_DB_PASSWORD (Supabase → Settings → Database)'
  )
  process.exit(1)
}

const ref = url.replace('https://', '').replace('.supabase.co', '').trim()
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`

const migrationsDir = join(root, 'supabase', 'migrations')
const filter = process.argv.slice(2)

let files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

if (filter.length > 0) {
  files = files.filter((f) => filter.some((n) => f.startsWith(n)))
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await client.connect()
  console.log(`Connecté — projet ${ref} — ${files.length} migration(s)`)

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    console.log(`→ ${file}`)
    await client.query(sql)
    console.log(`  OK`)
  }

  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('products', 'stores', 'product_store_placements')
    ORDER BY 1
  `)
  console.log('Tables catalogue:', rows.map((r) => r.table_name).join(', ') || '(aucune)')

  const col = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'shared_list_items' AND column_name = 'product_id'
  `)
  console.log('shared_list_items.product_id:', col.rows.length ? 'présent' : 'absent')

  await client.end()
  console.log('Terminé.')
}

main().catch((err) => {
  console.error('Échec:', err.message)
  process.exit(1)
})
