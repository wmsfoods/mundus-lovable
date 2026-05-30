## Objetivo

Adicionar uma nova documentação formal **"Modelo Multi-Office (Fases 1-5)"** dentro de `/admin/docs` → aba **Plataforma**, ao lado de "Documentação da Plataforma" e "Relatório de Gaps", cobrindo tudo o que foi construído: arquitetura, papéis, fluxo de roteamento HQ → office, Global Director, isolamento por RLS e onde clicar para configurar.

## Onde aparece

`Admin → Documents → Plataforma → 🏢 Multi-Office Model`

Mesmo padrão visual dos outros docs (capa, kickers, cards, tabelas, passos numerados, callouts) — usando o `AdminDocView` existente. Sem mexer em backend.

## Arquivos

**Criar**
- `src/components/admin/docs/MultiOfficeDocument.tsx` — novo `DocContent` registrado em PT (e replicado para en/es/zh como os outros docs da aba Plataforma fazem hoje).

**Editar**
- `src/components/admin/docs/DocsTab.tsx` — adicionar a opção `multioffice` no seletor da aba Plataforma e incluir o novo doc no `registry` da busca.

## Estrutura das seções do novo documento

1. **00 — Visão geral** — o que é o modelo, por que existe, glossário (HQ, Office, Family, Global Director, Operator).
2. **01 — Arquitetura de Companies** — `companies.parent_company_id`, family root, `office_plants`, `office_markets`. Tabela de colunas.
3. **02 — Papéis e permissões** — `master_supplier/buyer`, `supplier_global_director`, `buyer_global_director`, HQ member, office operator. Cards comparando visibilidade.
4. **03 — Como configurar offices** — passos numerados: `/admin/crm` → Company detail → criar filhos → definir plantas e mercados.
5. **04 — Como configurar o team** — `CompanyTeamPanel`, convite via `send-team-invite`, escopos (office / HQ / Global Director).
6. **05 — Fluxo de Request → Office** — passos numerados do buyer até o operator do office, com `auto_route_request`, `assign_request_to_office`, status (`unassigned`, `assigned`), HQ Inbox vs Office Inbox. Inclui um diagrama ASCII em bloco `quote`/`callout`.
7. **06 — Experiência do Global Director** — `ByOfficeRollup`, `CutComparison`, `market_cut_benchmark` (mínimo 3 amostras), act-anywhere.
8. **07 — Isolamento e segurança (RLS)** — `user_supplier_scope_ids()`, `user_buyer_scope_ids()`, garantias entre offices da mesma family, comportamento para mundus admin.
9. **08 — Checklist de QA** — cenários por fase (criar office, atribuir request, login como operator, login como director, ver rollup, comparar cuts).
10. **09 — Rotas relevantes** — tabela com `/admin/crm`, `/supplier/requests`, `/supplier/rollup`, `/supplier/cuts/compare`, `/buyer/requests/new`.
11. **10 — Changelog** — entrada inicial "2026-05-30 — Publicação do documento Multi-Office Fases 1-5".

## Diagrama do fluxo

Renderizado dentro do próprio doc como ASCII art em um bloco `quote` (não usar Mermaid, para manter coerência visual com os outros docs e impressão em PDF):

```text
Buyer Request → HQ (target_supplier_id)
        │
        ▼
auto_route_request (office_markets)
   ├─ match único → assigned_office_id + routing_status='assigned'
   └─ ambíguo    → HQ Inbox (unassigned)
                        │
                        ▼
            HQ / Global Director
            "Assign to office ▾" → assign_request_to_office
                        │
                        ▼
                  Office Operator
              vê em Office Inbox (Assigned)
                e responde com oferta
```

## i18n

Como os outros docs de Plataforma (`PlatformDocDocument`, `GapReportDocument`) registram o mesmo `DocContent` para todos os idiomas, este vai seguir o mesmo padrão (PT como fonte; en/es/zh apontando para o mesmo objeto). Tradução real fica como tarefa futura — anotado no changelog.

## Fora do escopo

- Sem screenshots embutidos (a `AdminDocView` atual não suporta imagens; manteríamos consistência). Se quiser fotos depois, abrimos um patch dedicado para estender o renderer com um bloco `image`.
- Sem mudanças em RLS, hooks ou rotas — só conteúdo de documentação.
