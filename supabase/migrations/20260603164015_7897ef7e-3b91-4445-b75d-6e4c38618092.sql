GRANT SELECT (
  id,
  offer_id,
  customer_product_id,
  amount,
  price,
  condition,
  meat_specification,
  aging_method,
  created_at,
  plant_number,
  packaging,
  plant_id
) ON public.offer_items TO authenticated, anon;