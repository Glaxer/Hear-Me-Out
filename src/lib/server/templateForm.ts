import { MAX_ITEMS } from '$lib/items';
import { CATEGORIES, parseTiers } from '$lib/tiers';
import type { Tier } from '$lib/types';

export interface ParsedItem {
	/** Existing item id, or null for a new item. */
	id: string | null;
	label: string;
	image_path: string | null;
	position: number;
}

export interface ParsedTemplate {
	title: string;
	description: string;
	category: string;
	tiers: Tier[];
	items: ParsedItem[];
}

/** Reads and validates the template form shared by the "new" and "edit" pages. */
export function readTemplateForm(
	form: FormData,
	userId: string
): { ok: true; value: ParsedTemplate } | { ok: false; error: string } {
	const title = String(form.get('title') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();
	const category = String(form.get('category') ?? 'Other');
	const tiers = parseTiers(form.get('tiers'));

	const ids = form.getAll('item_id').map((v) => String(v));
	const labels = form.getAll('item_label').map((v) => String(v).trim());
	const paths = form.getAll('item_image').map((v) => String(v));

	if (!title || title.length > 100) return { ok: false, error: 'Give your template a title (max 100 characters).' };
	if (description.length > 500) return { ok: false, error: 'Description is too long (max 500 characters).' };
	if (!(CATEGORIES as readonly string[]).includes(category)) return { ok: false, error: 'Pick a category.' };
	if (!tiers) return { ok: false, error: 'Every tier needs a name and a colour.' };
	if (labels.length < 2) return { ok: false, error: 'Add at least two items to rank.' };
	if (labels.length > MAX_ITEMS) return { ok: false, error: `Templates can have at most ${MAX_ITEMS} items.` };
	if (labels.some((l) => !l || l.length > 80)) return { ok: false, error: 'Every item needs a name (max 80 characters).' };

	// Images are uploaded straight from the browser into the user's own folder; only accept those paths.
	const ownPrefix = `${userId}/`;
	const items = labels.map((label, position) => {
		const path = paths[position] ?? '';
		const id = ids[position] ?? '';
		return {
			id: /^[0-9a-f-]{36}$/i.test(id) ? id : null,
			label,
			position,
			image_path: path.startsWith(ownPrefix) && !path.includes('..') ? path : null
		};
	});

	return { ok: true, value: { title, description, category, tiers, items } };
}
