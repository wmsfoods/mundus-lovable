# Validação enterprise no Signup (4 steps)

Aplicar padrão Zod + React Hook Form em `src/pages/signup/Signup.tsx`, com validação inline, máscaras, async checks e espelhamento na edge function.

## 1. Infra compartilhada

**Novo pacote:** `libphonenumber-js` (validação E.164 por país, ~145kb tree-shakeable).

**Novos arquivos:**

```
src/pages/signup/
├── schemas/
│   ├── step1Schema.ts      Zod: name, email, password, repeatPassword, agreeTerms
│   ├── step3Schema.ts      Zod: companyName, taxId (dinâmico por país), role, proteins, countries, certificate
│   ├── step4Schema.ts      Zod: country, state, city, address, zip, phone, website
│   └── shared.ts           regex helpers, zipByCountry, taxIdByCountry, messages factory(t)
├── components/
│   ├── FormField.tsx       wrapper label + erro inline + borda vermelha
│   ├── PhoneField.tsx      máscara + libphonenumber-js + país sync
│   ├── TaxIdField.tsx      máscara dinâmica por país (CNPJ/EIN/etc.)
│   └── ZipField.tsx        máscara dinâmica por país
└── hooks/
    └── useEmailAvailability.ts   debounce 300ms + verify-email check
```

## 2. Regras por campo

### Step 1 — Basic
- **Name** trim, 2–80, `^[\p{L}\s'\-]+$` (bloqueia números)
- **Email** `.email()`, lowercase, max 255, async check de duplicidade (debounce)
- **Password** mantém `checkPassword` + visual ✓/✗ (já existe)
- **Repeat** `.refine(eq)`
- **Terms** `z.literal(true)`

### Step 2 — Verify
- Código 6 dígitos, `inputMode="numeric"`, paste-friendly, auto-submit
- Reenviar com cooldown 60s

### Step 3 — Company
- **Company name** 2–120, não só números
- **Registration country** lista controlada
- **Tax ID** máscara + pattern do país (reusa `TAX_ID_RULES` existente)
- **Role** enum obrigatório (buyer/supplier)
- **Proteins** min 1
- **Countries of operation** min 1
- **Certificate** opcional, max 10MB, mime `pdf|jpg|png`

### Step 4 — Contact
- **Country** lista
- **State/City** 2–80
- **Address** 4–200
- **ZIP** regex por país (US 5/9, BR 8, etc.)
- **Phone** `libphonenumber-js` valida E.164 conforme `phoneCode`
- **Website** `.url()` opcional, auto-prefixa `https://`

## 3. UX

- RHF `mode: "onTouched"` — valida no blur, re-valida onChange após primeiro erro
- Erro inline abaixo do campo, borda vermelha, ícone, mensagem i18n
- Botão "Proceed" desabilita via `formState.isValid` do step atual
- Máscaras formatam o valor (não bloqueiam teclas — paste funciona)
- Mobile: `inputMode`, `autoComplete`, `enterKeyHint`, fontes 16px+ pra não dar zoom no iOS
- Toasts só pra erros server-side; campo = inline

## 4. Server-side mirror

- Criar `supabase/functions/_shared/signupSchema.ts` (mesma lógica Zod, runtime Deno)
- `verify-email` e o insert em `user_requests` validam antes de persistir
- Retornam `422 { errors: { field: message[] } }` que o client mapeia nos campos

## 5. i18n

Adicionar chaves em `src/i18n/index.ts` (en/pt/es):
```
signup.errors.nameInvalid, emailInvalid, emailTaken, passwordWeak,
passwordsMismatch, taxIdInvalid, phoneInvalid, zipInvalid,
websiteInvalid, required, fileTooLarge, fileType
```

## 6. Ordem de execução (uma PR única)

1. Instalar `libphonenumber-js`
2. Criar `schemas/` + i18n keys
3. Criar `FormField`, `PhoneField`, `TaxIdField`, `ZipField`
4. Criar `useEmailAvailability`
5. Refatorar `Signup.tsx` Step 1 → 4 com RHF + zodResolver por step (mantém `data` global entre steps)
6. Criar `supabase/functions/_shared/signupSchema.ts` e plugar em `verify-email` + (novo) validação no insert
7. Smoke test manual: cada step, mobile (375px), erros visíveis, submit final

## Detalhes técnicos

- Manter o state global `data: FormData` em `Signup.tsx` (steps preservam dados ao voltar); cada step usa RHF próprio com `defaultValues` lidos de `data` e `onSubmit` que faz `set(...)` + avança.
- `TaxIdField` recebe `country` prop e troca máscara + hint reativamente.
- `PhoneField` troca o country code via dropdown existente; validação E.164 chama `parsePhoneNumber(value, isoFromCode)`.
- Edge function compartilhada via `_shared/` (padrão do projeto). Sem schema novo no DB — validação é só código.
- Sem alteração de tabela; sem migração necessária.
