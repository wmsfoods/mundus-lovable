## Mudanças no Step 3 do Signup (Company Profile)

### 1. Lista de proteínas
Em `src/pages/signup/Signup.tsx` (linha 29):
- Trocar `["Beef", "Pork", "Poultry", "Lamb", "Seafood", "Other"]` por `["Beef", "Pork", "Poultry", "Ovine", "Seafood"]`.
- Remove "Other" e renomeia "Lamb" → "Ovine".

### 2. Tornar Protein profile obrigatório
- Atualizar `canProceed` (linha ~577) para exigir `data.proteins.length >= 1`.
- Continua permitindo selecionar todas (lógica de toggle já suporta múltipla seleção, inclusive todas).
- Adicionar `*` vermelho no label "Protein profile" indicando obrigatoriedade (mesmo padrão visual dos demais obrigatórios).

### 3. Feedback do que falta preencher
Quando o botão "Proceed" estiver desabilitado, mostrar abaixo dele um bloco discreto listando os campos pendentes em tempo real:

```
text
⚠ To proceed, complete:
  • Company name
  • Tax ID
  • Role
  • Protein profile (select at least one)
  • Countries of operation (at least 1)
```

Detalhes de UI:
- Bloco aparece logo acima/abaixo do botão Proceed, só quando há pendências.
- Texto pequeno em `text-gray-500`, ícone alerta em `#B64769`.
- Lista é derivada do estado atual (sem useState extra): mapeia cada campo faltante para o seu label traduzido.
- Como bônus de affordance: ao passar o mouse sobre o botão desabilitado, o bloco recebe um leve highlight (border do bloco em `#B64769`/10).

### 4. i18n
Adicionar chaves em `en/es/fr/pt/zh`:
- `signup.fields.proteinProfileRequired` → "Select at least one protein"
- `signup.missingFields.title` → "To proceed, please complete:"
- `signup.missingFields.companyName`, `.taxId`, `.role`, `.proteinProfile`, `.countriesOfOperation`

### Fora do escopo
- Sem mudanças em backend, Edge Functions, schema ou outras telas. Apenas Step 3 do Signup + locales.