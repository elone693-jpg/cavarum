-- Cavarum v2 — règles d'accès (RLS).
-- Principe : chaque utilisateur ne voit et ne modifie que ses propres données ;
-- le rôle admin est vérifié côté serveur, jamais par le seul front.

create function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
$$;

create function public.owns_cellar(target uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.cellars where id = target and user_id = auth.uid())
$$;

create function public.owns_bottle(target uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.bottles where id = target and user_id = auth.uid())
$$;

create function public.owns_location(target uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target is null or exists (
    select 1 from public.storage_locations where id = target and user_id = auth.uid()
  )
$$;

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant execute on function public.is_admin(), public.owns_cellar(uuid), public.owns_bottle(uuid),
  public.owns_location(uuid) to authenticated;

-- Profils et rôles ----------------------------------------------------------

alter table public.profiles enable row level security;
grant select, update on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

alter table public.user_roles enable row level security;
grant select on public.user_roles to authenticated;
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Caves et emplacements -----------------------------------------------------

alter table public.cellars enable row level security;
grant select, insert, update, delete on public.cellars to authenticated;
create policy cellars_owner on public.cellars for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.storage_locations enable row level security;
grant select, insert, update, delete on public.storage_locations to authenticated;
create policy storage_locations_owner on public.storage_locations for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_cellar(cellar_id) and public.owns_location(parent_id));

-- Catalogue partagé ---------------------------------------------------------

alter table public.rums enable row level security;
grant select, insert, update, delete on public.rums to authenticated;
create policy rums_select on public.rums for select to authenticated using (true);
create policy rums_insert on public.rums for insert to authenticated
  with check (created_by = auth.uid());
create policy rums_admin_update on public.rums for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy rums_admin_delete on public.rums for delete to authenticated
  using (public.is_admin());

-- Exemplaires et données associées ------------------------------------------

alter table public.bottles enable row level security;
grant select, insert, update, delete on public.bottles to authenticated;
create policy bottles_owner on public.bottles for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_cellar(cellar_id) and public.owns_location(location_id));

alter table public.bottle_photos enable row level security;
grant select, insert, update, delete on public.bottle_photos to authenticated;
create policy bottle_photos_owner on public.bottle_photos for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_bottle(bottle_id));

alter table public.purchases enable row level security;
grant select, insert, update, delete on public.purchases to authenticated;
create policy purchases_owner on public.purchases for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_bottle(bottle_id));

alter table public.valuations_history enable row level security;
grant select, insert, update, delete on public.valuations_history to authenticated;
create policy valuations_history_owner on public.valuations_history for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_bottle(bottle_id));

-- Usage IA : lecture seule côté client --------------------------------------

alter table public.ai_usage enable row level security;
grant select on public.ai_usage to authenticated;
create policy ai_usage_select on public.ai_usage for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Rapport de migration ------------------------------------------------------

alter table public.migration_runs enable row level security;
grant select, insert, update on public.migration_runs to authenticated;
create policy migration_runs_owner on public.migration_runs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.migration_items enable row level security;
grant select, insert on public.migration_items to authenticated;
create policy migration_items_owner on public.migration_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
