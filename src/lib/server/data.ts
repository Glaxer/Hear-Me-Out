import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Template, TemplateItem, TierList } from '$lib/types';

export const TEMPLATE_CARD_SELECT =
	'id, owner_id, title, description, category, default_tiers, list_count, created_at, profiles(username), template_items(label, image_path, position)';

export type TemplateCardRow = Template & {
	template_items: { label: string; image_path: string | null; position: number }[];
};

/** Loads a template and its items, or throws a 404. */
export async function loadTemplate(
	supabase: SupabaseClient,
	id: string
): Promise<{ template: Template; items: TemplateItem[] }> {
	const { data: template } = await supabase
		.from('templates')
		.select('*, profiles(username)')
		.eq('id', id)
		.maybeSingle();

	if (!template) error(404, 'Template not found');

	const { data: items } = await supabase
		.from('template_items')
		.select('id, label, image_path, position')
		.eq('template_id', id)
		.order('position');

	return { template: template as Template, items: (items ?? []) as TemplateItem[] };
}

/** Loads a tier list (RLS hides private lists from other users), or throws a 404. */
export async function loadTierList(supabase: SupabaseClient, id: string): Promise<TierList> {
	const { data } = await supabase
		.from('tier_lists')
		.select('*, profiles(username), templates(title)')
		.eq('id', id)
		.maybeSingle();

	if (!data) error(404, 'Tier list not found');
	return data as TierList;
}

/** Checks that a string looks like a UUID before it hits the database. */
export function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
