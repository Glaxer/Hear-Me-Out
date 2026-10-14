-- =====================================================================
-- Tier list platform: database schema
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- Profiles: one row per auth user, holds the public username
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 30),
  -- true for Google/Discord sign-ups until they pick a username on /welcome
  needs_username boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
-- The username is passed in the sign-up call as user metadata. Google/Discord sign-ups
-- don't have one, so they get a placeholder and pick a real one on /welcome.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, needs_username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    (new.raw_user_meta_data ->> 'username') is null
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Templates: the thing people rank (e.g. "Cafeteria Food")
-- default_tiers: [{ "id": "s", "label": "S", "color": "#ff7f7f" }, ...]
-- list_count: number of public tier lists, kept up to date by a trigger
-- ---------------------------------------------------------------------
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  category text not null default 'Other',
  default_tiers jsonb not null,
  -- public: listed in browse/search; unlisted: only reachable with the link
  visibility text not null default 'public' check (visibility in ('public', 'unlisted')),
  list_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index templates_created_at_idx on public.templates (created_at desc);
create index templates_list_count_idx on public.templates (list_count desc);
create index templates_category_idx on public.templates (category);
create index templates_owner_idx on public.templates (owner_id);
create index templates_visibility_idx on public.templates (visibility, list_count desc);

-- ---------------------------------------------------------------------
-- Template items: the things inside a template (a dish, a game, ...)
-- image_path is a path inside the "item-images" storage bucket
-- ---------------------------------------------------------------------
create table public.template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  image_path text,          -- 256px thumbnail
  full_image_path text,     -- large version for the image viewer
  position integer not null default 0
);

create index template_items_template_idx on public.template_items (template_id, position);

-- ---------------------------------------------------------------------
-- Tier lists: one person's ranking of a template
-- tiers:      [{ "id": "s", "label": "S", "color": "#ff7f7f" }, ...]
-- placements: { "<tierId>": ["<itemId>", "<itemId>"], ... }  (ordered)
-- Items not in any tier are simply unranked.
-- ---------------------------------------------------------------------
create table public.tier_lists (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  tiers jsonb not null,
  placements jsonb not null default '{}'::jsonb,
  -- public: shown on the template page; unlisted: only with the link; private: owner only
  visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  -- derived from visibility by a trigger: "may people other than the owner open it?"
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tier_lists_template_idx on public.tier_lists (template_id, updated_at desc);
create index tier_lists_owner_idx on public.tier_lists (owner_id, updated_at desc);

-- Keep updated_at fresh
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tier_lists_touch
  before update on public.tier_lists
  for each row execute function public.touch_updated_at();

-- is_public follows visibility, so the read policy below stays simple
create function public.sync_tier_list_is_public()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.is_public := new.visibility <> 'private';
  return new;
end;
$$;

create trigger tier_lists_sync_is_public
  before insert or update of visibility on public.tier_lists
  for each row execute function public.sync_tier_list_is_public();

-- Keep templates.list_count in sync (counts public lists only), used for "popular" sorting
create function public.refresh_template_list_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  t_id uuid;
begin
  t_id := coalesce(new.template_id, old.template_id);
  update public.templates
     set list_count = (
       select count(*) from public.tier_lists
        where template_id = t_id and visibility = 'public'
     )
   where id = t_id;
  return null;
end;
$$;

create trigger tier_lists_count
  after insert or update of is_public or delete on public.tier_lists
  for each row execute function public.refresh_template_list_count();

create trigger tier_lists_count_visibility
  after update of visibility on public.tier_lists
  for each row execute function public.refresh_template_list_count();

-- Trigger-only functions must not be callable through the API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_template_list_count() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.sync_tier_list_is_public() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- Templates and items are readable by everyone.
-- Tier lists: public ones are readable by everyone, private ones only by their owner.
-- Only owners can create, change or delete their own rows.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.template_items enable row level security;
alter table public.tier_lists enable row level security;

create policy "profiles are public" on public.profiles
  for select using (true);
create policy "users update own profile" on public.profiles
  for update using ((select auth.uid()) = id);

create policy "templates are public" on public.templates
  for select using (true);
create policy "users create own templates" on public.templates
  for insert with check ((select auth.uid()) = owner_id);
create policy "users update own templates" on public.templates
  for update using ((select auth.uid()) = owner_id);
create policy "users delete own templates" on public.templates
  for delete using ((select auth.uid()) = owner_id);

create policy "template items are public" on public.template_items
  for select using (true);
-- One policy per action, so reading items only checks the simple "public" policy above
create policy "template owners add items" on public.template_items
  for insert with check (
    exists (select 1 from public.templates t
             where t.id = template_id and t.owner_id = (select auth.uid()))
  );
create policy "template owners update items" on public.template_items
  for update using (
    exists (select 1 from public.templates t
             where t.id = template_id and t.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.templates t
             where t.id = template_id and t.owner_id = (select auth.uid()))
  );
create policy "template owners delete items" on public.template_items
  for delete using (
    exists (select 1 from public.templates t
             where t.id = template_id and t.owner_id = (select auth.uid()))
  );

-- Note: unlisted/private lists are still openable by direct link for the owner only.
create policy "public lists or own lists" on public.tier_lists
  for select using (is_public or (select auth.uid()) = owner_id);
create policy "users create own lists" on public.tier_lists
  for insert with check ((select auth.uid()) = owner_id);
create policy "users update own lists" on public.tier_lists
  for update using ((select auth.uid()) = owner_id);
create policy "users delete own lists" on public.tier_lists
  for delete using ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------
-- Storage bucket for item images (public read, users write into their own folder)
-- Files are stored as "<user id>/<random>.<ext>"
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images', 'item-images', true, 2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "item images are public" on storage.objects
  for select using (bucket_id = 'item-images');
create policy "users upload to own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "users delete own images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------
-- Account deletion: lets a signed-in user delete their own account (and only their own).
-- Cascades to profiles -> templates -> items and tier lists.
-- The app removes the user's uploaded images through the Storage API.
-- ---------------------------------------------------------------------
create function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;