import http from 'node:http'
import pg from 'pg'

// Connects via pgBouncer; DEMOS_DB_PASSWORD is injected from Infisical.
const pool = new pg.Pool({
  host: process.env.PGHOST ?? 'pgbouncer',
  port: Number(process.env.PGPORT ?? 6432),
  user: process.env.PGUSER ?? 'demos_role',
  password: process.env.DEMOS_DB_PASSWORD,
  database: process.env.PGDATABASE ?? 'demos_db',
  max: 5,
})

const PORT = Number(process.env.PORT ?? 3000)
const MAX_LIMIT = 10_000

/** Cached dataset registry: table_name → { columns: Record<name, type> } */
let registry = new Map()
let registryLoaded = 0

async function loadRegistry() {
  if (Date.now() - registryLoaded < 60_000 && registry.size > 0) return registry
  const { rows } = await pool.query('SELECT table_name, columns FROM _datasets')
  registry = new Map(rows.map((r) => [r.table_name, r.columns]))
  registryLoaded = Date.now()
  return registry
}

const ident = (name) => `"${name.replaceAll('"', '""')}"`

/**
 * Generic dataset fetch. Every table registered in _datasets is queryable:
 *
 *   GET /api/data/<table>?<col>=<val>          exact filter (repeatable, ANDed;
 *                                              comma-separated value = IN list)
 *   &select=a,b            project columns
 *   &group_by=a,b&sum=c    aggregate: SELECT a,b,SUM(c) GROUP BY a,b
 *   &order=col[.desc]      sort
 *   &limit=&offset=        page (default 1000, max 10000)
 *
 * Columns are validated against the registry; values are parameterized.
 */
async function handleData(table, params, res) {
  const columns = (await loadRegistry()).get(table)
  if (!columns) return json(res, 404, { error: `unknown dataset '${table}'` })

  const checkCol = (c) => {
    if (!(c in columns)) throw new Error(`unknown column '${c}'`)
    return c
  }

  const where = []
  const values = []
  const reserved = new Set(['select', 'group_by', 'sum', 'order', 'limit', 'offset'])
  for (const [key, raw] of params) {
    if (reserved.has(key)) continue
    checkCol(key)
    const list = raw.split(',')
    if (list.length > 1) {
      values.push(list)
      where.push(`${ident(key)} = ANY($${values.length})`)
    } else {
      values.push(raw)
      where.push(`${ident(key)} = $${values.length}`)
    }
  }

  const groupBy = params.get('group_by')?.split(',').map(checkCol) ?? []
  const sums = params.get('sum')?.split(',').map(checkCol) ?? []
  let selectSql
  if (groupBy.length > 0) {
    const aggs = (sums.length > 0 ? sums : []).map(
      (c) => `SUM(${ident(c)})::bigint AS ${ident(c)}`,
    )
    selectSql = [...groupBy.map(ident), ...aggs].join(', ')
  } else {
    const cols = params.get('select')?.split(',').map(checkCol)
    selectSql = cols ? cols.map(ident).join(', ') : '*'
  }

  let orderSql = ''
  const order = params.get('order')
  if (order) {
    const [col, dir] = order.split('.')
    checkCol(col)
    orderSql = ` ORDER BY ${ident(col)} ${dir === 'desc' ? 'DESC' : 'ASC'}`
  }

  const limit = Math.min(Number(params.get('limit') ?? 1000), MAX_LIMIT)
  const offset = Number(params.get('offset') ?? 0)

  let sql = `SELECT ${selectSql} FROM ${ident(table)}`
  if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`
  if (groupBy.length > 0) sql += ` GROUP BY ${groupBy.map(ident).join(', ')}`
  sql += orderSql
  values.push(limit, offset)
  sql += ` LIMIT $${values.length - 1} OFFSET $${values.length}`

  const { rows } = await pool.query(sql, values)
  json(res, 200, { table, count: rows.length, rows })
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  try {
    if (url.pathname === '/api/health') {
      await pool.query('SELECT 1')
      return json(res, 200, { ok: true })
    }
    if (url.pathname === '/api/datasets') {
      const { rows } = await pool.query('SELECT * FROM _datasets ORDER BY table_name')
      return json(res, 200, rows)
    }
    const m = url.pathname.match(/^\/api\/data\/([a-z0-9_]+)$/)
    if (m) return await handleData(m[1], url.searchParams, res)
    json(res, 404, { error: 'not found' })
  } catch (err) {
    const msg = String(err.message ?? err)
    json(res, msg.startsWith('unknown column') ? 400 : 500, { error: msg })
  }
})

server.listen(PORT, () => console.log(`demos-api listening on :${PORT}`))
