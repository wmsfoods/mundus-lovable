## Goal
1. Spec column deve refletir exatamente o que está cadastrado no item (`cuts.bone_spec`), com 3 opções fixas: **Bone-In**, **Boneless**, **Offals**.
2. Eliminar o espaço grande entre as colunas **Item / Cut** e **Spec** — devem ficar lado a lado, comportamento de tabela compacta.

## Mudanças em `src/pages/supplier/SupplierCreateOffer.tsx`

### 1. Atualizar lista de specs (linha ~36)
```ts
const SPECS = ["Bone-In", "Boneless", "Offals"];
```

### 2. Atualizar `normalizeSpec` (linha ~40) para mapear o `bone_spec` do cadastro:
```ts
function normalizeSpec(raw): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "boneless") return "Boneless";
  if (v === "bone-in" || v === "bone in" || v === "bonein") return "Bone-In";
  if (v === "offals" || v === "offal") return "Offals";
  return "Bone-In"; // default sensato
}
```

### 3. Garantir que todos os pontos de prefill usem `normalizeSpec(c.bone_spec)` (já feito no add-row; replicar nos prefill flows das linhas ~501, ~550, ~656 e no default `EMPTY_NF` linha ~171).

### 4. Tightening do espaçamento entre Item e Spec (linhas ~2173-2174)
Trocar `minWidth: 220` por uma largura fixa enxuta, alinhada com as demais colunas:
```tsx
<th style={{ width: 180 }}>Item / Cut</th>
<th style={{ width: 90 }}>Spec</th>
```
Isso remove o "flex/stretch" que estava empurrando Spec para longe e mantém a sequência visual de tabela.

## Fora de escopo
Nenhuma alteração em business logic, banco, ou outros componentes.
