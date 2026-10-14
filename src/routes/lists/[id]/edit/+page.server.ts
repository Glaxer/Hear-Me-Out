import { error, fail, redirect } from '@sveltejs/kit';
import { readListForm } from '$lib/server/listForm';
import { isUuid, loadTemplate, loadTierList } from '$lib/server/data';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isUuid(params.id)) error(404, 'Tier list not found');
	const list = await loadTierList(locals.supabase, params.id);
	if (list.owner_id !== locals.user?.id) error(403, 'You can only edit your own tier lists');
	const { template, items } = await loadTemplate(locals.supabase, list.template_id);
	return { list, template, items };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const user = locals.user;
		if (!user) redirect(303, `/login?redirectTo=/lists/${params.id}/edit`);

		const list = await loadTierList(locals.supabase, params.id);
		if (list.owner_id !== user.id) error(403, 'You can only edit your own tier lists');

		const { items } = await loadTemplate(locals.supabase, list.template_id);
		const result = readListForm(await request.formData(), items);
		if (!result.ok) return fail(400, { error: result.error });

		const { error: err } = await locals.supabase
			.from('tier_lists')
			.update(result.value)
			.eq('id', params.id)
			.eq('owner_id', user.id);

		if (err) return fail(500, { error: 'Could not save your changes. Please try again.' });
		redirect(303, `/lists/${params.id}`);
	}
};
