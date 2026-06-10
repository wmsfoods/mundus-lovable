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
const REPORT_CACHE_TTL_MS = 12 * 60 * 60 * 1000

const DB_HOST = 'ep-mute-recipe-acwzxxog-pooler.sa-east-1.aws.neon.tech'
const DB_PORT = 5432
const DB_NAME = 'Meat_Export_BR'
const DB_USER = 'wmsfoods_ro'

const COL = {
  date: 'Dates Long Haul/Date',
  shipper: 'Company_Shipper/Shipper Name',
  consignee: 'Company_Consignee/Consignee Name',
  destCountry: 'Place_and_Ports/DEST_Country',
  destPort: 'Place_and_Ports/DEST_Name',
  polPort: 'Place_and_Ports/POL_Name',
  product: 'Commodity_HS/HS8 Portugues',
  wt: 'WTMT',
  fob: 'FOB VALUE USD',
  shipperType: 'Company_Shipper/Type',
  consigneeType: 'Company_Consignee/Type',
  shipperState: 'Company_Shipper/State',
  consigneeCountry: 'Company_Consignee/Country',
}
const Q = (c: string) => `"${c.replace(/"/g, '""')}"`

type Column = { column_name: string; data_type: string }
type SchemaPayload = {
  columns: Column[]
  rowCount: number
  distincts: Record<string, string[]>
  dateFormat?: 'ISO' | 'DMY' | 'MDY' | 'UNKNOWN'
  monthExpr?: string
}

function isNumericType(t: string) {
  return /int|numeric|decimal|double|real|float|money/i.test(t)
}
function isTextType(t: string) {
  return /char|text|citext/i.test(t)
}

async function withPg<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const password = Deno.env.get('AGROSTATS_DB_PASSWORD')?.trim()
  if (!password) throw new Error('AGROSTATS_DB_PASSWORD secret not configured')

  const client = await connectAgrostats(password)
  try {
    return await fn(client)
  } finally {
    try { await client.end() } catch { /* ignore */ }
  }
}

function sanitizedDbInfo(passwordLength: number) {
  return {
    hostname: DB_HOST,
    database: DB_NAME,
    username: DB_USER,
    passwordPresent: passwordLength > 0,
    passwordLength,
  }
}

function classifyConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  if (lower.includes('password') || lower.includes('auth') || lower.includes('28p01')) {
    return { message, hint: 'Auth failed — wrong password' }
  }
  if (lower.includes('tls') || lower.includes('ssl') || lower.includes('certificate') || lower.includes('handshake')) {
    return { message, hint: 'TLS error' }
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('dns') || lower.includes('resolve') || lower.includes('network')) {
    return { message, hint: 'Network or timeout connecting to Agro Statistics database' }
  }

  return { message, hint: 'Unable to connect to Agro Statistics database' }
}

async function connectAgrostats(password: string): Promise<Client> {
  const diagnostics = sanitizedDbInfo(password.length)
  try {
    const client = new Client({
      hostname: DB_HOST,
      port: DB_PORT,
      database: DB_NAME,
      user: DB_USER,
      password,
      tls: { enabled: true, enforce: false },
    })
    await client.connect()
    return client
  } catch (error) {
    const classified = classifyConnectionError(error)
    console.error('[agrostats-market-data] connection failed', diagnostics)
    const err = new Error(classified.message) as Error & { hint?: string }
    err.hint = classified.hint
    throw err
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
    const dateInfo = await detectDateFormat(c)
    return { columns, rowCount, distincts, ...dateInfo }
  })
}

async function detectDateFormat(c: Client): Promise<{ dateFormat: 'ISO' | 'DMY' | 'MDY' | 'UNKNOWN'; monthExpr: string }> {
  const dateCol = Q(COL.date)
  try {
    const res = await c.queryObject<{ v: string | null }>(
      `SELECT ${dateCol}::text AS v FROM ${FQ_TABLE}
        WHERE ${dateCol} IS NOT NULL LIMIT 50`,
    )
    const samples = res.rows.map((r) => (r.v ?? '').trim()).filter(Boolean)
    let iso = 0, dmy = 0, mdy = 0
    for (const s of samples) {
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) iso++
      else if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
        const [a, b] = s.split('/').map(Number)
        if (a > 12) dmy++
        else if (b > 12) mdy++
        else dmy++ // tie-break to DMY (Brazilian default)
      }
    }
    if (iso >= dmy && iso >= mdy && iso > 0) {
      return { dateFormat: 'ISO', monthExpr: `LEFT(${dateCol}::text, 7)` }
    }
    if (dmy >= mdy && dmy > 0) {
      return { dateFormat: 'DMY', monthExpr: `SUBSTR(${dateCol}::text, 7, 4) || '-' || SUBSTR(${dateCol}::text, 4, 2)` }
    }
    if (mdy > 0) {
      return { dateFormat: 'MDY', monthExpr: `SUBSTR(${dateCol}::text, 7, 4) || '-' || SUBSTR(${dateCol}::text, 1, 2)` }
    }
  } catch (e) {
    console.error('[detectDateFormat] failed', (e as Error).message)
  }
  return { dateFormat: 'UNKNOWN', monthExpr: `LEFT(${dateCol}::text, 7)` }
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
    const dir = orderBy.direction === 'asc' ? 'ASC' : 'DESC'
    const orderExpr = resolveOrderExpr(orderBy.column, schema, aliases)
    sql += ` ORDER BY ${orderExpr} ${dir}`
  }
  sql += ` LIMIT ${limit}`
  return { sql, args }
}

