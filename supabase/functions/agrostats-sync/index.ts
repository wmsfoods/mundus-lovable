import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const DB_HOST = 'ep-mute-recipe-acwzxxog-pooler.sa-east-1.aws.neon.tech'
const DB_PORT = 5432
const DB_NAME = 'Meat_Export_BR'
const DB_USER = 'wmsfoods_ro'
const FQ = '"wmsfoods"."meat_export"'

const COL = {
  id: 'Identification/ID_Datamar',
  polCountry: 'Place_and_Ports/POL_Country',
  polName: 'Place_and_Ports/POL_Name',
  destCountry: 'Place_and_Ports/DEST_Country',
  destName: 'Place_and_Ports/DEST_Name',
  date: 'Dates Long Haul/Date',
  shipper: 'Company_Shipper/Shipper Name',
  shipperCountry: 'Company_Shipper/Country',
  shipperState: 'Company_Shipper/State',
  shipperCity: 'Company_Shipper/City',
  shipperType: 'Company_Shipper/Type',
  consignee: 'Company_Consignee/Consignee Name',
  consigneeCountry: 'Company_Consignee/Country',
  consigneeCity: 'Company_Consignee/City',
  consigneeType: 'Company_Consignee/Type',
  hs8: 'Commodity_HS/HS8 Portugues',
  bl: 'Commodity Detail/BL Description',
  wt: 'WTMT',
  fob: 'FOB VALUE USD',
}
const Q = (c: string) => `"${c.replace(/"/g, '""')}"`

const BATCH = 5000
const INSERT_CHUNK = 1000
const SOFT_BUDGET_MS = 90_000

async function pg<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const password = Deno.env.get('AGROSTATS_DB_PASSWORD')?.trim()
  if (!password) throw new Error('AGROSTATS_DB_PASSWORD not configured')
  const c = new Client({
    hostname: DB_HOST, port: DB_PORT, database: DB_NAME, user: DB_USER, password,
    tls: { enabled: true, enforce: false },
  })
  await c.connect()
  try { return await fn(c) } finally { try { await c.end() } catch {} }
}

