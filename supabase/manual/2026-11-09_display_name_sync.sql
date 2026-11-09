-- =====================================================================
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> Run
-- Adds the display-name sync to an existing database (new databases get it
-- from schema.sql) and copies every current username across.
-- Safe to run more than once.
-- =====================================================================

create or replace function public.sync_display_name()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update auth.users
  set raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('display_name', new.username)
  where id = new.id
    and raw_user_meta_data ->> 'display_name' is distinct from new.username;
  return new;
end;
$$;

drop trigger if exists on_profile_username_set on public.profiles;
create trigger on_profile_username_set
  after insert or update of username, needs_username on public.profiles
  for each row
  when (not new.needs_username)
  execute function public.sync_display_name();

-- Existing users: copy their current username across
update auth.users u
set raw_user_meta_data =
  coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('display_name', p.username)
from public.profiles p
where p.id = u.id
  and not p.needs_username
  and u.raw_user_meta_data ->> 'display_name' is distinct from p.username;
