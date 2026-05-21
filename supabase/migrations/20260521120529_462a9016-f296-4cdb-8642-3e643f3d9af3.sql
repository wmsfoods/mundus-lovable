
-- Wipe previous seed and re-seed with full menu-block catalog
DELETE FROM public.feature_flags;

INSERT INTO public.feature_flags (key, platform, category, label, description, audience, enabled) VALUES
-- ============ BUYER · MAIN MENU ============
('buyer_home','web','buyer_main','Home','Buyer dashboard / home screen','buyer',true),
('buyer_requests','web','buyer_main','Requests','Create and manage purchase requests','buyer',true),
('buyer_create_request','web','buyer_main','Create Request','New request quick action','buyer',true),
('buyer_marketplace','web','buyer_main','Marketplace','Browse supplier offers','buyer',true),
('buyer_offers','web','buyer_main','My Offers','Saved offers list','buyer',true),
('buyer_orders','web','buyer_main','Orders','View and manage orders','buyer',true),
('buyer_negotiations','web','buyer_main','Negotiations','Bid and counter-offer flows','buyer',true),
('buyer_chat','web','buyer_main','Chat','Chat with suppliers','buyer',true),
('buyer_users','web','buyer_main','Team / Users','Manage company users','buyer',true),
-- BUYER · INSIGHTS
('buyer_procurement_intelligence','web','buyer_insights','Procurement Intelligence','AI-driven procurement insights','buyer',true),
-- BUYER · FUTURE
('buyer_ai_recommendations','web','buyer_future','AI Recommendations','Personalized supplier and cut recommendations','buyer',false),
('buyer_price_alerts','web','buyer_future','Price Alerts','Notify when target prices are hit','buyer',false),
('buyer_saved_searches','web','buyer_future','Saved Searches','Persist marketplace filters','buyer',false),
('buyer_rfq_multi_supplier','web','buyer_future','Multi-Supplier RFQ','Send one request to many suppliers','buyer',false),

-- ============ SUPPLIER · MAIN MENU ============
('supplier_home','web','supplier_main','Home','Supplier dashboard','supplier',true),
('supplier_my_offers','web','supplier_main','My Offers','Manage offers','supplier',true),
('supplier_create_offer','web','supplier_main','Create Offer','New offer flow','supplier',true),
('supplier_sales','web','supplier_main','Sales','Sales dashboard and order management','supplier',true),
('supplier_negotiations','web','supplier_main','Negotiations','Bid and counter-offer flows','supplier',true),
('supplier_offer_requests','web','supplier_main','Offer Requests','Incoming buyer requests','supplier',true),
('supplier_outreach','web','supplier_main','Outreach','Buyer outreach tools','supplier',true),
('supplier_users','web','supplier_main','Team / Users','Manage company users','supplier',true),
('supplier_company','web','supplier_main','My Company','Company profile','supplier',true),
-- SUPPLIER · INSIGHTS
('supplier_price_benchmark','web','supplier_insights','Price Benchmark','Compare prices across markets','supplier',true),
('supplier_analytics','web','supplier_insights','Analytics','Performance analytics','supplier',true),
-- SUPPLIER · FUTURE
('supplier_demand_forecast','web','supplier_future','Demand Forecast','Predict buyer demand','supplier',false),
('supplier_auto_pricing','web','supplier_future','Auto Pricing','Rule-based dynamic pricing','supplier',false),
('supplier_bulk_import','web','supplier_future','Bulk Offer Import','CSV / Excel offer upload','supplier',false),
('supplier_certifications','web','supplier_future','Certifications','Manage halal/kosher/organic certs','supplier',false),

-- ============ ADMIN · CRM ============
('admin_crm_prospects','web','admin_crm','Prospects','Prospect tracking','admin',true),
('admin_crm_pipeline','web','admin_crm','CRM Pipeline','Sales pipeline kanban','admin',true),
('admin_meeting_prep_ai','web','admin_crm','AI Meeting Prep','AI-generated meeting briefs','admin',true),
('admin_prospect_find_companies','web','admin_crm','Find Companies','Prospecting: companies','admin',true),
('admin_prospect_find_people','web','admin_crm','Find People','Prospecting: people','admin',true),
('admin_prospect_lists','web','admin_crm','Prospect Lists','Saved lists','admin',true),
-- ADMIN · OPERATIONS
('admin_companies','web','admin_ops','Companies','Manage all companies','admin',true),
('admin_deals','web','admin_ops','Deals','Deals overview','admin',true),
('admin_negotiations','web','admin_ops','Negotiations','All negotiations','admin',true),
('admin_verifications','web','admin_ops','Verifications','KYC / company verification','admin',true),
('admin_disputes','web','admin_ops','Disputes','Dispute resolution','admin',true),
-- ADMIN · MARKETPLACE CONFIG
('admin_products','web','admin_marketplace','Products','Catalog products','admin',true),
('admin_markets','web','admin_marketplace','Markets','Country markets','admin',true),
('admin_ports','web','admin_marketplace','Ports','Shipping ports','admin',true),
-- ADMIN · FINANCE
('admin_finance_revenue','web','admin_finance','Revenue','Revenue dashboard','admin',true),
('admin_finance_commissions','web','admin_finance','Commissions','Commission tracking','admin',true),

