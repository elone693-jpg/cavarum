-- Droit à l'effacement (RGPD art. 17) et exigence des stores : suppression du compte depuis l'app.
-- Toutes les tables utilisateur référencent auth.users avec « on delete cascade » ;
-- les rhums créés restent au catalogue partagé, sans auteur (« on delete set null »).
-- Les fichiers du stockage sont supprimés par le client via l'API Storage avant cet appel.

create function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Utilisateur non authentifié' using errcode = '42501';
  end if;
  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
