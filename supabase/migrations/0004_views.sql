-- Totaux par cave calculés en base (numeric exact), avec les droits de l'appelant (RLS).
-- Seules les bouteilles encore possédées comptent : commandées, en transit, en cave ou ouvertes.

create view public.cellar_summaries
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.type,
  c.location,
  c.created_at,
  coalesce(sum(b.quantity) filter (where b.id is not null), 0)::integer as bottle_units,
  coalesce(sum(p.unit_price * b.quantity), 0)::numeric(12, 2) as purchase_total
from public.cellars c
left join public.bottles b
  on b.cellar_id = c.id
  and b.status in ('ordered', 'in_transit', 'in_cellar', 'open')
left join public.purchases p on p.bottle_id = b.id
group by c.id;

grant select on public.cellar_summaries to authenticated;
