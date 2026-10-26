-- Cavarum v2 — schéma du jalon 1 (socle et migration).
-- Montants en numeric(12,2) : aucun calcul monétaire en virgule flottante.

create type public.cellar_type as enum ('personal', 'professional');
create type public.bottle_status as enum (
  'ordered', 'in_transit', 'in_cellar', 'open', 'empty', 'sold', 'gifted', 'exchanged', 'lost'
);
create type public.rum_style as enum ('agricole', 'traditionnel', 'melasse', 'pure_cane');
create type public.rum_type as enum ('brut_de_fut', 'single_cask', 'blend', 'cask_strength', 'standard');
create type public.valuation_kind as enum ('manual', 'legacy');
create type public.migration_item_status as enum ('imported', 'skipped', 'to_review');

create function public.set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profils -------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  adult_confirmed_at timestamptz,
  residence_territory text,
  display_currency char(3) not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, adult_confirmed_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    nullif(new.raw_user_meta_data ->> 'adult_confirmed_at', '')::timestamptz
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin')),
  primary key (user_id, role)
);

-- Caves et emplacements -----------------------------------------------------

create table public.cellars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  type public.cellar_type not null default 'personal',
  location text check (char_length(location) <= 200),
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cellars_user_id_idx on public.cellars (user_id);
create trigger cellars_updated_at before update on public.cellars
  for each row execute function public.set_updated_at();

create table public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cellar_id uuid not null references public.cellars (id) on delete cascade,
  parent_id uuid references public.storage_locations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index storage_locations_cellar_id_idx on public.storage_locations (cellar_id);

-- Catalogue partagé ---------------------------------------------------------

create table public.rums (
  id uuid primary key default gen_random_uuid(),
  distillery text not null check (char_length(distillery) between 1 and 200),
  cuvee_name text not null check (char_length(cuvee_name) between 1 and 200),
  brand text check (char_length(brand) <= 200),
  bottler text check (char_length(bottler) <= 200),
  country text not null check (char_length(country) between 1 and 100),
  region text check (char_length(region) <= 100),
  style public.rum_style,
  type public.rum_type,
  vintage integer check (vintage between 1800 and 2100),
  age integer check (age between 0 and 200),
  abv numeric(4, 1) check (abv between 0 and 100),
  volume_ml integer not null default 700 check (volume_ml between 10 and 10000),
  limited_edition boolean not null default false,
  limited_count integer check (limited_count > 0),
  ean text check (ean ~ '^[0-9]{8,14}$'),
  thumbnail_url text,
  created_by uuid references auth.users (id) on delete set null,
  legacy_id text unique,
  created_at timestamptz not null default now()
);
create index rums_distillery_idx on public.rums (lower(distillery));

-- Exemplaires possédés ------------------------------------------------------

create table public.bottles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cellar_id uuid not null references public.cellars (id) on delete cascade,
  rum_id uuid not null references public.rums (id) on delete restrict,
  location_id uuid references public.storage_locations (id) on delete set null,
  location_text text check (char_length(location_text) <= 200),
  status public.bottle_status not null default 'in_cellar',
  quantity integer not null default 1 check (quantity between 1 and 1000),
  cask_number text check (char_length(cask_number) <= 50),
  batch text check (char_length(batch) <= 50),
  bottle_number text check (char_length(bottle_number) <= 50),
  label_condition text check (char_length(label_condition) <= 200),
  fill_level text check (char_length(fill_level) <= 50),
  has_box boolean,
  notes text check (char_length(notes) <= 5000),
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bottles_user_id_idx on public.bottles (user_id);
create index bottles_cellar_id_idx on public.bottles (cellar_id);
create index bottles_rum_id_idx on public.bottles (rum_id);
create trigger bottles_updated_at before update on public.bottles
  for each row execute function public.set_updated_at();

create table public.bottle_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bottle_id uuid not null references public.bottles (id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  legacy_id text unique,
  created_at timestamptz not null default now()
);
create index bottle_photos_bottle_id_idx on public.bottle_photos (bottle_id);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bottle_id uuid not null references public.bottles (id) on delete cascade,
  purchased_on date,
  seller text check (char_length(seller) <= 200),
  unit_price numeric(12, 2) check (unit_price >= 0),
  currency char(3) not null default 'EUR',
  shipping_cost numeric(12, 2) check (shipping_cost >= 0),
  invoice_path text,
  legacy_id text unique,
  created_at timestamptz not null default now()
);
create index purchases_bottle_id_idx on public.purchases (bottle_id);

create table public.valuations_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bottle_id uuid not null references public.bottles (id) on delete cascade,
  value numeric(12, 2) not null check (value >= 0),
  currency char(3) not null default 'EUR',
  kind public.valuation_kind not null,
  source text,
  valued_at timestamptz not null default now(),
  legacy_id text unique
);
create index valuations_history_bottle_id_idx on public.valuations_history (bottle_id, valued_at desc);

-- Usage IA (écrit uniquement par les fonctions serveur) ---------------------

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  function_name text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  status text not null,
  created_at timestamptz not null default now()
);
create index ai_usage_user_id_idx on public.ai_usage (user_id, created_at desc);

-- Rapport de migration v1 → v2 ----------------------------------------------

create table public.migration_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb
);

create table public.migration_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.migration_runs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  entity text not null,
  legacy_id text not null,
  status public.migration_item_status not null,
  message text,
  new_id uuid
);
create index migration_items_run_id_idx on public.migration_items (run_id);
