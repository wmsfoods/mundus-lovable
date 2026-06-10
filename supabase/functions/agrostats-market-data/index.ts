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
const PANEL_CACHE_TTL_MS = 6 * 60 * 60 * 1000

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

// ============================================================================
// PANELS — new v2 API
// ============================================================================

type Temperature = 'frozen' | 'chilled'

type PanelFilters = {
  from?: string // YYYY-MM
  to?: string   // YYYY-MM
  hs8?: string[]
  hsCategory?: string[]
  temperature?: Temperature[]
  productSearch?: string
  productTypes?: string[]
  destCountry?: string[]
  polPort?: string[]
  shipperName?: string
  consigneeName?: string
  shipperNames?: string[]
  consigneeNames?: string[]
  consigneeCountry?: string[]
  shipperState?: string[]
  realOwnerOnly?: boolean
}

function getSchemaForPanels(): Promise<SchemaPayload> {
  return buildSchemaPayload()
}

function normalizeCategory(c: string): string {
  if (c === 'bovina_fresca' || c === 'bovina_congelada') return 'beef'
  if (c === 'suina') return 'pork'
  if (c === 'aves') return 'poultry'
  if (c === 'miudezas') return 'beef_offals'
  if (c === 'outros') return 'other_meats'
  return c
}

function hsCategoryClause(cats: string[]): string {
  if (!cats?.length) return ''
  const norm = Array.from(new Set(cats.map(normalizeCategory)))
  if (norm.includes('all' as any)) return ''
  const p = Q(COL.product)
  const parts: string[] = []
  const knownPrefixes = [
    `${p} LIKE '0201%'`, `${p} LIKE '0202%'`,
    `${p} LIKE '02061%'`, `${p} LIKE '02062%'`,
    `${p} LIKE '0203%'`, `${p} LIKE '02063%'`, `${p} LIKE '02064%'`,
    `${p} LIKE '0207%'`, `${p} LIKE '0210%'`, `${p} LIKE '0209%'`,
  ]
  for (const c of norm) {
    if (c === 'beef') parts.push(`(${p} LIKE '0201%' OR ${p} LIKE '0202%')`)
    else if (c === 'beef_offals') parts.push(`(${p} LIKE '02061%' OR ${p} LIKE '02062%')`)
    else if (c === 'pork') parts.push(`(${p} LIKE '0203%' OR ${p} LIKE '02063%' OR ${p} LIKE '02064%')`)
    else if (c === 'poultry') parts.push(`${p} LIKE '0207%'`)
    else if (c === 'cured_meats') parts.push(`${p} LIKE '0210%'`)
    else if (c === 'animal_fats') parts.push(`${p} LIKE '0209%'`)
    else if (c === 'other_meats') parts.push(`NOT (${knownPrefixes.join(' OR ')})`)
  }
  return parts.length ? `(${parts.join(' OR ')})` : ''
}

function temperatureClause(temps: Temperature[]): string {
  if (!temps?.length) return ''
  const wantF = temps.includes('frozen')
  const wantC = temps.includes('chilled')
  if (!wantF && !wantC) return ''
  const hs = `UPPER(${Q(COL.product)}::text)`
  const bl = `UPPER(COALESCE("Commodity Detail/BL Description"::text, ''))`
  const hasFrozenTag = `position('CONGELAD' in ${hs}) > 0`
  const hasChilledTag = `(position('FRESCAS OU REFRIGERADAS' in ${hs}) > 0 OR position('FRESCOS OU REFRIGERADOS' in ${hs}) > 0 OR position('FRESCA OU REFRIGERADA' in ${hs}) > 0)`
  const isFrozenDeterministic = `(${hasFrozenTag} AND NOT ${hasChilledTag})`
  const isChilledDeterministic = `(${hasChilledTag} AND NOT ${hasFrozenTag})`
  const ambiguous = `NOT (${hasFrozenTag} XOR ${hasChilledTag})`
  const blFrozen = `(position('FROZEN' in ${bl}) > 0 OR position('CONGELAD' in ${bl}) > 0)`
  const blChilled = `(position('CHILLED' in ${bl}) > 0 OR position('FRESH' in ${bl}) > 0 OR position('RESFRIAD' in ${bl}) > 0 OR position('REFRIGERAD' in ${bl}) > 0)`
  const parts: string[] = []
  if (wantF) parts.push(`(${isFrozenDeterministic} OR (${ambiguous} AND ${blFrozen}))`)
  if (wantC) parts.push(`(${isChilledDeterministic} OR (${ambiguous} AND ${blChilled}))`)
  return `(${parts.join(' OR ')})`
}

