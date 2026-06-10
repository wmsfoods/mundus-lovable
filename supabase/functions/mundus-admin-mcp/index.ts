import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js'
import { Hono } from 'npm:hono@^4.9.7'
import { z } from 'npm:zod@^4.1.13'
import { createClient } from 'npm:@supabase/supabase-js@^2'

const FUNCTION_NAME = 'mundus-admin-mcp'
const ADMIN_TOKEN = Deno.env.get('MUNDUS_ADMIN_MCP_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAX_ROWS = 200

const WRITE_DENYLIST = new Set(
  (Deno.env.get('MCP_WRITE_DENYLIST') ?? 'round_proposals,cut_rounds,mcp_audit_log,audit_log,admin_action_log,negotiation_audit,offer_snapshots,offer_views,email_events')
    .split(',').map((t) => t.trim()).filter(Boolean),
)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}
function fail(message: string) {
  return { content: [{ type: 'text' as const, text: `ERRO: ${message}` }], isError: true }
}
// deno-lint-ignore no-explicit-any
function applyFilters(query: any, filters?: Record<string, unknown>) {
  if (!filters) return query
  for (const [col, val] of Object.entries(filters)) query = query.eq(col, val as never)
  return query
}
async function audit(action: string, table: string, recordId: unknown, payload: unknown) {
  try {
    await supabase.from('mcp_audit_log').insert({
      action, table_name: table,
      record_id: recordId != null ? String(recordId) : null,
      payload, source: 'admin-mcp', created_at: new Date().toISOString(),
    })
  } catch (e) {
    console.warn('[audit] falhou (seguindo):', (e as Error).message)
  }
}

const server = new McpServer({ name: 'mundus-admin-mcp', version: '0.3.0' })

server.registerTool(
  'health',
  { title: 'Health check', description: 'Confirma conexao com o banco.', inputSchema: {} },
  async () => {
    const { error } = await supabase.from('offers').select('id', { count: 'exact', head: true })
    return ok({ ok: !error, mode: 'read-write', denylist: [...WRITE_DENYLIST], error: error?.message ?? null, at: new Date().toISOString() })
  },
)

server.registerTool(
  'db_select',
  {
    title: 'Select rows',
    description: 'Le linhas de uma tabela. filters = igualdades simples. columns opcional. limit default 50, max 200.',
    inputSchema: {
      table: z.string(), columns: z.string().optional(),
      filters: z.record(z.string(), z.unknown()).optional(),
      order_by: z.string().optional(), ascending: z.boolean().optional(),
      limit: z.number().int().positive().max(MAX_ROWS).optional(),
    },
  },
  async ({ table, columns, filters, order_by, ascending, limit }) => {
    let q = supabase.from(table).select(columns ?? '*').limit(limit ?? 50)
    q = applyFilters(q, filters)
    if (order_by) q = q.order(order_by, { ascending: ascending ?? false })
    const { data, error } = await q
    if (error) return fail(error.message)
    return ok({ table, count: data?.length ?? 0, rows: data })
  },
)

server.registerTool(
  'db_count',
  {
    title: 'Count rows', description: 'Conta linhas de uma tabela com filtros opcionais.',
    inputSchema: { table: z.string(), filters: z.record(z.string(), z.unknown()).optional() },
  },
  async ({ table, filters }) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true })
    q = applyFilters(q, filters)
    const { count, error } = await q
    if (error) return fail(error.message)
    return ok({ table, count })
  },
)

server.registerTool(
  'get_record',
  {
    title: 'Get one record', description: 'Busca um unico registro por id.',
    inputSchema: { table: z.string(), id: z.union([z.string(), z.number()]), id_column: z.string().optional() },
  },
  async ({ table, id, id_column }) => {
    const { data, error } = await supabase.from(table).select('*').eq(id_column ?? 'id', id).maybeSingle()
    if (error) return fail(error.message)
    if (!data) return fail(`Nenhum registro em ${table} com ${id_column ?? 'id'}=${id}`)
    return ok(data)
  },
)

