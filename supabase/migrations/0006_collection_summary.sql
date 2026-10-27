-- Synthèse de la collection de l'utilisateur pour l'en-tête de l'app (numeric exact, droits de l'appelant).

create view public.collection_summary
with (security_invoker = true)
as
select
  count(*)::integer as cellar_count,
  coalesce(sum(bottle_units), 0)::integer as bottle_units,
  coalesce(sum(purchase_total), 0)::numeric(12, 2) as purchase_total
from public.cellar_summaries;

grant select on public.collection_summary to authenticated;
