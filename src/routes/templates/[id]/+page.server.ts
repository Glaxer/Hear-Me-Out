import { error, fail, redirect } from '@sveltejs/kit';
import { IMAGE_BUCKET } from '$lib/images';
import { isUuid, loadTemplate } from '$lib/server/data';
import type { TierList } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isUuid(params.id)) error(404, 'Template not found');
	const { template, items } = await loadTemplate(locals.supabase, params.id);

	// Public lists for this template, plus the viewer's own private ones (RLS handles visibility)
	let query = locals.supabase
		.from('tier_lists')
		.select('id, owner_id, title, tiers, placements, visibility, updated_at, profiles(username)')
		.eq('template_id', params.id);
	// Others' link-only lists stay off this page; your own lists all show
	query = locals.user
		? query.or(`visibility.eq.public,owner_id.eq.${locals.user.id}`)
		: query.eq('visibility', 'public');
	const { data: lists } = await query.order('updated_at', { ascending: false }).limit(60);

	return {
		template,
		items,
		lists: (lists ?? []) as unknown as TierList[]
	};
};

export const actions: Actions = {
	delete: async ({ locals, params }) => {
		if (!locals.user) redirect(303, '/login');
		const { items } = await loadTemplate(locals.supabase, params.id);
		const { error: err } = await locals.supabase
			.from('templates')
			.delete()
			.eq('id', params.id)
			.eq('owner_id', locals.user.id);
		if (err) return fail(500, { error: 'Could not delete the template.' });

		// Best effort: remove the template's images from storage
		const ownPrefix = `${locals.user.id}/`;
		const paths = items
			.flatMap((i) => [i.image_path, i.full_image_path])
			.filter((p): p is string => !!p && p.startsWith(ownPrefix));
		if (paths.length) await locals.supabase.storage.from(IMAGE_BUCKET).remove(paths);

		redirect(303, '/me?toast=template-deleted');
	}
};
