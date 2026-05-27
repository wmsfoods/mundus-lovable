## Documents tab no CRM Pipeline

### Adicionar nova aba "Documents" em `CRMPipeline.tsx`
Nova aba ao lado das existentes (Pipeline / Buyers / Suppliers / Interviews / Learnings) com 3 subabas:

- **Admin Docs** — placeholder vazio "Nenhum documento ainda" (futura área para docs internos da equipe Mundus).
- **Buyers** — renderiza o guia "[Buyer] Mundus guide" como HTML.
- **Suppliers** — placeholder vazio (futura área).

### Componente novo: `src/components/admin/docs/BuyerGuideDocument.tsx`
- HTML estilizado (não embed de PDF) baseado no conteúdo extraído do anexo.
- 9 seções: Ponto de partida, Solução, Credibilidade, Benefícios, Operação, Custo, Prova social, FAQ, Próximo passo + canais de contato.
- Visual: cores Mundus (wine `#9B2251`), cards de benefícios com ícones (🌍 ✅ 🔒), tabela de problemas/soluções, stepper numerado, blocos "$0".
- **Seletor de idioma** no topo (4 botões pill): 🇺🇸 EN · 🇧🇷 PT · 🇪🇸 ES · 🇨🇳 ZH. Idioma default = PT (idioma do PDF original).
- Botão "Imprimir / Salvar PDF" usando `window.print()` + CSS `@media print`.
- Conteúdo armazenado num dicionário local `CONTENT[lang]` dentro do componente (auto-contido, sem mexer no `src/i18n`).

### Componente novo: `src/components/admin/docs/DocsTab.tsx`
- Sub-navegação pill (Admin Docs / Buyers / Suppliers).
- Renderiza o documento correspondente.

### Edição em `CRMPipeline.tsx`
- Adicionar `"documents"` ao tipo `Tab`.
- Inserir item `{ k: "documents", l: "Documents" }` no array `TABS`.
- Render condicional `{tab === "documents" && <DocsTab />}`.

### Traduções
Conteúdo do guia traduzido inline em 4 idiomas (PT, EN, ES, ZH). Mantém o tom comercial original do PDF: títulos curtos, parágrafos com voz de autoridade, exemplos preservados (CABC, Frigorífico Valencio, etc.).

### Arquivos criados/editados
- `src/pages/admin/CRMPipeline.tsx` (editar — adicionar aba)
- `src/components/admin/docs/DocsTab.tsx` (novo)
- `src/components/admin/docs/BuyerGuideDocument.tsx` (novo, ~600 linhas com 4 traduções)
- `src/styles/mundus-docs.css` (novo — estilos do documento e print)