function resolveOrderExpr(name: string, schema: SchemaPayload, aliases: string[]): string {
  // 1. Exact alias from SELECT list
  if (aliases.includes(name)) return quoteIdent(name)
  // 2. Real column
  if (schema.columns.find((c) => c.column_name === name)) return quoteIdent(name)
  // 3. Pattern "<agg>_<column>" — emit the aggregate expression directly
  const m = name.match(/^(sum|avg|count|min|max)_(.+)$/i)
  if (m) {
    const agg = m[1].toLowerCase()
    const col = m[2]
    if (AGGS.has(agg) && schema.columns.find((c) => c.column_name === col)) {
      return agg === 'count'
        ? `COUNT(${quoteIdent(col)})`
        : `${agg.toUpperCase()}(${quoteIdent(col)})`
    }
  }
  throw new Error(`Unknown column: ${name}`)
}

// ============================================================================
// REPORTS
// ============================================================================

type ReportFilters = {
  dateFrom?: string
  dateTo?: string
  products?: string[]
  destCountries?: string[]
  shippers?: string[]
  consignees?: string[]
  polPorts?: string[]
}
type ReportExtra = { shipper?: string; consignee?: string; product?: string }

function buildFilterClause(filters: ReportFilters, args: unknown[], extra: ReportExtra = {}) {
  const parts: string[] = []
  const ph = (v: unknown) => { args.push(v); return `$${args.length}` }
  const inClause = (col: string, vals?: string[]) => {
    if (!vals || vals.length === 0) return
    parts.push(`${Q(col)} IN (${vals.map((v) => ph(v)).join(', ')})`)
  }
  if (filters.dateFrom) parts.push(`${Q(COL.date)} >= ${ph(filters.dateFrom)}`)
  if (filters.dateTo) parts.push(`${Q(COL.date)} <= ${ph(filters.dateTo)}`)
  inClause(COL.product, filters.products)
  inClause(COL.destCountry, filters.destCountries)
  inClause(COL.shipper, filters.shippers)
  inClause(COL.consignee, filters.consignees)
  inClause(COL.polPort, filters.polPorts)
  if (extra.shipper) parts.push(`${Q(COL.shipper)} = ${ph(extra.shipper)}`)
  if (extra.consignee) parts.push(`${Q(COL.consignee)} = ${ph(extra.consignee)}`)
  if (extra.product) parts.push(`${Q(COL.product)} = ${ph(extra.product)}`)
  return { where: parts.length ? `WHERE ${parts.join(' AND ')}` : '', hasWhere: parts.length > 0 }
}

function previousPeriod(filters: ReportFilters): ReportFilters | null {
  if (!filters.dateFrom || !filters.dateTo) return null
  const from = new Date(filters.dateFrom)
  const to = new Date(filters.dateTo)
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null
  const diff = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 86400000)
  const prevFrom = new Date(prevTo.getTime() - diff)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { ...filters, dateFrom: iso(prevFrom), dateTo: iso(prevTo) }
}

function serializeRow(r: any) {
  if (!r) return r
  const out: any = {}
  for (const k of Object.keys(r)) {
    const v = r[k]
    if (typeof v === 'bigint') out[k] = Number(v)
    else if (v instanceof Date) out[k] = v.toISOString().slice(0, 10)
    else out[k] = v
  }
  return out
}

async function fetchKpis(c: Client, filters: ReportFilters) {
  const args: unknown[] = []
  const { where } = buildFilterClause(filters, args)
  const sql = `
    SELECT
      COALESCE(SUM(${Q(COL.wt)}), 0)::float8 AS vol_ton,
      COALESCE(SUM(${Q(COL.fob)}), 0)::float8 AS fob_usd,
      COUNT(*)::bigint AS shipments,
      COUNT(DISTINCT ${Q(COL.shipper)})::bigint AS shippers,
      COUNT(DISTINCT ${Q(COL.consignee)})::bigint AS consignees,
      COUNT(DISTINCT ${Q(COL.destCountry)})::bigint AS destinations
    FROM ${FQ_TABLE} ${where}
  `
  const res = await c.queryObject<any>({ text: sql, args })
  return serializeRow(res.rows[0])
}

