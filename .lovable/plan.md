## Manter design atual + completar v4

O layout 3-painéis e a paleta (`--p800` #B64769, cards brancos, `--bg-brand-soft`, Inter, raios 6-8px, chips 999px) que já estão em `SupplierCreateOffer.tsx` + `mundus-create-offer-v2.css` ficam **intocados**.

### Verificar/completar contra o spec v4

Vou revisar a implementação atual contra `LOVABLE-CREATE-OFFER-V4-SPEC-2.md` e o mock `mundus-create-offer-v4-2.jsx` e ajustar **apenas o que estiver faltando ou divergente**, sem mexer em cores, tipografia, espaçamentos ou estrutura visual.

Pontos que vou conferir:

1. **Header** — badge de origem `🇧🇷 Brazil · Santos (BRSSZ)` read-only + toggle "👁 Live preview".
2. **Painel esquerdo**
   - Container `20ft`/`40ft` (default 40ft) e Temperatura `Frozen`/`Chilled` (default Frozen).
   - Chips de mercados (CN, SA, AE, EG, AR, HK, PH, CL) com seleção múltipla.
   - Para cada mercado selecionado: card com portos selecionáveis, toggle "Same freight for all ports?" e input de frete US$/kg.
   - Incoterms (FOB, CFR, CIF, EXW, DDP, DAP) com campo extra condicional (insurance / city).
   - Certifications (Halal, Kosher, USDA, HACCP, BRC, Organic) — **preservar como está**.
   - Payment terms (select) + Distribution (Public / Selected customers com lista mock).
3. **Painel central**
   - Botão "✨ AI Import" abrindo painel com modos Paste / File / Voice (mock `setTimeout`).
   - Barra de capacidade (20ft = 13.000 kg, 40ft = 28.000 kg) com cor por % preenchimento.
   - Tabela de cuts com colunas: foto, cut, spec, packaging, grade, aging, peso, asking, floor, notes, remover.
   - Linha "Add cut" com selects de `CUTS_DB` por espécie + confirm/cancel.
4. **Painel direito (Live Preview)** — card no formato buyer: foto, título, metadados, lista de cuts, preço médio destacado, tags de distribuição.
5. **Footer sticky** — resumo (X mercados · Y cuts · Z kg) + botões "Save draft" e "Publish" (desabilitado até ter ≥1 mercado + ≥1 cut + ≥1 incoterm). Toast no publish, sem persistência.
6. **i18n** — chaves em `supplier.createOffer.v4.*` nos 3 idiomas (en/pt/es).
7. **Mobile** — empilhar em 1 coluna abaixo de 1100px (já no CSS), garantir scroll/safe-area no footer.

### Fora do escopo
- Sem alterar cores, fontes, raios, espaçamentos, sombras da v2 atual.
- Sem edge function de parse real (AI Import é mock).
- Sem upload real de fotos para storage (preview local com `URL.createObjectURL`).
- Sem persistência em Supabase.

### Arquivos
- `src/pages/supplier/SupplierCreateOffer.tsx` — ajustes pontuais conforme checklist acima.
- `src/styles/mundus-create-offer-v2.css` — apenas adicionar regras se algum elemento novo aparecer; nenhuma mudança nos tokens existentes.
- `src/i18n/locales/{en,pt,es}.json` — completar chaves faltantes em `supplier.createOffer.v4.*`.
