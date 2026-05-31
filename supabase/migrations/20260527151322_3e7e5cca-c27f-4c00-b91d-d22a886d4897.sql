
-- ---------- OFFERS & CHILDREN ----------
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offers_select_all" ON public.offers;
DROP POLICY IF EXISTS "offers_insert_supplier" ON public.offers;
DROP POLICY IF EXISTS "offers_update_supplier" ON public.offers;
DROP POLICY IF EXISTS "offers_delete_supplier" ON public.offers;
CREATE POLICY "offers_select_all" ON public.offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "offers_insert_supplier" ON public.offers FOR INSERT TO authenticated
  WITH CHECK (public.is_mundus_admin() OR supplier_id = public.current_user_company_id());
CREATE POLICY "offers_update_supplier" ON public.offers FOR UPDATE TO authenticated
  USING (public.is_mundus_admin() OR supplier_id = public.current_user_company_id())
  WITH CHECK (public.is_mundus_admin() OR supplier_id = public.current_user_company_id());
CREATE POLICY "offers_delete_supplier" ON public.offers FOR DELETE TO authenticated
  USING (public.is_mundus_admin() OR supplier_id = public.current_user_company_id());

ALTER TABLE public.offer_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offer_items_select_all" ON public.offer_items;
DROP POLICY IF EXISTS "offer_items_write_owner" ON public.offer_items;
CREATE POLICY "offer_items_select_all" ON public.offer_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "offer_items_write_owner" ON public.offer_items FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_items.offer_id AND o.supplier_id = public.current_user_company_id()))
  WITH CHECK (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_items.offer_id AND o.supplier_id = public.current_user_company_id()));

ALTER TABLE public.offer_markets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offer_markets_select_all" ON public.offer_markets;
DROP POLICY IF EXISTS "offer_markets_write_owner" ON public.offer_markets;
CREATE POLICY "offer_markets_select_all" ON public.offer_markets FOR SELECT TO authenticated USING (true);
CREATE POLICY "offer_markets_write_owner" ON public.offer_markets FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_markets.offer_id AND o.supplier_id = public.current_user_company_id()))
  WITH CHECK (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_markets.offer_id AND o.supplier_id = public.current_user_company_id()));

ALTER TABLE public.offer_allowed_incoterms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offer_incoterms_select_all" ON public.offer_allowed_incoterms;
DROP POLICY IF EXISTS "offer_incoterms_write_owner" ON public.offer_allowed_incoterms;
CREATE POLICY "offer_incoterms_select_all" ON public.offer_allowed_incoterms FOR SELECT TO authenticated USING (true);
CREATE POLICY "offer_incoterms_write_owner" ON public.offer_allowed_incoterms FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_allowed_incoterms.offer_id AND o.supplier_id = public.current_user_company_id()))
  WITH CHECK (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_allowed_incoterms.offer_id AND o.supplier_id = public.current_user_company_id()));

ALTER TABLE public.offer_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offer_snapshots_select_all" ON public.offer_snapshots;
DROP POLICY IF EXISTS "offer_snapshots_write_admin" ON public.offer_snapshots;
CREATE POLICY "offer_snapshots_select_all" ON public.offer_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "offer_snapshots_write_admin" ON public.offer_snapshots FOR ALL TO authenticated
  USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- ORDER CHILDREN ----------
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_party" ON public.order_items;
CREATE POLICY "order_items_party" ON public.order_items FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.orders ord LEFT JOIN public.offers o ON o.id = ord.offer_id WHERE ord.id = order_items.order_id AND (ord.buyer_company_id = public.current_user_company_id() OR o.supplier_id = public.current_user_company_id())))
  WITH CHECK (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.orders ord LEFT JOIN public.offers o ON o.id = ord.offer_id WHERE ord.id = order_items.order_id AND (ord.buyer_company_id = public.current_user_company_id() OR o.supplier_id = public.current_user_company_id())));

ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_documents_party" ON public.order_documents;
CREATE POLICY "order_documents_party" ON public.order_documents FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.orders ord LEFT JOIN public.offers o ON o.id = ord.offer_id WHERE ord.id = order_documents.order_id AND (ord.buyer_company_id = public.current_user_company_id() OR o.supplier_id = public.current_user_company_id())))
  WITH CHECK (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.orders ord LEFT JOIN public.offers o ON o.id = ord.offer_id WHERE ord.id = order_documents.order_id AND (ord.buyer_company_id = public.current_user_company_id() OR o.supplier_id = public.current_user_company_id())));

