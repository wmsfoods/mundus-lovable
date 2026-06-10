import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

const ALLOWED_SCHEMA = 'wmsfoods'
const ALLOWED_TABLE = 'meat_export'
const FQ_TABLE = `"${ALLOWED_SCHEMA}"."${ALLOWED_TABLE}"`
const MAX_TABLE_ROWS = 5000
const MAX_GROUPED_ROWS = 500
const AGGS = new Set(['sum', 'avg', 'count', 'min', 'max'])
const OPS = new Set(['eq', 'in', 'gte', 'lte', 'between', 'ilike'])
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type Column = { column_name: string; data_type: string }
type SchemaPayload = {
  columns: Column[]
  rowCount: number
  distincts: Record<string, string[]>
}

function isNumericType(t: string) {
  return /int|numeric|decimal|double|real|float|money/i.test(t)
}
function isTextType(t: string) {
  return /char|text|citext/i.test(t)
}

async function withPg<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const url = Deno.env.get('AGROSTATS_DB_URL')
  if (!url) throw new Error('AGROSTATS_DB_URL secret not configured')
  const client = new Client({ connection: { attempts: 1 }, tls: { enabled: true, enforce: true }, ...parseConnString(url) })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    try { await client.end() } catch { /* ignore */ }
  }
}

function parseConnString(url: string) {
  // deno postgres accepts connection strings via hostname/port/etc options
  const u = new URL(url)
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    hostname: u.hostname,
    port: Number(u.port || 5432),
    database: u.pathname.replace(/^\//, ''),
  }
}