function buildPanelWhere(f: PanelFilters, monthExpr: string, args: unknown[], extraEq: { shipper?: string; consignee?: string } = {}): { where: string; hasWhere: boolean } {
  const parts: string[] = []
  const ph = (v: unknown) => { args.push(v); return `$${args.length}` }
  if (f.from) parts.push(`${monthExpr} >= ${ph(f.from)}`)
  if (f.to) parts.push(`${monthExpr} <= ${ph(f.to)}`)
  if (f.hs8?.length) parts.push(`${Q(COL.product)} IN (${f.hs8.map((v) => ph(v)).join(', ')})`)
  if (f.hsCategory?.length) {
    const c = hsCategoryClause(f.hsCategory)
    if (c) parts.push(c)
  }
  if (f.temperature?.length) {
    const c = temperatureClause(f.temperature)
    if (c) parts.push(c)
  }
  if (f.productSearch) {
    const v = ph('%' + f.productSearch + '%')
    parts.push(`(${Q(COL.product)} ILIKE ${v} OR "Commodity Detail/BL Description" ILIKE ${v})`)
  }
  if (f.productTypes?.length) {
    parts.push(`"Commodity Detail/BL Description" IN (${f.productTypes.map((v) => ph(v)).join(', ')})`)
  }
  if (f.destCountry?.length) parts.push(`${Q(COL.destCountry)} IN (${f.destCountry.map((v) => ph(v)).join(', ')})`)
  if (f.polPort?.length) parts.push(`${Q(COL.polPort)} IN (${f.polPort.map((v) => ph(v)).join(', ')})`)
  if (f.consigneeCountry?.length) parts.push(`${Q(COL.consigneeCountry)} IN (${f.consigneeCountry.map((v) => ph(v)).join(', ')})`)
  if (f.shipperState?.length) parts.push(`${Q(COL.shipperState)} IN (${f.shipperState.map((v) => ph(v)).join(', ')})`)
  if (f.shipperName) parts.push(`${Q(COL.shipper)} ILIKE ${ph('%' + f.shipperName + '%')}`)
  if (f.consigneeName) parts.push(`${Q(COL.consignee)} ILIKE ${ph('%' + f.consigneeName + '%')}`)
  if (f.shipperNames?.length) parts.push(`${Q(COL.shipper)} IN (${f.shipperNames.map((v) => ph(v)).join(', ')})`)
  if (f.consigneeNames?.length) parts.push(`${Q(COL.consignee)} IN (${f.consigneeNames.map((v) => ph(v)).join(', ')})`)
  if (f.realOwnerOnly !== false) {
    parts.push(`${Q(COL.consigneeType)} = 'REAL DONO'`)
    parts.push(`${Q(COL.shipperType)} = 'REAL DONO'`)
  }
  if (extraEq.shipper) parts.push(`${Q(COL.shipper)} = ${ph(extraEq.shipper)}`)
  if (extraEq.consignee) parts.push(`${Q(COL.consignee)} = ${ph(extraEq.consignee)}`)
  return { where: parts.length ? `WHERE ${parts.join(' AND ')}` : '', hasWhere: parts.length > 0 }
}

function previousMonthRange(from: string, to: string): { from: string; to: string } | null {
  // YYYY-MM strings
  const parse = (s: string) => { const [y, m] = s.split('-').map(Number); return y * 12 + (m - 1) }
  const fmt = (n: number) => { const y = Math.floor(n / 12); const m = (n % 12) + 1; return `${y}-${String(m).padStart(2, '0')}` }
  if (!/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to)) return null
  const a = parse(from), b = parse(to)
  const len = b - a + 1
  const prevTo = a - 1, prevFrom = prevTo - len + 1
  if (prevFrom < 0) return null
  return { from: fmt(prevFrom), to: fmt(prevTo) }
}