-- ============ PLATFORM (cross-cutting) ============
('platform_dark_mode','web','platform','Dark Mode','Dark theme toggle','all',true),
('platform_multi_language','web','platform','Multi-language','EN / PT / ES language switcher','all',true),
('platform_weight_unit_toggle','web','platform','Weight Unit Toggle','kg / lbs switching','all',true),
('platform_email_notifications','web','platform','Email Notifications','Transactional emails','all',true),
('platform_ai_chat_assistant','web','platform','AI Chat Assistant','In-app AI helper','all',false),

-- ============ MOBILE · BUYER ============
('buyer_home','mobile','buyer_main','Home','Buyer home on mobile','buyer',true),
('buyer_marketplace','mobile','buyer_main','Marketplace','Browse offers on mobile','buyer',true),
('buyer_offers','mobile','buyer_main','My Offers','Saved offers','buyer',true),
('buyer_create_request','mobile','buyer_main','Create Request','Quick request from mobile','buyer',true),
('buyer_orders','mobile','buyer_main','Orders','Orders on mobile','buyer',true),
('buyer_negotiations','mobile','buyer_main','Negotiations','Negotiations on mobile','buyer',true),
('buyer_chat','mobile','buyer_main','Chat','Chat on mobile','buyer',true),
('buyer_requests','mobile','buyer_main','Requests','Requests on mobile','buyer',true),
('buyer_procurement_intelligence','mobile','buyer_insights','Procurement Intelligence','Insights on mobile','buyer',false),
('buyer_scan_invoice','mobile','buyer_future','Scan Invoice','OCR invoice capture','buyer',false),
('buyer_voice_search','mobile','buyer_future','Voice Search','Search marketplace by voice','buyer',false),

-- ============ MOBILE · SUPPLIER ============
('supplier_home','mobile','supplier_main','Home','Supplier home on mobile','supplier',true),
('supplier_my_offers','mobile','supplier_main','My Offers','Offers on mobile','supplier',true),
('supplier_create_offer','mobile','supplier_main','Create Offer','Create from mobile','supplier',true),
('supplier_sales','mobile','supplier_main','Sales','Sales on mobile','supplier',true),
('supplier_negotiations','mobile','supplier_main','Negotiations','Negotiations on mobile','supplier',true),
('supplier_offer_requests','mobile','supplier_main','Offer Requests','Requests on mobile','supplier',true),
('supplier_outreach','mobile','supplier_main','Outreach','Outreach on mobile','supplier',false),
('supplier_price_benchmark','mobile','supplier_insights','Price Benchmark','Benchmark on mobile','supplier',false),
('supplier_analytics','mobile','supplier_insights','Analytics','Analytics on mobile','supplier',false),
('supplier_quick_quote','mobile','supplier_future','Quick Quote','Fast quoting from mobile','supplier',false),
('supplier_photo_upload','mobile','supplier_future','Photo Upload','Capture cut photos from camera','supplier',false),

-- ============ MOBILE · PLATFORM ============
('platform_push_notifications','mobile','platform','Push Notifications','Mobile push notifications','all',true),
('platform_biometric_login','mobile','platform','Biometric Login','Face ID / Touch ID','all',false),
('platform_offline_mode','mobile','platform','Offline Mode','Work without connection','all',false),
('platform_dark_mode','mobile','platform','Dark Mode','Dark theme on mobile','all',true),
('platform_multi_language','mobile','platform','Multi-language','Language switcher','all',true),
('platform_weight_unit_toggle','mobile','platform','Weight Unit Toggle','kg / lbs switching','all',true),
('platform_haptics','mobile','platform','Haptic Feedback','Vibration on actions','all',false),
('platform_qr_login','mobile','platform','QR Login','Sign in by scanning desktop QR','all',false);