ALTER TABLE public.order_item_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_item_documents_party" ON public.order_item_documents;
CREATE POLICY "order_item_documents_party" ON public.order_item_documents FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders ord ON ord.id = oi.order_id LEFT JOIN public.offers o ON o.id = ord.offer_id WHERE oi.id = order_item_documents.order_item_id AND (ord.buyer_company_id = public.current_user_company_id() OR o.supplier_id = public.current_user_company_id())))
  WITH CHECK (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders ord ON ord.id = oi.order_id LEFT JOIN public.offers o ON o.id = ord.offer_id WHERE oi.id = order_item_documents.order_item_id AND (ord.buyer_company_id = public.current_user_company_id() OR o.supplier_id = public.current_user_company_id())));

ALTER TABLE public.order_item_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_item_images_party" ON public.order_item_images;
CREATE POLICY "order_item_images_party" ON public.order_item_images FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders ord ON ord.id = oi.order_id LEFT JOIN public.offers o ON o.id = ord.offer_id WHERE oi.id = order_item_images.order_item_id AND (ord.buyer_company_id = public.current_user_company_id() OR o.supplier_id = public.current_user_company_id())))
  WITH CHECK (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders ord ON ord.id = oi.order_id LEFT JOIN public.offers o ON o.id = ord.offer_id WHERE oi.id = order_item_images.order_item_id AND (ord.buyer_company_id = public.current_user_company_id() OR o.supplier_id = public.current_user_company_id())));

ALTER TABLE public.order_shipping_infos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_shipping_party" ON public.order_shipping_infos;
CREATE POLICY "order_shipping_party" ON public.order_shipping_infos FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.orders ord LEFT JOIN public.offers o ON o.id = ord.offer_id WHERE ord.id = order_shipping_infos.order_id AND (ord.buyer_company_id = public.current_user_company_id() OR o.supplier_id = public.current_user_company_id())))
  WITH CHECK (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.orders ord LEFT JOIN public.offers o ON o.id = ord.offer_id WHERE ord.id = order_shipping_infos.order_id AND (ord.buyer_company_id = public.current_user_company_id() OR o.supplier_id = public.current_user_company_id())));

-- ---------- CUSTOMER PRODUCTS ----------
ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_products_select_all" ON public.customer_products;
DROP POLICY IF EXISTS "customer_products_write_owner" ON public.customer_products;
CREATE POLICY "customer_products_select_all" ON public.customer_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "customer_products_write_owner" ON public.customer_products FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR company_id = public.current_user_company_id())
  WITH CHECK (public.is_mundus_admin() OR company_id = public.current_user_company_id());

ALTER TABLE public.customer_product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_product_images_select_all" ON public.customer_product_images;
DROP POLICY IF EXISTS "customer_product_images_write_owner" ON public.customer_product_images;
CREATE POLICY "customer_product_images_select_all" ON public.customer_product_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "customer_product_images_write_owner" ON public.customer_product_images FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = customer_product_images.customer_product_id AND cp.company_id = public.current_user_company_id()))
  WITH CHECK (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = customer_product_images.customer_product_id AND cp.company_id = public.current_user_company_id()));

ALTER TABLE public.customer_product_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_product_documents_select_all" ON public.customer_product_documents;
DROP POLICY IF EXISTS "customer_product_documents_write_owner" ON public.customer_product_documents;
CREATE POLICY "customer_product_documents_select_all" ON public.customer_product_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "customer_product_documents_write_owner" ON public.customer_product_documents FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = customer_product_documents.customer_product_id AND cp.company_id = public.current_user_company_id()))
  WITH CHECK (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = customer_product_documents.customer_product_id AND cp.company_id = public.current_user_company_id()));

-- ---------- SHARED FILE METADATA ----------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_authenticated" ON public.documents;
CREATE POLICY "documents_authenticated" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "images_authenticated" ON public.images;
CREATE POLICY "images_authenticated" ON public.images FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- PUBLIC REFERENCE CATALOGS ----------
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "countries_read_all" ON public.countries;
DROP POLICY IF EXISTS "countries_write_admin" ON public.countries;
CREATE POLICY "countries_read_all" ON public.countries FOR SELECT USING (true);
CREATE POLICY "countries_write_admin" ON public.countries FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "markets_read_all" ON public.markets;
DROP POLICY IF EXISTS "markets_write_admin" ON public.markets;
CREATE POLICY "markets_read_all" ON public.markets FOR SELECT USING (true);
CREATE POLICY "markets_write_admin" ON public.markets FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