function dimensionToCol(d: string): string {
  switch (d) {
    case 'shipper': return COL.shipper
    case 'consignee': return COL.consignee
    case 'destCountry': return COL.destCountry
    case 'destPort': return COL.destPort
    case 'polPort': return COL.polPort
    case 'hs8': return COL.product
    case 'consigneeCountry': return COL.consigneeCountry
    case 'shipperState': return COL.shipperState
    default: throw new Error(`Invalid dimension: ${d}`)
  }
}

function counterpartOf(d: string): string | null {
  if (d === 'shipper') return COL.consignee
  if (d === 'consignee') return COL.shipper
  if (d === 'destCountry' || d === 'destPort') return COL.shipper
  if (d === 'hs8') return COL.shipper
  return null
}

async function panelKpis(c: Client, monthExpr: string, f: PanelFilters) {
  const compute = async (filters: PanelFilters) => {
    const args: unknown[] = []
    const { where } = buildPanelWhere(filters, monthExpr, args)
    const sql = `
      SELECT
        COALESCE(SUM(${Q(COL.wt)}), 0)::float8 AS volume,
        COALESCE(SUM(${Q(COL.fob)}), 0)::float8 AS fob,
        CASE WHEN SUM(${Q(COL.wt)}) > 0 THEN SUM(${Q(COL.fob)})::float8 / SUM(${Q(COL.wt)})::float8 ELSE NULL END AS avg_price_ton,
        COUNT(DISTINCT ${Q(COL.shipper)})::bigint AS shippers,
        COUNT(DISTINCT ${Q(COL.consignee)})::bigint AS consignees,
        COUNT(DISTINCT ${Q(COL.destCountry)})::bigint AS dest_countries
      FROM ${FQ_TABLE} ${where}
    `
    const r = await c.queryObject<any>({ text: sql, args })
    return serializeRow(r.rows[0])
  }
  const current = await compute(f)
  const prev = f.from && f.to ? previousMonthRange(f.from, f.to) : null
  const previous = prev ? await compute({ ...f, from: prev.from, to: prev.to }) : null
  return { current, previous }
}

async function panelMonthly(c: Client, monthExpr: string, f: PanelFilters) {
  const args: unknown[] = []
  const { where } = buildPanelWhere(f, monthExpr, args)
  const sql = `
    SELECT
      ${monthExpr} AS month,
      COALESCE(SUM(${Q(COL.wt)}), 0)::float8 AS volume,
      COALESCE(SUM(${Q(COL.fob)}), 0)::float8 AS fob,
      CASE WHEN SUM(${Q(COL.wt)}) > 0 THEN SUM(${Q(COL.fob)})::float8 / SUM(${Q(COL.wt)})::float8 ELSE NULL END AS avg_price_ton,
      COUNT(*)::bigint AS shipments
    FROM ${FQ_TABLE} ${where}
    GROUP BY 1 ORDER BY 1
  `
  const r = await c.queryObject<any>({ text: sql, args })
  return { rows: r.rows.map(serializeRow) }
}

