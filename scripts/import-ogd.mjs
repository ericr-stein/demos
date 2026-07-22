#!/usr/bin/env node
/**
 * Generic OGD CSV → Postgres importer.
 *
 *   node scripts/import-ogd.mjs <csv-url> <table_name>
 *
 * Streams the CSV, infers column types (int / numeric / text) from a sample,
 * (re)creates the table, bulk-loads via COPY, and registers the dataset in
 * the _datasets meta table that the API's generic fetch layer reads.
 *
 * Run it inside the stack (direct postgres connection, COPY needs a session):
 *   docker compose run --rm -e PGHOST=postgres -e PGPORT=5432 api \
 *     node scripts/import-ogd.mjs <url> <table>
 */
import { parse } from 'csv-parse'
import pg from 'pg'
import { from as copyFrom } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const [url, table] = process.argv.slice(2)
if (!url || !table || !/^[a-z][a-z0-9_]*$/.test(table)) {
  console.error('usage: import-ogd.mjs <csv-url> <table_name (snake_case)>')
  process.exit(1)
}

const client = new pg.Client({
  host: process.env.PGHOST ?? 'postgres',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'demos_role',
  password: process.env.DEMOS_DB_PASSWORD,
  database: process.env.PGDATABASE ?? 'demos_db',
})

const isInt = (v) => /^-?\d+$/.test(v)
const isNum = (v) => /^-?\d+(\.\d+)?$/.test(v)
const ident = (name) => `"${name.replaceAll('"', '""')}"`

console.log(`fetching ${url} ...`)
const res = await fetch(url)
if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`)
const body = Buffer.from(await res.arrayBuffer())
console.log(`downloaded ${(body.length / 1e6).toFixed(1)} MB`)

// Pass 1: header + type inference from a sample
const sample = []
const sampler = parse(body, { to: 5000, columns: false })
for await (const row of sampler) sample.push(row)
const header = sample.shift()
const types = header.map((_, i) => {
  const vals = sample.map((r) => r[i]).filter((v) => v !== '')
  if (vals.length === 0) return 'text'
  if (vals.every(isInt)) return 'bigint'
  if (vals.every(isNum)) return 'numeric'
  return 'text'
})

await client.connect()
try {
  await client.query('BEGIN')
  await client.query(`DROP TABLE IF EXISTS ${ident(table)}`)
  const colsDdl = header.map((c, i) => `${ident(c)} ${types[i]}`).join(', ')
  await client.query(`CREATE TABLE ${ident(table)} (${colsDdl})`)

  const copyStream = client.query(
    copyFrom(
      `COPY ${ident(table)} FROM STDIN WITH (FORMAT csv, HEADER true, NULL '')`,
    ),
  )
  await pipeline(Readable.from(body), copyStream)

  const {
    rows: [{ count }],
  } = await client.query(`SELECT count(*)::bigint AS count FROM ${ident(table)}`)

  await client.query(
    `INSERT INTO _datasets (table_name, source_url, row_count, columns, imported_at)
     VALUES ($1, $2, $3,
       (SELECT jsonb_object_agg(column_name, data_type) FROM information_schema.columns
        WHERE table_name::text = $1 AND table_schema = 'public'), now())
     ON CONFLICT (table_name) DO UPDATE SET
       source_url = EXCLUDED.source_url, row_count = EXCLUDED.row_count,
       columns = EXCLUDED.columns, imported_at = EXCLUDED.imported_at`,
    [table, url, count],
  )
  await client.query('COMMIT')
  console.log(`imported ${count} rows into ${table} (${header.length} columns)`)
  console.table(header.map((c, i) => ({ column: c, type: types[i] })))
} catch (err) {
  await client.query('ROLLBACK')
  throw err
} finally {
  await client.end()
}
