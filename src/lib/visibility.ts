import type { ListVisibility, TemplateVisibility } from './types';

export const TEMPLATE_VISIBILITY: { value: TemplateVisibility; label: string; hint: string }[] = [
	{ value: 'public', label: 'Public', hint: 'Shown in browse, search and on the front page.' },
	{
		value: 'unlisted',
		label: 'Only people with the link',
		hint: 'Hidden from browse and search. Anyone you send the link to can view and rank it.'
	}
];

export const LIST_VISIBILITY: { value: ListVisibility; label: string }[] = [
	{ value: 'public', label: 'Public — shown on the template page' },
	{ value: 'unlisted', label: 'Only people with the link' },
	{ value: 'private', label: 'Only me' }
];

/** Short label for chips; null for the default (public). */
export function visibilityChip(v: TemplateVisibility | ListVisibility): string | null {
	if (v === 'unlisted') return 'Link only';
	if (v === 'private') return 'Private';
	return null;
}

export function parseTemplateVisibility(v: unknown): TemplateVisibility {
	return v === 'unlisted' ? 'unlisted' : 'public';
}

export function parseListVisibility(v: unknown): ListVisibility {
	return v === 'unlisted' || v === 'private' ? v : 'public';
}
