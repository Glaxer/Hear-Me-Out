import { error, fail, redirect } from '@sveltejs/kit';
import { readListForm } from '$lib/server/listForm';
import { isUuid, loadTemplate } from '$lib/server/data';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isUuid(params.id)) error(404, 'Template not found');
	return loadTemplate(locals.supabase, params.id);
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const user = locals.user;
		if (!user) redirect(303, `/login?redirectTo=/templates/${params.id}/rank`);

		const { items } = await loadTemplate(locals.supabase, params.id);
		const result = readListForm(await request.formData(), items);
		if (!result.ok) return fail(400, { error: result.error });

		const { data, error: err } = await locals.supabase
			.from('tier_lists')
			.insert({ ...result.value, template_id: params.id, owner_id: user.id })
			.select('id')
			.single();

		if (err || !data) return fail(500, { error: 'Could not save your tier list. Please try again.' });
		redirect(303, `/lists/${data.id}?saved=1`);
	}
};