async function fetchMonthlySeries(c: Client, filters: ReportFilters) {
  const args: unknown[] = []
  const { where } = buildFilterClause(filters, args)
  const sql = `
    SELECT
      date_trunc('month', ${Q(COL.date)})::date AS month,
      COALESCE(SUM(${Q(COL.wt)}), 0)::float8 AS vol_ton,
      COALESCE(SUM(${Q(COL.fob)}), 0)::float8 AS fob_usd,
      CASE WHEN SUM(${Q(COL.wt)}) > 0 THEN SUM(${Q(COL.fob)})::float8 / SUM(${Q(COL.wt)})::float8 ELSE NULL END AS avg_price,
      COUNT(*)::bigint AS shipments
    FROM ${FQ_TABLE} ${where}
    GROUP BY 1 ORDER BY 1
  `
  const res = await c.queryObject<any>({ text: sql, args })
  return res.rows.map(serializeRow)
}

type GroupKind = 'shipper' | 'consignee' | 'destination' | 'dest_port' | 'product' | 'pol_port'
function groupCol(g: GroupKind): string {
  switch (g) {
    case 'shipper': return COL.shipper
    case 'consignee': return COL.consignee
    case 'destination': return COL.destCountry
    case 'dest_port': return COL.destPort
    case 'product': return COL.product
    case 'pol_port': return COL.polPort
  }
}
function counterpartCol(g: GroupKind): string {
  return g === 'shipper' ? COL.consignee : COL.shipper
}

async function fetchTopGroup(c: Client, g: GroupKind, filters: ReportFilters, limit = 15, extra: ReportExtra = {}) {
  const args: unknown[] = []
  const { where, hasWhere } = buildFilterClause(filters, args, extra)
  const col = Q(groupCol(g))
  const counter = Q(counterpartCol(g))
  const sql = `
    SELECT
      ${col} AS name,
      COALESCE(SUM(${Q(COL.wt)}), 0)::float8 AS vol_ton,
      COALESCE(SUM(${Q(COL.fob)}), 0)::float8 AS fob_usd,
      CASE WHEN SUM(${Q(COL.wt)}) > 0 THEN SUM(${Q(COL.fob)})::float8 / SUM(${Q(COL.wt)})::float8 ELSE NULL END AS avg_price,
      COUNT(*)::bigint AS shipments,
      COUNT(DISTINCT ${counter})::bigint AS counterparts
    FROM ${FQ_TABLE} ${where}
    ${hasWhere ? 'AND' : 'WHERE'} ${col} IS NOT NULL AND ${col} <> ''
    GROUP BY 1
    ORDER BY vol_ton DESC
    LIMIT ${Math.max(1, Math.min(100, limit))}
  `
  const res = await c.queryObject<any>({ text: sql, args })
  return res.rows.map(serializeRow)
}

async function fetchFlows(c: Client, filters: ReportFilters) {
  const args: unknown[] = []
  const { where, hasWhere } = buildFilterClause(filters, args)
  const sql = `
    SELECT
      ${Q(COL.shipper)} AS shipper,
      ${Q(COL.destCountry)} AS dest_country,
      COALESCE(SUM(${Q(COL.wt)}), 0)::float8 AS vol_ton,
      COALESCE(SUM(${Q(COL.fob)}), 0)::float8 AS fob_usd,
      CASE WHEN SUM(${Q(COL.wt)}) > 0 THEN SUM(${Q(COL.fob)})::float8 / SUM(${Q(COL.wt)})::float8 ELSE NULL END AS avg_price,
      COUNT(*)::bigint AS shipments
    FROM ${FQ_TABLE} ${where}
    ${hasWhere ? 'AND' : 'WHERE'} ${Q(COL.shipper)} IS NOT NULL AND ${Q(COL.destCountry)} IS NOT NULL
    GROUP BY 1, 2 ORDER BY vol_ton DESC LIMIT 50
  `
  const res = await c.queryObject<any>({ text: sql, args })
  return res.rows.map(serializeRow)
}

