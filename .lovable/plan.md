# Supplier Document Center ("Documents & Specs")

A company-level library for company docs, certifications and product spec sheets, with a read-only buyer view and full admin access. Visual style matches the existing app (wine #B64769, shadcn/ui).

## Scope

Three surfaces, one data model:
- **Supplier** — `/supplier/company/documents` — full CRUD on the supplier's own library.
- **Buyer** — `/buyer/suppliers/:companyId/specs` — read-only view of published docs, linked from offer detail.
- **Admin (Mundus)** — `/admin/companies/:companyId/documents` — full CRUD on any company.

Assumption (please correct if wrong): the existing `company_documents` table (already in the schema) is being **replaced/expanded** to fit this spec. Today it has columns like `doc_type`, `name`, `file_url`, `file_path`. The plan migrates it to the new shape, preserving rows where possible (`doc_type → category`, `name → title`). If you'd rather keep the legacy table untouched and create a new `company_library_documents` table, I'll switch.

Out of scope (untouched): the per-offer Documents/Specs uploaded inside the offer wizard.

## Database

New/altered table `public.company_documents` exactly per spec:
- `category` text check in `('company_doc','certification','product_spec')`
- `title`, `description`, `file_path`, `file_type`, `file_size_bytes`
- `cert_type`, `expires_at` (certifications)
- `product_category`, `meat_cut` (product specs)
- `is_published` boolean default false
- `created_by`, `created_at`, `updated_at`

Indexes on `(company_id, category)` and `(company_id, is_published)`.

**Storage**: private bucket `company-documents`, path `{company_id}/{uuid}-{filename}`. No public URLs.

**RLS (strict, never `USING(true)`)**:
- Supplier CRUD scoped via `EXISTS (company_users WHERE user_id=auth.uid() AND company_id=company_documents.company_id)`.
- Admins via `public.has_role(auth.uid(),'admin')`.
- Buyer SELECT only `WHERE is_published = true` (authenticated only).
- `REVOKE ALL ... FROM PUBLIC, anon` on table.

**RPC** `public.get_company_document_url(doc_id uuid) returns text`:
- `SECURITY DEFINER`, `search_path=public`.
- Checks: requester is owner-company supplier OR admin OR (authenticated buyer AND `is_published`).
- Returns a 60-second signed URL using `storage.create_signed_url` (or via edge function fallback if needed).
- `REVOKE ALL ... FROM PUBLIC, anon`; `GRANT EXECUTE TO authenticated`.

Helper RPC `public.company_has_published_documents(p_company_id uuid) returns boolean` for the offer-detail CTA gate.

## Hooks & data layer

`src/hooks/useCompanyDocuments.ts` (TanStack Query):
- `useCompanyDocuments(companyId, { onlyPublished })` — list.
- `useUploadCompanyDocument` — uploads to storage, inserts row, invalidates.
- `useUpdateCompanyDocument` / `useDeleteCompanyDocument` / `useTogglePublishCompanyDocument`.
- `useCompanyDocumentSignedUrl(docId)` — calls RPC on demand.
- `useCompanyHasPublishedDocs(companyId)` — for the offer CTA.

All mutations invalidate `['company-documents', companyId]`.

## Components

`src/components/companyDocuments/`
- `DocumentCenter.tsx` — shared shell used by supplier and admin (tabs, toolbar, grid/list, counter). Props: `companyId`, `canManage`.
- `DocumentCard.tsx`, `DocumentRow.tsx` — file icon, title, meta line, badges, edit/delete, publish toggle, Draft state.
- `ExpiryBadge.tsx` — green/amber(<60d)/red logic.
- `UploadDocumentDialog.tsx` / `EditDocumentDialog.tsx` — drag&drop (PDF/PNG/JPG, ≤10MB), conditional fields per tab, Cut select reuses `loadCutsByRegionAndCategory`.
- `DocumentPreviewDialog.tsx` — inline PDF/image viewer fed by signed URL.
- `BuyerDocumentList.tsx` — read-only row list with Preview + Download buttons.

Mobile parity: dialogs become bottom sheets ≤640px, targets ≥44px, single-column card grid.

## Pages & routes

- `src/pages/supplier/SupplierCompanyDocuments.tsx` → renders `DocumentCenter` with `canManage`. Add to `SupplierShell` sidebar as "Documents & Specs".
- `src/pages/buyer/BuyerSupplierSpecs.tsx` at `/buyer/suppliers/:companyId/specs` — header card (avatar/initials, name, city/country · rating · deals, Verified, valid cert chips, published count), info bar, three sections, Preview/Download via RPC. Only published rows. No edit affordances.
- `src/pages/admin/AdminCompanyDocuments.tsx` at `/admin/companies/:companyId/documents` — wraps `DocumentCenter` in admin layout with `canManage`. Link added from existing admin company detail/list (`Documents & Specs` action).
- `src/pages/buyer/OfferDetail.tsx` — next to supplier name, conditionally render `View Product Specs` button when `useCompanyHasPublishedDocs` is true.

All routes registered in `src/App.tsx` with appropriate guards (`RequireAuth`, `RequireRole`, `RequireAdmin`).

## i18n

New keys under `companyDocuments.*` in `src/i18n/index.ts` for en/es/fr/pt/zh: section/tab titles, dialog labels, badges (Draft, Visible to buyers, Expires in {n} days, Expired {date}, Valid until {date}), toolbar copy, buyer info bar, offer CTA "View Product Specs".

## Verification

- `supabase--linter` after migration; fix any new findings.
- Manual: upload as supplier → toggle publish → open buyer route → preview + download via signed URL → confirm RPC denies non-buyer/non-supplier/non-admin and denies unpublished for buyers.
- Confirm offer-detail CTA hides when no published docs exist.

## Technical notes

- Reuses `public.has_role(uuid, app_role)` and `public.company_users` join pattern already in the codebase.
- Storage bucket created via `supabase--storage_create_bucket(public=false)`.
- Signed URL generated server-side inside the RPC using `storage.create_signed_url(bucket, path, expires_in)` to avoid leaking the path; the function returns only the URL string.
- File-type guard duplicated client and server (RPC validates `file_type` on insert via a trigger).
