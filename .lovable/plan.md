## Problema

Ao salvar **draft** no Create Offer:

```
Failed to create offer: null value in column "payment_terms" of relation "offers" violates not-null constraint
```

Causa raiz (confirmada no schema):

- A coluna `public.offers.payment_terms` está definida como `NOT NULL` **sem default**.
- O código de salvar oferta (`src/lib/offerSubmit.ts`, linhas 232 e 552) envia explicitamente `payment_terms: paymentTerms || null` — porque, num draft inicial, o supplier ainda não escolheu termos de pagamento. Para um draft isso é correto e esperado.
- Resultado: qualquer draft salvo antes de o supplier abrir o card "Payment terms" e escolher um valor quebra na hora do INSERT.

A regra de "payment_terms obrigatório" pertence ao fluxo de **publish**, não ao draft. Hoje o `offerCompletion` já valida `payment_terms` como campo obrigatório antes de publicar (botão Publish fica desabilitado / banner "X fields missing to publish"), então retirar o `NOT NULL` no banco **não afrouxa nenhuma garantia real** — apenas permite o draft existir enquanto o usuário preenche.

## Solução

**Uma migration única, mínima:**

```sql
ALTER TABLE public.offers
  ALTER COLUMN payment_terms DROP NOT NULL;
```

Sem mudança de RLS, sem mudança de default, sem backfill (já não existem linhas com NULL — eram impossíveis).

### Por que não a alternativa "preencher um valor default no código"?
- Inventar um default (ex.: "100% TT") esconderia que o supplier ainda não escolheu — entraria como termo "real" e poderia ser publicado por engano.
- O draft existe justamente para permitir campos vazios; forçar valor falsifica o estado.

## O que NÃO muda
- Nenhum hook, página, componente, edge function ou outra tabela.
- A validação de publish em `src/lib/offerCompletion.ts` continua exigindo `payment_terms` para publicar (apenas drafts podem ficar sem).
- `offerSubmit.ts` já envia `payment_terms: paymentTerms || null` — passa a funcionar como esperado depois da migration.

## Verificação

Após aplicar a migration:
1. `/supplier/offers/new` → preencher só logística parcial → "Save draft" → deve salvar sem erro.
2. Reabrir o draft, completar tudo, "Publish" → continua barrado se payment_terms vazio (validação cliente intacta).
3. `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='offers' AND column_name='payment_terms';` deve retornar `is_nullable = YES`.