async function fetchPairs(c: Client, filters: ReportFilters) {
  const args: unknown[] = []
  const { where, hasWhere } = buildFilterClause(filters, args)
  const sql = `
    SELECT
      ${Q(COL.shipper)} AS shipper,
      ${Q(COL.consignee)} AS consignee,
      COALESCE(SUM(${Q(COL.wt)}), 0)::float8 AS vol_ton,
      COALESCE(SUM(${Q(COL.fob)}), 0)::float8 AS fob_usd,
      CASE WHEN SUM(${Q(COL.wt)}) > 0 THEN SUM(${Q(COL.fob)})::float8 / SUM(${Q(COL.wt)})::float8 ELSE NULL END AS avg_price,
      COUNT(*)::bigint AS shipments
    FROM ${FQ_TABLE} ${where}
    ${hasWhere ? 'AND' : 'WHERE'} ${Q(COL.shipper)} IS NOT NULL AND ${Q(COL.consignee)} IS NOT NULL
    GROUP BY 1, 2 ORDER BY vol_ton DESC LIMIT 50
  `
  const res = await c.queryObject<any>({ text: sql, args })
  return res.rows.map(serializeRow)
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function runReport(report: string, filters: ReportFilters, entity?: string) {
  return await withPg(async (c) => {
    switch (report) {
      case 'kpis': {
        const current = await fetchKpis(c, filters)
        const prevF = previousPeriod(filters)
        const previous = prevF ? await fetchKpis(c, prevF) : null
        return { current, previous }
      }
      case 'monthly_series':
        return { rows: await fetchMonthlySeries(c, filters) }
      case 'top_shippers':
        return { rows: await fetchTopGroup(c, 'shipper', filters) }
      case 'top_consignees':
        return { rows: await fetchTopGroup(c, 'consignee', filters) }
      case 'top_destinations':
        return { rows: await fetchTopGroup(c, 'destination', filters) }
      case 'top_products':
        return { rows: await fetchTopGroup(c, 'product', filters) }
      case 'top_pol_ports':
        return { rows: await fetchTopGroup(c, 'pol_port', filters) }
      case 'flows':
        return { rows: await fetchFlows(c, filters) }
      case 'pairs':
        return { rows: await fetchPairs(c, filters) }
      case 'shipper_profile': {
        if (!entity) throw new Error('entity required for shipper_profile')
        const extra: ReportExtra = { shipper: entity }
        const [monthly, consignees, destinations, products] = await Promise.all([
          fetchMonthlySeries(c, { ...filters, shippers: [entity] }),
          fetchTopGroup(c, 'consignee', filters, 5, extra),
          fetchTopGroup(c, 'destination', filters, 5, extra),
          fetchTopGroup(c, 'product', filters, 5, extra),
        ])
        return { monthly, consignees, destinations, products }
      }
      case 'consignee_profile': {
        if (!entity) throw new Error('entity required for consignee_profile')
        const extra: ReportExtra = { consignee: entity }
        const [monthly, shippers, destPorts, products] = await Promise.all([
          fetchMonthlySeries(c, { ...filters, consignees: [entity] }),
          fetchTopGroup(c, 'shipper', filters, 5, extra),
          fetchTopGroup(c, 'dest_port', filters, 5, extra),
          fetchTopGroup(c, 'product', filters, 5, extra),
        ])
        return { monthly, shippers, destPorts, products }
      }
      default:
        throw new Error(`Unknown report: ${report}`)
    }
  })
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

    if (action === 'report') {
      const report = String(body.report ?? '')
      const filters: ReportFilters = body.filters ?? {}
      const entity: string | undefined = body.entity
      const forceRefresh = body.forceRefresh === true
      const cacheKey = await sha256(JSON.stringify({ report, filters, entity }))

      if (!forceRefresh) {
        const { data: cached } = await supaSrv
          .from('agrostats_report_cache')
          .select('payload, refreshed_at')
          .eq('cache_key', cacheKey)
          .maybeSingle()
        if (cached?.payload && cached.refreshed_at) {
          const age = Date.now() - new Date(cached.refreshed_at).getTime()
          if (age < REPORT_CACHE_TTL_MS) {
            return json({ ok: true, cached: true, refreshedAt: cached.refreshed_at, report, data: cached.payload })
          }
        }
      }

      const data = await runReport(report, filters, entity)
      const refreshedAt = new Date().toISOString()
      await supaSrv
        .from('agrostats_report_cache')
        .upsert({ cache_key: cacheKey, payload: data, refreshed_at: refreshedAt }, { onConflict: 'cache_key' })
      return json({ ok: true, cached: false, refreshedAt, report, data })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    const msg = (e as Error).message ?? String(e)
    const hint = (e as Error & { hint?: string }).hint
    console.error('[agrostats-market-data]', msg)
    const status = msg.includes('AGROSTATS_DB_PASSWORD') || hint ? 500 : 400
    return json({ error: msg, ...(hint ? { hint } : {}) }, status)
  }
})
