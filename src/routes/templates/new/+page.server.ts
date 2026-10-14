import { fail, redirect } from '@sveltejs/kit';
import { CATEGORIES, parseTiers } from '$lib/tiers';
import type { Actions } from './$types';

const MAX_ITEMS = 100;

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) redirect(303, '/login?redirectTo=/templates/new');

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const category = String(form.get('category') ?? 'Other');
		const tiers = parseTiers(form.get('tiers'));

		const labels = form.getAll('item_label').map((v) => String(v).trim());
		const paths = form.getAll('item_image').map((v) => String(v));

		if (!title || title.length > 100) return fail(400, { error: 'Give your template a title (max 100 characters).' });
		if (description.length > 500) return fail(400, { error: 'Description is too long (max 500 characters).' });
		if (!(CATEGORIES as readonly string[]).includes(category)) return fail(400, { error: 'Pick a category.' });
		if (!tiers) return fail(400, { error: 'Every tier needs a name and a colour.' });
		if (labels.length < 2) return fail(400, { error: 'Add at least two items to rank.' });
		if (labels.length > MAX_ITEMS) return fail(400, { error: `Templates can have at most ${MAX_ITEMS} items.` });
		if (labels.some((l) => !l || l.length > 80)) return fail(400, { error: 'Every item needs a name (max 80 characters).' });

		// Images are uploaded straight from the browser into the user's own folder; only accept those paths.
		const ownPrefix = `${user.id}/`;
		const items = labels.map((label, position) => {
			const path = paths[position] ?? '';
			return {
				label,
				position,
				image_path: path.startsWith(ownPrefix) && !path.includes('..') ? path : null
			};
		});

		const { data: template, error } = await locals.supabase
			.from('templates')
			.insert({ owner_id: user.id, title, description, category, default_tiers: tiers })
			.select('id')
			.single();

		if (error || !template) return fail(500, { error: 'Could not save the template. Please try again.' });

		const { error: itemsError } = await locals.supabase
			.from('template_items')
			.insert(items.map((i) => ({ ...i, template_id: template.id })));

		if (itemsError) {
			await locals.supabase.from('templates').delete().eq('id', template.id);
			return fail(500, { error: 'Could not save the items. Please try again.' });
		}

		redirect(303, `/templates/${template.id}/rank`);
	}
};
