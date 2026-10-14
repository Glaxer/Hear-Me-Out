import type { ListVisibility, Placements, Tier } from './types';

/**
 * Unsaved rankings, kept in this browser so nothing is lost on refresh or while logging in.
 * One draft per template. Browser storage can be missing or blocked (private mode etc.),
 * so every access is wrapped and simply does nothing if it fails.
 */
export interface RankDraft {
	title: string;
	visibility: ListVisibility;
	tiers: Tier[];
	placements: Placements;
	savedAt: number;
}

const key = (templateId: string) => `hmo:rank-draft:${templateId}`;

export function loadRankDraft(templateId: string): RankDraft | null {
	try {
		const raw = localStorage.getItem(key(templateId));
		if (!raw) return null;
		const draft = JSON.parse(raw) as RankDraft;
		if (!Array.isArray(draft?.tiers) || typeof draft?.placements !== 'object' || draft.placements === null) return null;
		return draft;
	} catch {
		return null;
	}
}

export function saveRankDraft(templateId: string, draft: Omit<RankDraft, 'savedAt'>) {
	try {
		localStorage.setItem(key(templateId), JSON.stringify({ ...draft, savedAt: Date.now() }));
	} catch {
		// Storage full or blocked: the ranking still works, it just isn't kept
	}
}

export function clearRankDraft(templateId: string) {
	try {
		localStorage.removeItem(key(templateId));
	} catch {
		// Nothing to do
	}
}

/** True when at least one item has been placed in a tier. */
export const hasPlacements = (placements: Placements) => Object.values(placements).some((ids) => ids.length > 0);
