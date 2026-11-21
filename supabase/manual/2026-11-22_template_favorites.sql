-- Favorite templates: logged-in users can star templates to find them again
-- (the "Favorites" filter on /templates and the section on /me).
-- Only you can see, add or remove your own favorites.
create table if not exists public.template_favorites (
  -- auth.users, not profiles: a second templates<->profiles link through this table would make
  -- every "profiles(username)" embed on templates ambiguous in the API (HTTP 300)
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid not null references public.templates (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, template_id)
);

create index if not exists template_favorites_template_idx
  on public.template_favorites (template_id);

alter table public.template_favorites enable row level security;

create policy "users see own favorites" on public.template_favorites
  for select using ((select auth.uid()) = user_id);
create policy "users add own favorites" on public.template_favorites
  for insert with check ((select auth.uid()) = user_id);
create policy "users remove own favorites" on public.template_favorites
  for delete using ((select auth.uid()) = user_id);
