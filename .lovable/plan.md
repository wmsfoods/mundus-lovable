## Problem

When admin changes Order status from the Deals page, the update fails with:
> Could not find the 'updated_at' column of 'orders' in the schema cache

The `orders` table does not have an `updated_at` column, but `AdminOrders.tsx` sends `updated_at: new Date().toISOString()` in the update payload, which PostgREST rejects.

## Fix

In `src/pages/admin/AdminOrders.tsx`, inside `updateStatus`, remove `updated_at` from the `.update({...})` payload — keep only `{ status: newStatus }`.

No other tables or business logic affected. `updateRevenueStatus` already uses the correct `revenue_status_changed_at` column and is fine.