async function buildSchemaPayload(): Promise<SchemaPayload> {
  return await withPg(async (c) => {
    const colsRes = await c.queryObject<Column>(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position`,
      [ALLOWED_SCHEMA, ALLOWED_TABLE],
    )
    const columns = colsRes.rows
    const countRes = await c.queryObject<{ c: bigint }>(`SELECT COUNT(*)::bigint AS c FROM ${FQ_TABLE}`)
    const rowCount = Number(countRes.rows[0]?.c ?? 0)

    const distincts: Record<string, string[]> = {}
    for (const col of columns) {
      if (!isTextType(col.data_type)) continue
      const cardRes = await c.queryObject<{ c: bigint }>(
        `SELECT COUNT(DISTINCT "${col.column_name}")::bigint AS c FROM ${FQ_TABLE}`,
      )
      const card = Number(cardRes.rows[0]?.c ?? 0)
      if (card > 0 && card <= 300) {
        const valRes = await c.queryObject<{ v: string | null }>(
          `SELECT DISTINCT "${col.column_name}"::text AS v FROM ${FQ_TABLE}
            WHERE "${col.column_name}" IS NOT NULL
            ORDER BY 1 LIMIT 300`,
        )
        distincts[col.column_name] = valRes.rows.map((r) => r.v ?? '').filter(Boolean)
      }
    }
    return { columns, rowCount, distincts }
  })
}

function quoteIdent(name: string) {
  return `"${name.replace(/"/g, '""')}"`
}

function validateColumn(name: unknown, schema: SchemaPayload): string {
  if (typeof name !== 'string') throw new Error(`Invalid column: ${name}`)
  const found = schema.columns.find((c) => c.column_name === name)
  if (!found) throw new Error(`Unknown column: ${name}`)
  return name
}

function buildQuery(payload: any, schema: SchemaPayload): { sql: string; args: unknown[] } {
  const dimensions: string[] = Array.isArray(payload.dimensions) ? payload.dimensions : []
  const measures: { column: string; agg: string }[] = Array.isArray(payload.measures) ? payload.measures : []
  const filters: { column: string; op: string; value: any }[] = Array.isArray(payload.filters) ? payload.filters : []
  const orderBy = payload.orderBy ?? null
  const grouped = dimensions.length > 0
  const limitReq = Number(payload.limit ?? (grouped ? MAX_GROUPED_ROWS : 1000))
  const limit = Math.min(Math.max(1, Math.floor(limitReq)), grouped ? MAX_GROUPED_ROWS : MAX_TABLE_ROWS)

  for (const d of dimensions) validateColumn(d, schema)
  for (const m of measures) {
    validateColumn(m.column, schema)
    if (!AGGS.has(m.agg)) throw new Error(`Invalid aggregator: ${m.agg}`)
  }
  for (const f of filters) {
    validateColumn(f.column, schema)
    if (!OPS.has(f.op)) throw new Error(`Invalid op: ${f.op}`)
  }

  const args: unknown[] = []
  const ph = (v: unknown) => {
    args.push(v)
    return `$${args.length}`
  }

  const selectParts: string[] = []
  const aliases: string[] = []
  if (grouped) {
    for (const d of dimensions) {
      const a = `dim_${d}`
      selectParts.push(`${quoteIdent(d)} AS ${quoteIdent(a)}`)
      aliases.push(a)
    }
    for (const m of measures) {
      const a = `${m.agg}_${m.column}`
      const expr = m.agg === 'count'
        ? `COUNT(${quoteIdent(m.column)})`
        : `${m.agg.toUpperCase()}(${quoteIdent(m.column)})`
      selectParts.push(`${expr} AS ${quoteIdent(a)}`)
      aliases.push(a)
    }
  } else {
    if (measures.length > 0) {
      for (const m of measures) {
        const a = `${m.agg}_${m.column}`
        const expr = m.agg === 'count'
          ? `COUNT(${quoteIdent(m.column)})`
          : `${m.agg.toUpperCase()}(${quoteIdent(m.column)})`
        selectParts.push(`${expr} AS ${quoteIdent(a)}`)
        aliases.push(a)
      }
    } else {
      selectParts.push('*')
    }
  }

  const whereParts: string[] = []
  for (const f of filters) {
    const col = quoteIdent(f.column)
    switch (f.op) {
      case 'eq': whereParts.push(`${col} = ${ph(f.value)}`); break
      case 'gte': whereParts.push(`${col} >= ${ph(f.value)}`); break
      case 'lte': whereParts.push(`${col} <= ${ph(f.value)}`); break
      case 'ilike': whereParts.push(`${col}::text ILIKE ${ph(`%${String(f.value)}%`)}`); break
      case 'between': {
        if (!Array.isArray(f.value) || f.value.length !== 2) throw new Error('between requires [min,max]')
        whereParts.push(`${col} BETWEEN ${ph(f.value[0])} AND ${ph(f.value[1])}`)
        break
      }
      case 'in': {
        const arr = Array.isArray(f.value) ? f.value : [f.value]
        if (arr.length === 0) { whereParts.push('FALSE'); break }
        const placeholders = arr.map((v) => ph(v)).join(', ')
        whereParts.push(`${col} IN (${placeholders})`)
        break
      }
    }
  }

  let sql = `SELECT ${selectParts.join(', ')} FROM ${FQ_TABLE}`
  if (whereParts.length) sql += ` WHERE ${whereParts.join(' AND ')}`
  if (grouped) sql += ` GROUP BY ${dimensions.map(quoteIdent).join(', ')}`
  if (orderBy && typeof orderBy.column === 'string') {
    validateColumnOrAlias(orderBy.column, schema, aliases)
    const dir = orderBy.direction === 'asc' ? 'ASC' : 'DESC'
    sql += ` ORDER BY ${quoteIdent(orderBy.column)} ${dir}`
  }
  sql += ` LIMIT ${limit}`
  return { sql, args }
}

function validateColumnOrAlias(name: string, schema: SchemaPayload, aliases: string[]) {
  if (aliases.includes(name)) return
  validateColumn(name, schema)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    // Auth: require admin
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
    const token = authHeader.slice(7).trim()
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supaUser = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: userErr } = await supaUser.auth.getUser(token)
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)
    const { data: isAdmin, error: adminErr } = await supaUser.rpc('is_mundus_admin')
    if (adminErr || isAdmin !== true) return json({ error: 'Forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const action = body.action
    const supaSrv = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })

    if (action === 'introspect') {
      const forceRefresh = body.forceRefresh === true
      if (!forceRefresh) {
        const { data: cached } = await supaSrv
          .from('agrostats_schema_cache')
          .select('payload, refreshed_at')
          .order('refreshed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cached?.payload && cached.refreshed_at) {
          const age = Date.now() - new Date(cached.refreshed_at).getTime()
          if (age < CACHE_TTL_MS) {
            return json({ ok: true, cached: true, refreshedAt: cached.refreshed_at, ...cached.payload })
          }
        }
      }
      const payload = await buildSchemaPayload()
      const refreshedAt = new Date().toISOString()
      // truncate to keep only newest
      await supaSrv.from('agrostats_schema_cache').delete().not('id', 'is', null)
      await supaSrv.from('agrostats_schema_cache').insert({ payload, refreshed_at: refreshedAt })
      return json({ ok: true, cached: false, refreshedAt, ...payload })
    }

    if (action === 'query') {
      // Get schema (from cache; refresh if missing)
      let schema: SchemaPayload | null = null
      const { data: cached } = await supaSrv
        .from('agrostats_schema_cache')
        .select('payload')
        .order('refreshed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cached?.payload) schema = cached.payload as SchemaPayload
      if (!schema) schema = await buildSchemaPayload()

      const { sql, args } = buildQuery(body, schema)
      const rows = await withPg(async (c) => {
        const res = await c.queryObject({ text: sql, args, camelcase: false })
        return res.rows
      })
      // Serialize bigints
      const safeRows = rows.map((r: any) => {
        const out: any = {}
        for (const k of Object.keys(r)) {
          const v = r[k]
          out[k] = typeof v === 'bigint' ? Number(v) : v
        }
        return out
      })
      return json({ ok: true, rowCount: safeRows.length, rows: safeRows })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    const msg = (e as Error).message ?? String(e)
    console.error('[agrostats-market-data]', msg)
    const status = msg.includes('AGROSTATS_DB_URL') ? 500 : 400
    return json({ error: msg }, status)
  }
})
