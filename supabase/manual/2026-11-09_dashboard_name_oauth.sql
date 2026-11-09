-- =====================================================================
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> Run
-- Makes the Authentication -> Users "Display name" show the site username for
-- Google/Discord accounts too (new databases get this from schema.sql).
-- Only changes the name/full_name keys; never deletes anything. Safe to run again.
-- =====================================================================

-- The dashboard prefers the "name" field that Google/Discord write (and rewrite on every login)
-- over display_name. This keeps name and full_name equal to display_name (the site username)
-- for everyone who has one, including right after a Google/Discord login. Their real
-- Google/Discord name is still kept in auth.identities (identity_data).
-- Accounts without a display_name yet (still picking a username on /welcome) are untouched,
-- so /welcome can still suggest a username from their Google/Discord name.
create or replace function public.keep_dashboard_name()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  dn text := new.raw_user_meta_data ->> 'display_name';
begin
  if dn is not null and (
    new.raw_user_meta_data ->> 'name' is distinct from dn
    or new.raw_user_meta_data ->> 'full_name' is distinct from dn
  ) then
    new.raw_user_meta_data :=
      new.raw_user_meta_data || jsonb_build_object('name', dn, 'full_name', dn);
  end if;
  return new;
end;
$$;

drop trigger if exists keep_dashboard_name on auth.users;
create trigger keep_dashboard_name
  before insert or update of raw_user_meta_data on auth.users
  for each row execute function public.keep_dashboard_name();

-- Existing users: touching the metadata lets the trigger above copy the username across
update auth.users
set raw_user_meta_data = raw_user_meta_data
where raw_user_meta_data ->> 'display_name' is not null
  and (
    raw_user_meta_data ->> 'name' is distinct from raw_user_meta_data ->> 'display_name'
    or raw_user_meta_data ->> 'full_name' is distinct from raw_user_meta_data ->> 'display_name'
  );
