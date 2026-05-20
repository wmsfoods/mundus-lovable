
insert into storage.buckets (id, name, public) values ('cut-images', 'cut-images', true) on conflict (id) do nothing;

create policy "cut-images public read" on storage.objects for select using (bucket_id = 'cut-images');
create policy "cut-images admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'cut-images' and public.is_mundus_admin());
create policy "cut-images admin update" on storage.objects for update to authenticated using (bucket_id = 'cut-images' and public.is_mundus_admin());
create policy "cut-images admin delete" on storage.objects for delete to authenticated using (bucket_id = 'cut-images' and public.is_mundus_admin());