async function panelTop(c: Client, monthExpr: string, f: PanelFilters, dimension: string, metric: 'volume' | 'fob', limit: number, extraEq: { shipper?: string; consignee?: string } = {}) {
  const dimCol = Q(dimensionToCol(dimension))
  const cp = counterpartOf(dimension)
  const cpExpr = cp ? `COUNT(DISTINCT ${Q(cp)})::bigint` : '0::bigint'
  const sortCol = metric === 'fob' ? 'fob' : 'volume'

  // Compute total separately so share % reflects the same filtered universe
  const argsTotal: unknown[] = []
  const wt = buildPanelWhere(f, monthExpr, argsTotal, extraEq)
  const totalRes = await c.queryObject<any>({
    text: `SELECT COALESCE(SUM(${Q(COL.wt)}), 0)::float8 AS v, COALESCE(SUM(${Q(COL.fob)}), 0)::float8 AS f FROM ${FQ_TABLE} ${wt.where}`,
    args: argsTotal,
  })
  const totalVol = Number(totalRes.rows[0]?.v ?? 0)
  const totalFob = Number(totalRes.rows[0]?.f ?? 0)

  const args: unknown[] = []
  const { where, hasWhere } = buildPanelWhere(f, monthExpr, args, extraEq)
  const sql = `
    SELECT
      ${dimCol} AS name,
      COALESCE(SUM(${Q(COL.wt)}), 0)::float8 AS volume,
      COALESCE(SUM(${Q(COL.fob)}), 0)::float8 AS fob,
      CASE WHEN SUM(${Q(COL.wt)}) > 0 THEN SUM(${Q(COL.fob)})::float8 / SUM(${Q(COL.wt)})::float8 ELSE NULL END AS avg_price_ton,
      ${cpExpr} AS counterparts,
      COUNT(*)::bigint AS shipments
    FROM ${FQ_TABLE} ${where}
    ${hasWhere ? 'AND' : 'WHERE'} ${dimCol} IS NOT NULL AND ${dimCol} <> ''
    GROUP BY 1
    ORDER BY ${sortCol} DESC
    LIMIT ${Math.max(1, Math.min(50, limit))}
  `
  const r = await c.queryObject<any>({ text: sql, args })
  const rows = r.rows.map((row: any) => {
    const o = serializeRow(row)
    const denom = metric === 'fob' ? totalFob : totalVol
    o.share_pct = denom > 0 ? (Number(o[sortCol]) / denom) * 100 : 0
    return o
  })
  return { rows, total: { volume: totalVol, fob: totalFob } }
}

async function panelMatrix(c: Client, monthExpr: string, f: PanelFilters, rowDim: string, colDim: string, metric: 'volume' | 'fob', limitRows: number, limitCols: number) {
  const rowCol = Q(dimensionToCol(rowDim))
  const colCol = Q(dimensionToCol(colDim))
  const metricExpr = metric === 'fob' ? `SUM(${Q(COL.fob)})` : `SUM(${Q(COL.wt)})`

  const argsR: unknown[] = []
  const wR = buildPanelWhere(f, monthExpr, argsR)
  const topRowsRes = await c.queryObject<any>({
    text: `SELECT ${rowCol} AS k, ${metricExpr}::float8 AS m FROM ${FQ_TABLE} ${wR.where}
           ${wR.hasWhere ? 'AND' : 'WHERE'} ${rowCol} IS NOT NULL AND ${rowCol} <> ''
           GROUP BY 1 ORDER BY 2 DESC LIMIT ${Math.max(1, Math.min(15, limitRows))}`,
    args: argsR,
  })
  const argsC: unknown[] = []
  const wC = buildPanelWhere(f, monthExpr, argsC)
  const topColsRes = await c.queryObject<any>({
    text: `SELECT ${colCol} AS k, ${metricExpr}::float8 AS m FROM ${FQ_TABLE} ${wC.where}
           ${wC.hasWhere ? 'AND' : 'WHERE'} ${colCol} IS NOT NULL AND ${colCol} <> ''
           GROUP BY 1 ORDER BY 2 DESC LIMIT ${Math.max(1, Math.min(8, limitCols))}`,
    args: argsC,
  })
  const rowKeys: string[] = topRowsRes.rows.map((r: any) => r.k)
  const colKeys: string[] = topColsRes.rows.map((r: any) => r.k)
  if (!rowKeys.length || !colKeys.length) return { rows: [], cols: [], cells: {} }

  const argsM: unknown[] = []
  const ph = (v: unknown) => { argsM.push(v); return `$${argsM.length}` }
  const wM = buildPanelWhere(f, monthExpr, argsM)
  const rowPh = rowKeys.map(ph).join(', ')
  const colPh = colKeys.map(ph).join(', ')
  const cellsRes = await c.queryObject<any>({
    text: `SELECT ${rowCol} AS r, ${colCol} AS c, COALESCE(${metricExpr}, 0)::float8 AS m
           FROM ${FQ_TABLE} ${wM.where}
           ${wM.hasWhere ? 'AND' : 'WHERE'} ${rowCol} IN (${rowPh}) AND ${colCol} IN (${colPh})
           GROUP BY 1, 2`,
    args: argsM,
  })
  const cells: Record<string, Record<string, number>> = {}
  for (const k of rowKeys) cells[k] = {}
  for (const r of cellsRes.rows as any[]) {
    cells[r.r] = cells[r.r] ?? {}
    cells[r.r][r.c] = Number(r.m)
  }
  return { rows: rowKeys, cols: colKeys, cells }
}

