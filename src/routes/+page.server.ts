import { TEMPLATE_CARD_SELECT, type TemplateCardRow } from '$lib/server/data';
import type { TierList } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [popular, recent] = await Promise.all([
		locals.supabase
			.from('templates')
			.select(TEMPLATE_CARD_SELECT)
			.order('list_count', { ascending: false })
			.order('created_at', { ascending: false })
			.order('position', { referencedTable: 'template_items' })
			.limit(4, { referencedTable: 'template_items' })
			.limit(8),
		locals.supabase
			.from('tier_lists')
			.select('id, title, updated_at, profiles(username), templates(title)')
			.eq('is_public', true)
			.order('updated_at', { ascending: false })
			.limit(8)
	]);

	return {
		popular: (popular.data ?? []) as unknown as TemplateCardRow[],
		recentLists: (recent.data ?? []) as unknown as Pick<
			TierList,
			'id' | 'title' | 'updated_at' | 'profiles' | 'templates'
		>[]
	};
};