function monthKeyFor(raw: string | null | undefined, fmt: string | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null
  if (fmt === 'ISO' || /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7)
  if (fmt === 'DMY' && /^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(6, 10) + '-' + s.slice(3, 5)
  if (fmt === 'MDY' && /^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(6, 10) + '-' + s.slice(0, 2)
  // Generic fallbacks
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [a, b, y] = s.split('/')
    return Number(a) > 12 ? `${y}-${b.padStart(2, '0')}` : `${y}-${a.padStart(2, '0')}`
  }
  return null
}

function mapRow(r: Record<string, unknown>, fmt: string | undefined) {
  const dateRaw = r[COL.date] == null ? null : String(r[COL.date])
  return {
    id_datamar: r[COL.id] == null ? null : String(r[COL.id]),
    pol_country: r[COL.polCountry] as string ?? null,
    pol_name: r[COL.polName] as string ?? null,
    dest_country: r[COL.destCountry] as string ?? null,
    dest_name: r[COL.destName] as string ?? null,
    ship_date_raw: dateRaw,
    month_key: monthKeyFor(dateRaw, fmt),
    shipper_name: r[COL.shipper] as string ?? null,
    shipper_country: r[COL.shipperCountry] as string ?? null,
    shipper_state: r[COL.shipperState] as string ?? null,
    shipper_city: r[COL.shipperCity] as string ?? null,
    shipper_type: r[COL.shipperType] as string ?? null,
    consignee_name: r[COL.consignee] as string ?? null,
    consignee_country: r[COL.consigneeCountry] as string ?? null,
    consignee_city: r[COL.consigneeCity] as string ?? null,
    consignee_type: r[COL.consigneeType] as string ?? null,
    hs8: r[COL.hs8] == null ? null : String(r[COL.hs8]),
    bl_description: r[COL.bl] as string ?? null,
    wtmt: r[COL.wt] == null ? null : Number(r[COL.wt]),
    fob_value_usd: r[COL.fob] == null ? null : Number(r[COL.fob]),
  }
}

async function getDateFormat(supaSrv: ReturnType<typeof createClient>): Promise<string | undefined> {
  const { data } = await supaSrv
    .from('agrostats_schema_cache')
    .select('payload')
    .order('refreshed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.payload as any)?.dateFormat as string | undefined
}

async function updateState(supaSrv: ReturnType<typeof createClient>, patch: Record<string, unknown>) {
  await supaSrv.from('agrostats_sync_state').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1)
}

async function reinvokeProcess() {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/agrostats-sync`
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  // Fire-and-forget — do not await response body
  fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'process' }),
  }).catch(() => {})
}

async function processBatches(supaSrv: ReturnType<typeof createClient>) {
  const started = Date.now()
  const dateFmt = await getDateFormat(supaSrv)

  while (Date.now() - started < SOFT_BUDGET_MS) {
    const { data: state } = await supaSrv.from('agrostats_sync_state').select('*').eq('id', 1).maybeSingle()
    if (!state) break
    if (state.status === 'complete') break
    const offset = Number(state.last_offset ?? 0)
    const total = state.total_rows ? Number(state.total_rows) : null
    if (total != null && offset >= total) {
      await updateState(supaSrv, { status: 'complete', use_mirror: true, last_error: null })
      return { done: true }
    }

    let mapped: ReturnType<typeof mapRow>[] = []
    try {
      mapped = await pg(async (c) => {
        const res = await c.queryObject<Record<string, unknown>>({
          text: `SELECT * FROM ${FQ} ORDER BY ${Q(COL.id)} OFFSET ${offset} LIMIT ${BATCH}`,
          camelcase: false,
        })
        return res.rows.map((r) => mapRow(r, dateFmt))
      })
    } catch (e) {
      await updateState(supaSrv, { status: 'error', last_error: (e as Error).message })
      throw e
    }

    if (mapped.length === 0) {
      await updateState(supaSrv, { status: 'complete', use_mirror: true, last_error: null })
      return { done: true }
    }

    try {
      for (let i = 0; i < mapped.length; i += INSERT_CHUNK) {
        const chunk = mapped.slice(i, i + INSERT_CHUNK)
        const { error } = await supaSrv.from('meat_export_mirror').insert(chunk)
        if (error) throw new Error(error.message)
      }
    } catch (e) {
      await updateState(supaSrv, { status: 'error', last_error: (e as Error).message })
      throw e
    }

    const newOffset = offset + mapped.length
    const newCopied = Number(state.rows_copied ?? 0) + mapped.length
    await updateState(supaSrv, { last_offset: newOffset, rows_copied: newCopied, status: 'backfilling', last_error: null })

    if (mapped.length < BATCH) {
      await updateState(supaSrv, { status: 'complete', use_mirror: true })
      return { done: true }
    }
  }

  // Out of time — reinvoke
  await reinvokeProcess()
  return { done: false }
}

async function incremental(supaSrv: ReturnType<typeof createClient>) {
  // Find max month in mirror, redo last 2 months
  const { data: maxRow } = await supaSrv
    .from('meat_export_mirror')
    .select('month_key')
    .not('month_key', 'is', null)
    .order('month_key', { ascending: false })
    .limit(1)
    .maybeSingle()

  const dateFmt = await getDateFormat(supaSrv)
  let boundary: string
  if (maxRow?.month_key) {
    const [y, m] = maxRow.month_key.split('-').map(Number)
    const idx = y * 12 + (m - 1) - 1 // one month before max
    boundary = `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`
  } else {
    boundary = '1900-01'
  }

  // Delete local rows >= boundary
  await supaSrv.from('meat_export_mirror').delete().gte('month_key', boundary)

  // Pull from Neon — build monthExpr-compatible WHERE
  const monthExpr =
    dateFmt === 'ISO' ? `LEFT(${Q(COL.date)}::text, 7)`
    : dateFmt === 'DMY' ? `SUBSTR(${Q(COL.date)}::text, 7, 4) || '-' || SUBSTR(${Q(COL.date)}::text, 4, 2)`
    : dateFmt === 'MDY' ? `SUBSTR(${Q(COL.date)}::text, 7, 4) || '-' || SUBSTR(${Q(COL.date)}::text, 1, 2)`
    : `LEFT(${Q(COL.date)}::text, 7)`

  let total = 0
  await pg(async (c) => {
    const res = await c.queryObject<Record<string, unknown>>({
      text: `SELECT * FROM ${FQ} WHERE ${monthExpr} >= $1`,
      args: [boundary],
      camelcase: false,
    })
    const rows = res.rows.map((r) => mapRow(r, dateFmt))
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const chunk = rows.slice(i, i + INSERT_CHUNK)
      const { error } = await supaSrv.from('meat_export_mirror').insert(chunk)
      if (error) throw new Error(error.message)
      total += chunk.length
    }
  })

  // Find new max month
  const { data: newMax } = await supaSrv
    .from('meat_export_mirror')
    .select('month_key')
    .not('month_key', 'is', null)
    .order('month_key', { ascending: false })
    .limit(1)
    .maybeSingle()

  await updateState(supaSrv, { last_synced_month: newMax?.month_key ?? null, last_error: null })
  return { rows_inserted: total, last_synced_month: newMax?.month_key ?? null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
    const token = authHeader.slice(7).trim()
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supaSrv = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action ?? '')

    // Service-role bypass for self-invocation and scheduled jobs
    const isService = token === SERVICE
    if (!isService) {
      const supaUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
      const { data: u } = await supaUser.auth.getUser(token)
      if (!u?.user) return json({ error: 'Unauthorized' }, 401)
      const { data: isAdmin } = await supaUser.rpc('is_mundus_admin')
      if (isAdmin !== true) return json({ error: 'Forbidden' }, 403)
    }

    if (action === 'status') {
      const { data } = await supaSrv.from('agrostats_sync_state').select('*').eq('id', 1).maybeSingle()
      return json({ ok: true, state: data })
    }

    if (action === 'start-backfill') {
      const { data: state } = await supaSrv.from('agrostats_sync_state').select('*').eq('id', 1).maybeSingle()
      const resuming = state?.status === 'error'
      let total: number | null = state?.total_rows ?? null
      if (!resuming || !total) {
        total = await pg(async (c) => {
          const r = await c.queryObject<{ c: bigint }>(`SELECT COUNT(*)::bigint AS c FROM ${FQ}`)
          return Number(r.rows[0]?.c ?? 0)
        })
      }
      if (!resuming) {
        await supaSrv.from('meat_export_mirror').delete().not('id', 'is', null)
        await updateState(supaSrv, {
          status: 'backfilling', total_rows: total, rows_copied: 0, last_offset: 0,
          last_error: null, use_mirror: false,
        })
      } else {
        await updateState(supaSrv, { status: 'backfilling', total_rows: total, last_error: null })
      }
      // Kick off processing in background
      await reinvokeProcess()
      return json({ ok: true, total_rows: total, resumed: resuming })
    }

    if (action === 'process') {
      const result = await processBatches(supaSrv)
      return json({ ok: true, ...result })
    }

    if (action === 'incremental') {
      const r = await incremental(supaSrv)
      return json({ ok: true, ...r })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('[agrostats-sync]', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})