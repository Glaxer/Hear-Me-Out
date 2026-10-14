import type { Placements, Tier } from './types';

export const CATEGORIES = [
	'Food & Drink',
	'Games',
	'Movies & TV',
	'Music',
	'Sports',
	'Work & Office',
	'Places',
	'Other'
] as const;

/** Classic tier colours, top to bottom. */
export const TIER_COLORS = [
	'#ff7f7f',
	'#ffbf7f',
	'#ffdf7f',
	'#ffff7f',
	'#bfff7f',
	'#7fff7f',
	'#7fffff',
	'#7fbfff',
	'#bf7fbf'
];

export function newTierId(): string {
	return crypto.randomUUID().slice(0, 8);
}

export function defaultTiers(): Tier[] {
	return ['S', 'A', 'B', 'C', 'D'].map((label, i) => ({
		id: label.toLowerCase(),
		label,
		color: TIER_COLORS[i]
	}));
}

/**
 * Parses and validates tiers coming from a form field.
 * Returns null if the shape is wrong.
 */
export function parseTiers(raw: unknown): Tier[] | null {
	if (typeof raw !== 'string') return null;
	try {
		const value = JSON.parse(raw);
		if (!Array.isArray(value) || value.length < 1 || value.length > 15) return null;
		const tiers: Tier[] = [];
		const seen = new Set<string>();
		for (const t of value) {
			if (
				typeof t?.id !== 'string' ||
				typeof t?.label !== 'string' ||
				typeof t?.color !== 'string' ||
				!/^#[0-9a-fA-F]{6}$/.test(t.color) ||
				t.label.trim().length === 0 ||
				t.label.length > 40 ||
				seen.has(t.id)
			) {
				return null;
			}
			seen.add(t.id);
			tiers.push({ id: t.id.slice(0, 20), label: t.label.trim(), color: t.color });
		}
		return tiers;
	} catch {
		return null;
	}
}

/**
 * Parses placements and drops anything that doesn't match the given tiers and items,
 * so a tampered form can't store junk ids.
 */
export function parsePlacements(raw: unknown, tiers: Tier[], itemIds: Set<string>): Placements | null {
	if (typeof raw !== 'string') return null;
	try {
		const value = JSON.parse(raw);
		if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
		const used = new Set<string>();
		const result: Placements = {};
		for (const tier of tiers) {
			const ids = Array.isArray(value[tier.id]) ? value[tier.id] : [];
			result[tier.id] = ids.filter((id: unknown): id is string => {
				if (typeof id !== 'string' || !itemIds.has(id) || used.has(id)) return false;
				used.add(id);
				return true;
			});
		}
		return result;
	} catch {
		return null;
	}
}

/** Item ids that are not placed in any tier, in template order. */
export function unrankedIds(allIds: string[], placements: Placements): string[] {
	const placed = new Set(Object.values(placements).flat());
	return allIds.filter((id) => !placed.has(id));
}

/** Picks black or white text for a tier colour. */
export function textOn(hex: string): string {
	const n = parseInt(hex.slice(1), 16);
	const r = (n >> 16) & 255;
	const g = (n >> 8) & 255;
	const b = n & 255;
	return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111' : '#fff';
}
