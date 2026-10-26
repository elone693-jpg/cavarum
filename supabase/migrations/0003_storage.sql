-- Cavarum v2 — stockage privé des photos et factures.
-- Chaque fichier est rangé sous {user_id}/… et n'est accessible qu'à son propriétaire
-- (affichage via URL signée).

insert into storage.buckets (id, name, public)
values ('bottle-photos', 'bottle-photos', false), ('invoices', 'invoices', false)
on conflict (id) do update set public = false;

create policy cavarum_objects_select on storage.objects for select to authenticated
  using (
    bucket_id in ('bottle-photos', 'invoices')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy cavarum_objects_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('bottle-photos', 'invoices')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy cavarum_objects_update on storage.objects for update to authenticated
  using (
    bucket_id in ('bottle-photos', 'invoices')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('bottle-photos', 'invoices')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy cavarum_objects_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('bottle-photos', 'invoices')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
