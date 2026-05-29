## Direção corrigida

Pelas imagens, o **layout-padrão é o do buyer/supplier** (`My Company` com cards Locations · Contact · Profile · Trade Preferences). É esse visual que vai ser o "canônico" — e o **admin da Mundus passa a usá-lo também** quando abre o registro de uma empresa. Hoje está o contrário: cada lado tem sua tela.

Sobre as perguntas:

- *"O admin que você colocou ai é o admin da Mundus?"* — Sim. Em todo o sistema, "admin" = membro da equipe Mundus (verificado via `is_mundus_admin()`). Buyers/Suppliers não têm papel "admin" sobre a plataforma; o equivalente deles é `master_buyer`/`master_supplier`, que manda **dentro da própria empresa**, mas nunca pode deletar a empresa nem alterar flags Mundus.
- *Manage / Delete* — fica **escondido** do buyer/supplier. Só aparece para quem passa em `is_mundus_admin()`.

## O que vai mudar

### 1. Componente único `CompanyRecordView`

Extrair o conteúdo atual de `src/components/company/CompanyProfilePage.tsx` (o layout das imagens) para um componente reutilizável:

```text
src/components/company/CompanyRecordView.tsx
  props:
    companyId: string
    viewerRole: "buyer" | "supplier" | "admin"
    embedded?: boolean   // true = sem Crumbs/PageTitle (uso interno em outras telas)
```

Esse componente renderiza **sempre os mesmos cards**, na mesma ordem das imagens anexadas:

1. Header da empresa (nome + Tax ID + chip BUYER/SUPPLIER + logo)
2. **Locations** (HQ + Offices/Factories) — substitui as páginas atuais `SupplierOffices` / a aba "Plants" do admin
3. **Contact & website**
4. **Supplier profile** ou **Buyer profile** (proteínas + cuts) conforme `is_supplier`/`is_buyer`
5. **Trade Preferences**
6. **Team / Users** (novo card colapsável, ver §3)
7. **Mundus admin controls** (novo card — ver §2, visível só se `viewerRole === "admin"`)

A página antiga do admin (`AdminCompanyDetail.tsx` com 7 abas próprias) é substituída por esse mesmo `CompanyRecordView` com `viewerRole="admin"`.

### 2. Controles administrativos isolados

Tudo que hoje vive no admin e **não pode** vazar para buyer/supplier vira um card no fim da tela, renderizado só quando `viewerRole === "admin"`:

- Toggles "Mundus manages offers (supplier)" e "Mundus manages requests (buyer)"
- Toggle `is_verified`
- Mudar `status` (active/inactive)
- Editar `is_buyer` / `is_supplier`
- Botão **Delete company** (com confirmação)
- Botão **Act on behalf**

Para buyer/supplier esses controles simplesmente não existem na árvore React — não é só CSS hidden. Backend continua protegido por RLS / triggers (`crm_companies_prevent_delete_if_onboarded`, `tg_company_users_block_admin_escalation`, etc.).

### 3. Users e Offices dentro de My Company

Conforme pedido: **eliminar as páginas dedicadas** e mover o conteúdo para cards dentro do `CompanyRecordView`:

- **Locations**: já é parte do layout-padrão; ganha as contagens hoje exclusivas do `SupplierOffices` (users/offers/orders por escritório) num formato discreto.
- **Team**: novo card "Team members" reaproveitando `CompanyTeamPanel` (mesmo componente do admin). Master pode convidar / editar / desativar; demais usuários só visualizam.

Rotas atuais continuam respondendo, mas redirecionam:

| Rota antiga | Comportamento novo |
|---|---|
| `/buyer/company` | renderiza `CompanyRecordView viewerRole="buyer"` |
| `/supplier/company` | renderiza `CompanyRecordView viewerRole="supplier"` |
| `/buyer/users` | redirect para `/buyer/company#team` |
| `/supplier/users` | redirect para `/supplier/company#team` |
| `/supplier/offices` | redirect para `/supplier/company#locations` |
| `/admin/companies/:id` | renderiza `CompanyRecordView viewerRole="admin" companyId={id}` |

A sidebar do buyer/supplier perde os itens "Users" e "Offices" (ou eles viram âncoras dentro de My Company — definimos no momento da implementação, ambas são triviais).

### 4. Permissões — regras finais

| Ação | Mundus admin | Master buyer/supplier | Demais usuários |
|---|:---:|:---:|:---:|
| Ver My Company | ✅ | ✅ | ✅ |
| Editar dados gerais, locations, preferências | ✅ | ✅ | ❌ |
| Convidar / desativar usuários do time | ✅ | ✅ | ❌ |
| Toggles Mundus-managed, verified, status | ✅ | ❌ (oculto) | ❌ |
| Delete company | ✅ | ❌ (oculto) | ❌ |

Vamos garantir no momento da implementação que as policies de UPDATE em `companies`, `company_about`, `company_plants`, `company_certifications`, `company_documents`, `company_preferences`, `company_users` permitem o master da própria empresa. Se faltar alguma, fazemos uma migration mínima só de policies — sem mexer em schema.

## Fora de escopo

- Nada de novas tabelas/colunas.
- Não toca em fluxos de oferta/negociação/orders.
- Não muda menu/sidebar global além de remover os itens redundantes.

## Resultado

Buyer, supplier e admin abrem o registro de empresa e vêem **a mesma tela** das imagens anexadas. A diferença para a Mundus é só um card extra no rodapé com as ações administrativas (toggles + delete). Sem páginas separadas para Users e Offices.
