## Limpeza completa de dados de teste

Vou apagar (hard delete) todos os registros transacionais e suas dependências, mantendo catálogos (cuts, produtos, países, portos), empresas, usuários e configurações.

### O que será apagado

**Comercial (zerado total):**
- `orders` (2) + filhos: `order_items`, `order_documents`, `shipment_containers`, `shipping_instructions`
- `negotiations` (7) + filhos: `round_proposals`, `cut_rounds`, `counter_proposals`, `negotiation_tokens`, `agreed_items`
- `offers` (14) + filhos: `offer_items`, `offer_images`, `offer_destination_ports`
- `buyer_requests` (7) + filhos: `request_items`, `request_responses`, anexos

**Notificações e logs vinculados:**
- `app_notifications` referentes a esses registros
- `audit_log` (opcional — confirmo abaixo)

**CRM:**
- `crm_companies` "Inma Ireland" + contatos/atividades vinculadas

### O que será preservado
- Empresas Mundus (buyers/suppliers reais), usuários, roles, ofícios
- Catálogos: cuts, standard_products, customer_products, countries, ports, markets
- Configurações de negociação, preferências de notificação
- Módulo Mundus Whats (mw_*), Outreach, CRM (exceto Inma Ireland)
- `audit_log` mantido como histórico de auditoria

### Ordem de execução (respeita FKs)

```text
1. order_documents, shipment_containers, shipping_instructions, order_items
2. orders
3. counter_proposals, cut_rounds, round_proposals, negotiation_tokens
4. negotiations
5. offer_destination_ports, offer_images, offer_items
6. offers
7. request_responses, request_items, buyer_request attachments
8. buyer_requests
9. app_notifications órfãs
10. crm_activities + crm_contacts da Inma Ireland → crm_companies
```

### Como vou executar

Uma migration única `cleanup_test_data` com `DELETE` em ordem segura, dentro de uma transação implícita. Vou usar `TRUNCATE ... CASCADE` quando seguro para as tabelas filhas para garantir limpeza completa.

### Confirmações antes de rodar

1. **Audit log**: mantenho intacto (recomendado) ou apago também?
2. **Soft-deleted antigos** (`deleted_at IS NOT NULL`): apago de vez junto ou deixo?

Se confirmar essas 2 perguntas eu já rodo a migration.