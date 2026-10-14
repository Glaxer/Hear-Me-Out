import { error, fail, redirect } from '@sveltejs/kit';
import { isUuid, loadTemplate, loadTierList } from '$lib/server/data';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isUuid(params.id)) error(404, 'Tier list not found');
	const list = await loadTierList(locals.supabase, params.id);
	const { template, items } = await loadTemplate(locals.supabase, list.template_id);
	return { list, template, items };
};

export const actions: Actions = {
	delete: async ({ locals, params }) => {
		if (!locals.user) redirect(303, '/login');
		const list = await loadTierList(locals.supabase, params.id);
		const { error: err } = await locals.supabase
			.from('tier_lists')
			.delete()
			.eq('id', params.id)
			.eq('owner_id', locals.user.id);
		if (err) return fail(500, { error: 'Could not delete the tier list.' });
		redirect(303, `/templates/${list.template_id}?toast=list-deleted`);
	}
};