async function panelSearchEntity(c: Client, entity: 'shipper' | 'consignee', q: string) {
  if (!q || q.length < 2) return { rows: [] }
  const col = Q(entity === 'shipper' ? COL.shipper : COL.consignee)
  const res = await c.queryObject<any>({
    text: `SELECT DISTINCT ${col} AS name FROM ${FQ_TABLE}
           WHERE ${col} ILIKE $1 AND ${col} IS NOT NULL AND ${col} <> ''
           ORDER BY 1 LIMIT 20`,
    args: [`%${q}%`],
  })
  return { rows: res.rows.map(serializeRow) }
}

async function panelDistinctProducts(c: Client, monthExpr: string, f: PanelFilters) {
  const args: unknown[] = []
  // Strip productTypes from the filter so the list itself isn't filtered by current selection
  const fStripped = { ...f, productTypes: undefined }
  const { where } = buildPanelWhere(fStripped, monthExpr, args)
  const sql = `
    SELECT "Commodity Detail/BL Description" AS name,
           COALESCE(SUM(${Q(COL.wt)}), 0)::float8 AS volume
    FROM ${FQ_TABLE} ${where}
    ${where ? 'AND' : 'WHERE'} "Commodity Detail/BL Description" IS NOT NULL AND "Commodity Detail/BL Description" <> ''
    GROUP BY 1 ORDER BY 2 DESC LIMIT 100
  `
  const r = await c.queryObject<any>({ text: sql, args })
  return { rows: r.rows.map(serializeRow) }
}

async function runPanel(panel: string, body: any): Promise<unknown> {
  // Get cached schema (just for monthExpr); fall back to rebuild
  return await withPg(async (c) => {
    const filters: PanelFilters = body.filters ?? {}
    // Resolve monthExpr quickly without DB hit when possible
    let monthExpr = body.__monthExpr as string | undefined
    if (!monthExpr) {
      const { monthExpr: m } = await detectDateFormat(c)
      monthExpr = m
    }

    switch (panel) {
      case 'kpis': return await panelKpis(c, monthExpr!, filters)
      case 'monthly': return await panelMonthly(c, monthExpr!, filters)
      case 'top': {
        const dim = String(body.dimension ?? 'consignee')
        const metric = (body.metric === 'fob' ? 'fob' : 'volume') as 'volume' | 'fob'
        const limit = Number(body.limit ?? 15)
        const extra: { shipper?: string; consignee?: string } = {}
        if (body.scopeShipper) extra.shipper = String(body.scopeShipper)
        if (body.scopeConsignee) extra.consignee = String(body.scopeConsignee)
        return await panelTop(c, monthExpr!, filters, dim, metric, limit, extra)
      }
      case 'matrix': {
        const rowDim = String(body.rowDim ?? 'shipper')
        const colDim = String(body.colDim ?? 'destCountry')
        const metric = (body.metric === 'fob' ? 'fob' : 'volume') as 'volume' | 'fob'
        return await panelMatrix(c, monthExpr!, filters, rowDim, colDim, metric, Number(body.limitRows ?? 15), Number(body.limitCols ?? 8))
      }
      case 'search-entity': {
        const entity = (body.entity === 'shipper' ? 'shipper' : 'consignee') as 'shipper' | 'consignee'
        return await panelSearchEntity(c, entity, String(body.q ?? ''))
      }
      case 'distinct-products':
        return await panelDistinctProducts(c, monthExpr!, filters)
      case 'opportunity-match': {
        const exporter = (body.exporter ?? '').toString().trim() || null
        return await panelOpportunityMatch(c, monthExpr!, filters, exporter)
      }
      default:
        throw new Error(`Unknown panel: ${panel}`)
    }
  })
}

