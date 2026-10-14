import { parsePlacements, parseTiers } from '$lib/tiers';
import type { ListVisibility, Placements, TemplateItem, Tier } from '$lib/types';
import { parseListVisibility } from '$lib/visibility';

export type ListFormResult =
	| { ok: true; value: { title: string; visibility: ListVisibility; tiers: Tier[]; placements: Placements } }
	| { ok: false; error: string };

/** Reads and validates the tier list form shared by the "rank" and "edit" pages. */
export function readListForm(form: FormData, items: TemplateItem[]): ListFormResult {
	const title = String(form.get('title') ?? '').trim();
	const visibility = parseListVisibility(form.get('visibility'));
	const tiers = parseTiers(form.get('tiers'));

	if (!title || title.length > 100) return { ok: false, error: 'Give your tier list a title (max 100 characters).' };
	if (!tiers) return { ok: false, error: 'Every tier needs a name.' };

	const placements = parsePlacements(form.get('placements'), tiers, new Set(items.map((i) => i.id)));
	if (!placements) return { ok: false, error: 'Something went wrong reading your ranking. Please try again.' };

	return { ok: true, value: { title, visibility, tiers, placements } };
}