ALTER TABLE public.ports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ports_read_all" ON public.ports;
DROP POLICY IF EXISTS "ports_write_admin" ON public.ports;
CREATE POLICY "ports_read_all" ON public.ports FOR SELECT USING (true);
CREATE POLICY "ports_write_admin" ON public.ports FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_categories_read_all" ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_write_admin" ON public.product_categories;
CREATE POLICY "product_categories_read_all" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "product_categories_write_admin" ON public.product_categories FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

ALTER TABLE public.standard_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "standard_products_read_all" ON public.standard_products;
DROP POLICY IF EXISTS "standard_products_write_admin" ON public.standard_products;
CREATE POLICY "standard_products_read_all" ON public.standard_products FOR SELECT USING (true);
CREATE POLICY "standard_products_write_admin" ON public.standard_products FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

ALTER TABLE public.standard_product_names ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "standard_product_names_read_all" ON public.standard_product_names;
DROP POLICY IF EXISTS "standard_product_names_write_admin" ON public.standard_product_names;
CREATE POLICY "standard_product_names_read_all" ON public.standard_product_names FOR SELECT USING (true);
CREATE POLICY "standard_product_names_write_admin" ON public.standard_product_names FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

ALTER TABLE public.freight_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "freight_options_read_all" ON public.freight_options;
DROP POLICY IF EXISTS "freight_options_write_admin" ON public.freight_options;
CREATE POLICY "freight_options_read_all" ON public.freight_options FOR SELECT USING (true);
CREATE POLICY "freight_options_write_admin" ON public.freight_options FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_read_all" ON public.roles;
DROP POLICY IF EXISTS "roles_write_admin" ON public.roles;
CREATE POLICY "roles_read_all" ON public.roles FOR SELECT USING (true);
CREATE POLICY "roles_write_admin" ON public.roles FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_permissions_read_all" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_write_admin" ON public.role_permissions;
CREATE POLICY "role_permissions_read_all" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "role_permissions_write_admin" ON public.role_permissions FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permissions_read_all" ON public.permissions;
DROP POLICY IF EXISTS "permissions_write_admin" ON public.permissions;
CREATE POLICY "permissions_read_all" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "permissions_write_admin" ON public.permissions FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- LEGACY NOTIFICATIONS ----------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_mundus_admin() OR user_id = auth.uid());

-- ---------- USER REQUESTS ----------
DROP POLICY IF EXISTS "user_requests_owner" ON public.user_requests;
CREATE POLICY "user_requests_owner" ON public.user_requests FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR created_user_id = auth.uid() OR company_id = public.current_user_company_id())
  WITH CHECK (public.is_mundus_admin() OR created_user_id = auth.uid() OR company_id = public.current_user_company_id());

ALTER TABLE public.user_request_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_request_documents_owner" ON public.user_request_documents;
CREATE POLICY "user_request_documents_owner" ON public.user_request_documents FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.user_requests ur WHERE ur.id = user_request_documents.user_request_id AND (ur.created_user_id = auth.uid() OR ur.company_id = public.current_user_company_id())))
  WITH CHECK (public.is_mundus_admin() OR EXISTS (SELECT 1 FROM public.user_requests ur WHERE ur.id = user_request_documents.user_request_id AND (ur.created_user_id = auth.uid() OR ur.company_id = public.current_user_company_id())));

-- ---------- COMPANY BUYER RATINGS ----------
ALTER TABLE public.company_buyer_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buyer_ratings_select_all" ON public.company_buyer_ratings;
DROP POLICY IF EXISTS "buyer_ratings_write_self" ON public.company_buyer_ratings;
CREATE POLICY "buyer_ratings_select_all" ON public.company_buyer_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "buyer_ratings_write_self" ON public.company_buyer_ratings FOR ALL TO authenticated
  USING (public.is_mundus_admin() OR buyer_id = auth.uid())
  WITH CHECK (public.is_mundus_admin() OR buyer_id = auth.uid());
