-- Blind ranking: a third template format. Rankings are stored in tier_lists.picks (the top
-- list, #1 first) and the order setting reuses templates.bracket_order, so only the allowed
-- formats change.
alter table public.templates
  drop constraint if exists templates_format_check,
  add constraint templates_format_check
    check (format in ('tier_list', 'bracket', 'blind'));
