-- =====================================================================
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> Run
-- Adds the tournament bracket format (new databases get this from schema.sql).
-- Only adds columns with defaults: existing templates stay tier lists and nothing
-- else changes. Safe to run more than once.
-- =====================================================================

alter table public.templates
  add column if not exists format text not null default 'tier_list'
    check (format in ('tier_list', 'bracket')),
  add column if not exists bracket_order text not null default 'shuffled'
    check (bracket_order in ('shuffled', 'ordered')),
  add column if not exists bracket_seed jsonb;

alter table public.tier_lists
  add column if not exists picks jsonb;
