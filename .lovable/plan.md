## O que aconteceu

O card da vitrine do **buyer** mostra corretamente "Poultry" (ele lê a categoria real do produto via `customer_product → standard_product → product_category.name_en`).

O card da listagem do **supplier** (Supplier > Offers) mostra **sempre "Beef"** porque o hook que carrega as offers tem a categoria **hard-coded**:

```ts
// src/hooks/useRealSupplierOffers.ts:109
category: "Beef",
```

Além disso, o `SELECT` desse hook nem busca a categoria do produto — então mesmo que removêssemos o hard-code, não havia dado para mostrar. Por isso uma oferta cadastrada como Poultry aparece como "Beef" na listagem do supplier.

A oferta no banco está correta. O bug é só de exibição/leitura.

## Correção

Alterar `src/hooks/useRealSupplierOffers.ts`:

1. **Expandir o SELECT** dos offer_items para trazer a categoria via standard_product:

   ```ts
   items:offer_items (
     id, amount, price, minimum_price, condition, packaging,
     customer_product:customer_products (
       id, name,
       standard_product:standard_products (
         product_category:product_categories ( code, name_en )
       )
     )
   )
   ```

2. **Derivar `category` da primeira linha** (cai num fallback se vier vazio):

   ```ts
   const firstCategory =
     items[0]?.customer_product?.standard_product?.product_category?.name_en
     ?? "—";
   // ...
   category: firstCategory,
   ```

3. **Tipagem `SupplierOffer.category`**: hoje é `"Beef"` literal (mockSupplierOffers). Trocar para `string` (o card já renderiza qualquer texto e `categoryToProtein()` normaliza para o filtro de proteína).

## Por que não vai mais acontecer

- A categoria passa a ser lida da fonte de verdade (`product_categories`), igual ao buyer/admin já fazem. Não há mais ponto único hard-coded que possa divergir.
- Como o hook do supplier e o do buyer agora seguem o mesmo padrão de join, qualquer mudança futura no schema vai quebrar de forma simétrica e visível, em vez de um lado mostrar valor errado silenciosamente.

## Validação

- Abrir Supplier > Offers: a oferta `M-800096-2026` (Frozen Chicken Drumette) deve mostrar **Poultry** no card.
- Conferir que ofertas de Beef continuam mostrando "Beef".
- Filtro de proteína no topo continua funcionando (usa `categoryToProtein`, que já cobre Beef/Poultry/Pork/Lamb).