server.registerTool(
  'db_update',
  {
    title: 'Update record',
    description: 'Atualiza um registro por id. Bloqueado para tabelas imutaveis (denylist). Registrado em mcp_audit_log.',
    inputSchema: {
      table: z.string(), id: z.union([z.string(), z.number()]),
      patch: z.record(z.string(), z.unknown()), id_column: z.string().optional(),
    },
  },
  async ({ table, id, patch, id_column }) => {
    if (WRITE_DENYLIST.has(table)) return fail(`Tabela "${table}" e somente-leitura (denylist).`)
    const idCol = id_column ?? 'id'
    const { data, error } = await supabase.from(table).update(patch).eq(idCol, id).select().maybeSingle()
    if (error) return fail(error.message)
    await audit('update', table, id, patch)
    return ok({ updated: data })
  },
)

server.registerTool(
  'db_insert',
  {
    title: 'Insert record',
    description: 'Cria um registro. Bloqueado para tabelas imutaveis (denylist). Registrado em mcp_audit_log.',
    inputSchema: { table: z.string(), values: z.record(z.string(), z.unknown()) },
  },
  async ({ table, values }) => {
    if (WRITE_DENYLIST.has(table)) return fail(`Tabela "${table}" e somente-leitura (denylist).`)
    const { data, error } = await supabase.from(table).insert(values).select().maybeSingle()
    if (error) return fail(error.message)
    // deno-lint-ignore no-explicit-any
    await audit('insert', table, (data as any)?.id, values)
    return ok({ inserted: data })
  },
)

server.registerTool('list_tables',
  { title: 'List tables',
    description: 'Lista tabelas/views por schema, com estimativa de linhas e flag writable. schema opcional.',
    inputSchema: { schema: z.string().optional() } },
  async ({ schema }) => {
    const { data, error } = await supabase.rpc('mcp_list_tables', { p_schema: schema ?? null })
    if (error) return fail(error.message)
    // deno-lint-ignore no-explicit-any
    const tables = (data ?? []).map((t: any) => ({ ...t, writable: !WRITE_DENYLIST.has(t.table_name) }))
    return ok({ count: tables.length, tables })
  },
)

server.registerTool('describe_table',
  { title: 'Describe table',
    description: 'Colunas (nome, tipo, nullable, default) de uma tabela. schema default public.',
    inputSchema: { table: z.string(), schema: z.string().optional() } },
  async ({ table, schema }) => {
    const { data, error } = await supabase.rpc('mcp_describe_table', { p_schema: schema ?? 'public', p_table: table })
    if (error) return fail(error.message)
    if (!data?.length) return fail(`Tabela ${schema ?? 'public'}.${table} nao encontrada`)
    return ok({ schema: schema ?? 'public', table, columns: data })
  },
)

server.registerTool('auth_users',
  { title: 'List auth users',
    description: 'Lista contas de login reais (auth.users), read-only. limit default 100, max 500.',
    inputSchema: { limit: z.number().int().positive().max(500).optional() } },
  async ({ limit }) => {
    const { data, error } = await supabase.rpc('mcp_auth_users', { p_limit: limit ?? 100 })
    if (error) return fail(error.message)
    return ok({ count: data?.length ?? 0, users: data })
  },
)

server.registerTool('storage_objects',
  { title: 'List storage objects',
    description: 'Lista arquivos no storage (storage.objects), read-only. bucket opcional, limit default 100, max 500.',
    inputSchema: { bucket: z.string().optional(), limit: z.number().int().positive().max(500).optional() } },
  async ({ bucket, limit }) => {
    const { data, error } = await supabase.rpc('mcp_storage_objects', { p_bucket: bucket ?? null, p_limit: limit ?? 100 })
    if (error) return fail(error.message)
    return ok({ count: data?.length ?? 0, objects: data })
  },
)

const app = new Hono().basePath(`/${FUNCTION_NAME}`)

app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, accept',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    })
  }
  await next()
})

app.use('*', async (c, next) => {
  const header = c.req.header('authorization') ?? ''
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : ''
  const key = bearer || c.req.query('key') || ''
  if (!ADMIN_TOKEN || key !== ADMIN_TOKEN) return c.json({ error: 'unauthorized' }, 401)
  await next()
})

app.all('*', async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport()
  await server.connect(transport)
  return transport.handleRequest(c.req.raw)
})

Deno.serve(app.fetch)