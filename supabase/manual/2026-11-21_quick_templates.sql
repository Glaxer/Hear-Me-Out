-- Marks templates made by the quick tier list (/quick), so "My templates" can leave them out.
-- They're still normal unlisted templates otherwise (reachable from their ranking).
-- Existing templates all stay false: none of them were made by the quick tier list.
alter table public.templates
  add column if not exists is_quick boolean not null default false;
