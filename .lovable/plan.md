# Plano: campo Bone SPEC no catálogo de cortes

## Objetivo
Cada corte do catálogo (admin) passa a ter um atributo **Bone SPEC** com duas opções: **Bone-In** ou **Boneless**. Default = **Boneless** (também aplicado a todos os cortes já cadastrados). Esse valor é puxado automaticamente quando o supplier cria oferta/leilão ou o buyer cria request — e continua editável linha a linha.

---

## 1. Banco de dados (migration)
Tabela `cuts`:
- Adiciona coluna `bone_spec text not null default 'Boneless'` com check `bone_spec in ('Bone-In','Boneless')`.
- Backfill: todos os cortes existentes ficam `Boneless`.

## 2. Admin — cadastro do corte
- `src/hooks/useAdminCuts.ts`: incluir `bone_spec` no `AdminCutRow`, no SELECT e no `updateMutation`.
- `src/components/admin/EditCutModal.tsx`: novo campo dropdown **"Bone SPEC"** com opções `Boneless` / `Bone-In`, posicionado ao lado de "Category". Estado local `boneSpec`, inicializado no `useEffect` a partir de `cut.bone_spec`, e enviado no `onSave`.
- `src/pages/admin/AdminProducts.tsx`: nova coluna "Bone" na tabela desktop e badge "Boneless"/"Bone-In" nos cards mobile, para visualização rápida.

## 3. Catálogo compartilhado (hook usado por offer / auction / request)
- `src/hooks/useSupplierOfferData.ts`:
  - `OfferCut` ganha `bone_spec: 'Bone-In' | 'Boneless'`.
  - SELECT em `cuts` inclui `bone_spec`.
  - Propaga no mapeamento de `cutsByCategory`.

## 4. Supplier — Create Offer
`src/pages/supplier/SupplierCreateOffer.tsx`
- Quando o usuário seleciona um corte na linha, o `spec` da linha é setado automaticamente para `cut.bone_spec` (sobrescrevendo o default "Boneless").
- O dropdown `SPECS` existente (`Boneless` / `Bone-In` / `Semi-Boneless`) continua editável.
- O parser do `fromRequest` também respeita o `bone_spec` do corte quando a linha não trouxer spec explícito.

## 5. Supplier — Create Auction
`src/pages/supplier/SupplierCreateAuction.tsx`
- Mesma lógica: ao escolher o corte, preenche `spec` com `cut.bone_spec`. Mantém dropdown editável.

## 6. Buyer — Create Request
`src/pages/buyer/BuyerCreateRequest.tsx`
- Hoje o campo `spec` é texto livre (ex.: "7-9 lb"). **Não vamos sobrescrever isso.**
- Adicionar um novo campo na linha: `boneSpec: 'Bone-In' | 'Boneless'` (default `Boneless`), exibido como um dropdown compacto ao lado do corte tanto no layout desktop quanto no mobile.
- Ao selecionar o corte, `boneSpec` é setado a partir de `cut.bone_spec`.
- O `boneSpec` é incluído no texto enviado em `additional_info` (linha de cuts) no formato `Cut (Boneless) — ...` para que o supplier veja ao responder. O parser em `SupplierCreateOffer` já lê o conteúdo entre parênteses como `spec`, então a integração ponta-a-ponta funciona sem mudanças adicionais.

## 7. Mobile
- EditCutModal: dropdown empilhado verticalmente em telas estreitas (já segue padrão do modal).
- AdminProducts: badge "Bone" exibido nos cards mobile.
- BuyerCreateRequest: dropdown Bone SPEC entra no card de cada linha (mobile) logo abaixo do nome do corte, com toque confortável (altura 40px).

---

## Resumo técnico (curto)
- 1 migration adicionando `cuts.bone_spec` (default `Boneless`).
- 2 hooks atualizados (`useAdminCuts`, `useSupplierOfferData`).
- 5 telas tocadas: EditCutModal, AdminProducts, SupplierCreateOffer, SupplierCreateAuction, BuyerCreateRequest.
- Nenhuma quebra: campos `spec` existentes nas linhas continuam funcionando; só passa a ser pré-preenchido a partir do catálogo.
