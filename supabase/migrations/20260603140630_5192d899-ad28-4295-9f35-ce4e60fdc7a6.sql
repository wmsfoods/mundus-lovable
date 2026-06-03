UPDATE public.offers o
SET origin_country = c.english_name
FROM public.ports p
JOIN public.countries c ON c.id = p.country_id
WHERE o.origin_port_id = p.id
  AND (o.origin_country IS DISTINCT FROM c.english_name);