async function runPanelMirror(
  supaSrv: ReturnType<typeof createClient>,
  panel: string,
  body: any,
): Promise<unknown> {
  const filters = (body.filters ?? {}) as PanelFilters
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await supaSrv.rpc(name, args)
    if (error) throw new Error(`${name}: ${error.message}`)
    return data
  }
  switch (panel) {
    case 'kpis':
      return await rpc('agrostats_kpis', { f: filters })
    case 'monthly':
      return await rpc('agrostats_monthly', { f: filters })
    case 'top':
      return await rpc('agrostats_top', {
        f: filters,
        dim: String(body.dimension ?? 'consignee'),
        metric: body.metric === 'fob' ? 'fob' : 'volume',
        lim: Number(body.limit ?? 15),
        scope_shipper: body.scopeShipper ?? null,
        scope_consignee: body.scopeConsignee ?? null,
      })
    case 'matrix':
      return await rpc('agrostats_matrix', {
        f: filters,
        row_dim: String(body.rowDim ?? 'shipper'),
        col_dim: String(body.colDim ?? 'destCountry'),
        metric: body.metric === 'fob' ? 'fob' : 'volume',
        limit_rows: Number(body.limitRows ?? 15),
        limit_cols: Number(body.limitCols ?? 8),
      })
    case 'search-entity':
      return await rpc('agrostats_search_entity', {
        entity: body.entity === 'shipper' ? 'shipper' : 'consignee',
        q: String(body.q ?? ''),
      })
    case 'distinct-products':
      return await rpc('agrostats_distinct_products', { f: filters })
    case 'opportunity-match':
      return await rpc('agrostats_opportunity_match', {
        f: filters,
        exporter: (body.exporter ?? '').toString().trim() || null,
      })
    default:
      throw new Error(`Unknown panel: ${panel}`)
  }
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

    if (action === 'detect-date-format') {
      const data = await withPg((c) => detectDateFormat(c))
      return json({ ok: true, ...data })
    }

    if (action === 'panel') {
      const panel = String(body.panel ?? '')
      const forceRefresh = body.forceRefresh === true
      // Build cache key from the meaningful subset of body
      const cacheBody = { panel, filters: body.filters ?? {}, dimension: body.dimension, metric: body.metric, limit: body.limit, rowDim: body.rowDim, colDim: body.colDim, limitRows: body.limitRows, limitCols: body.limitCols, scopeShipper: body.scopeShipper, scopeConsignee: body.scopeConsignee, entity: body.entity, q: body.q }
      // Determine data source (mirror vs. external)
      const { data: syncState } = await supaSrv
        .from('agrostats_sync_state').select('use_mirror').eq('id', 1).maybeSingle()
      const useMirror = (syncState as any)?.use_mirror === true
      const cacheKey = await sha256(`panel:${useMirror ? 'mirror' : 'neon'}:` + JSON.stringify(cacheBody))

      // Skip cache for search-entity (it's user-typed and ephemeral)
      const useCache = panel !== 'search-entity'
      if (useCache && !forceRefresh) {
        const { data: cached } = await supaSrv
          .from('agrostats_panel_cache')
          .select('payload, created_at')
          .eq('cache_key', cacheKey)
          .maybeSingle()
        if (cached?.payload && cached.created_at) {
          const age = Date.now() - new Date(cached.created_at).getTime()
          if (age < PANEL_CACHE_TTL_MS) {
            return json({ ok: true, cached: true, createdAt: cached.created_at, panel, data: cached.payload })
          }
        }
      }

      const data = useMirror
        ? await runPanelMirror(supaSrv, panel, body)
        : await runPanel(panel, body)
      const createdAt = new Date().toISOString()
      if (useCache) {
        await supaSrv
          .from('agrostats_panel_cache')
          .upsert({ cache_key: cacheKey, payload: data as any, created_at: createdAt }, { onConflict: 'cache_key' })
      }
      return json({ ok: true, cached: false, createdAt, panel, source: useMirror ? 'mirror' : 'external', data })
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
