# Preservação de dados ao editar offer (M-000153 e demais)

## Diagnóstico

Verificação direta no banco para a offer #M-000153-2026 (`d9486858…`):

- 1 item (Beef Bones, 28.000kg @ $7, Frozen)
- 2 incoterms (CFR, FOB), CFR como primary pricing
- 1 mercado (Chile), 1 porto destino com frete ($4.500 Iquique)
- 1 porto origem (Itajaí), payment terms, container, shipment ready — tudo presente

Ou seja, **hoje o registro 153 está íntegro no banco**. Quando o usuário relata "some quase tudo" ao editar, o cenário mais provável é o vestígio de uma tentativa de salvar **anterior** que falhou no meio do processo.

A causa raiz é arquitetural em `src/lib/offerSubmit.ts → updateOfferV2`:

```text
update offers (campos)
  ↓
DELETE offer_items / offer_allowed_incoterms / offer_markets /
       freight_options / offer_origin_ports   ← já commitado
  ↓
INSERT offer_items                            ← pode falhar (FK, trigger, etc.)
INSERT offer_allowed_incoterms                ← pode falhar
INSERT offer_markets / freight / origin_ports ← pode falhar
  ↓
UPDATE offers SET status = …                  ← trigger valida completude
```

Cada chamada via supabase-js é uma transação HTTP independente. Se **qualquer** insert intermediário falhar (trigger `offers_validate_active_complete`, validação, FK, rede), os DELETEs já foram persistidos e a offer fica mutilada. Ao reabrir, o prefill carrega corretamente — mas só carrega o que restou.

A correção anterior (mover `status` para o final) evitou o erro `offerIncomplete:items` em condições normais, mas **não removeu o risco**: qualquer falha entre o DELETE e o último INSERT ainda destrói dados.

## Plano

### 1. Edição atômica via RPC Postgres

Criar uma função `public.update_offer_v2_atomic(p_offer_id uuid, p_payload jsonb)` em migration. Ela executa em **uma única transação**:

1. Pré-checagem: bloquear se algum `offer_items.id` tem `cut_rounds` associadas (mesma regra de "offerHasActiveBids" que já existe no client).
2. `UPDATE offers SET …` (todos os campos editáveis, exceto `status`).
3. `DELETE` em cascata controlada de: `offer_items`, `offer_allowed_incoterms`, `offer_markets`, `freight_options`, `offer_origin_ports`.
4. `INSERT` de todas as linhas filhas a partir do `jsonb` recebido.
5. `UPDATE offers SET status = …` por último (trigger de validação roda no commit).
6. Se qualquer passo falhar, a transação inteira faz rollback — **nenhum dado é perdido**.

Segurança: `SECURITY INVOKER` (mantém RLS do supplier dono); grants para `authenticated`.

### 2. Refatorar `updateOfferV2` no client

Substituir todo o bloco `delete + uploads + inserts + status update` por:

- Upload de mídia (precisa rodar antes; storage é fora da transação).
- `supabase.rpc('update_offer_v2_atomic', { p_offer_id, p_payload })` com o payload completo (campos da offer + arrays de items/incoterms/markets/freight/origin_ports).
- Pós-publish hook (notificações de buyer_request) permanece igual, fora da transação.

Manter a assinatura `updateOfferV2(offerId, input, ctx)` para não tocar nas páginas Desktop/Mobile.

### 3. Validação

- Editar offer 153 → mudar campo → "Save changes": deve preservar tudo e republicar.
- Editar offer 153 → forçar erro (ex.: remover todos os items) → publicar: erro retornado, **nada apagado** no banco; ao reabrir, dados completos.
- Editar draft → salvar como draft incompleto: permitido (status fica draft, trigger não dispara).
- Editar draft → publicar incompleto: bloqueado pelo `validateForPublish` client + trigger DB.
- Conferir offer 153 antes/depois com `SELECT count(*)` em cada tabela filha.

## Detalhes técnicos

**Por que RPC e não migration de constraint deferida?**
Deferred triggers só ajudam a validação final; não protegem contra falhas de FK ou rede entre chamadas separadas. Só uma transação Postgres real garante atomicidade — e isso exige uma única chamada.

**Payload JSON da RPC** (resumo):

```text
{
  offer: { origin_country, origin_port, origin_port_id, shipment_*, payment_terms,
           container_size, total_fcl, is_halal, is_kosher, plant_id, negotiation_*,
           specific_buyer_company_ids, all_customers, exw_pickup_location, cut_region,
           request_id, primary_pricing_incoterm, pricing_includes_freight,
           pricing_reference_port_id },
  items: [ { customer_product_id, amount, price, minimum_price, … } ],
  incoterms: ["CFR","FOB"],
  markets: [ market_id, … ],
  origin_ports: [ port_id, … ],
  freight: [ { port_id, cost, insurance } ],
  status: "active" | "draft"
}
```

A resolução de `customer_product_id` via `resolve_customer_product` continua no client (RPC já existe), antes de montar o payload.

**Arquivos afetados:**

- `supabase/migrations/<novo>.sql` — função `update_offer_v2_atomic`.
- `src/lib/offerSubmit.ts` — `updateOfferV2` reescrita para usar a RPC.

Nenhuma mudança em UI, prefill (`useOfferForPrefill`), validação client, ou fluxos draft/active.
