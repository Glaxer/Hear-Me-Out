/**
 * Blind ranking: the "blind" template format.
 *
 * Items are shown one at a time and you put each one in a free spot of your top 10 (or skip it)
 * without knowing what comes next. A placed item can't be moved. With more than 10 items, the
 * extra ones end up skipped: once the top 10 is full, everything left counts as skipped.
 *
 * Shapes:
 * - order: the item ids in the order they're shown. Shuffled per ranking, or the template's own
 *   order (the creator picks, with the same setting as the bracket order).
 * - slots: the ranking, #1 first; null = still empty. Saved in tier_lists.picks.
 */

export const BLIND_SLOTS = 10;
export const MIN_BLIND_ITEMS = 3;

export type BlindSlots = (string | null)[];

/** The size of the top list: 10, or fewer when the template has fewer items. */
export const slotCount = (itemCount: number) =>
	Math.min(BLIND_SLOTS, itemCount);

/** How many items will end up skipped in total. */
export const skipCount = (itemCount: number) =>
	Math.max(0, itemCount - BLIND_SLOTS);

/** The order items are shown in: the template's order, or shuffled. */
export function dealOrder(
	itemIds: string[],
	shuffled: boolean,
	random: () => number = Math.random
): string[] {
	const ids = [...itemIds];
	if (!shuffled) return ids;
	for (let i = ids.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[ids[i], ids[j]] = [ids[j], ids[i]];
	}
	return ids;
}

export interface BlindState {
	order: string[];
	slots: BlindSlots;
	skipped: string[];
}

export function startBlind(order: string[]): BlindState {
	return {
		order,
		slots: Array(slotCount(order.length)).fill(null),
		skipped: []
	};
}

/** Items that have been placed or skipped so far. */
export const handledCount = (s: BlindState) =>
	s.slots.filter(Boolean).length + s.skipped.length;

export const emptySlots = (s: BlindState) =>
	s.slots.filter((x) => x === null).length;

/** Done when every spot is filled (anything not shown yet is skipped). */
export const isDone = (s: BlindState) => emptySlots(s) === 0;

/** The item to place right now, or null when done. */
export const currentItem = (s: BlindState): string | null =>
	isDone(s) ? null : (s.order[handledCount(s)] ?? null);

/** Skips still allowed. 0 once the items left only just fill the empty spots. */
export const skipsLeft = (s: BlindState) =>
	s.order.length - handledCount(s) - emptySlots(s);

export function place(s: BlindState, slot: number): BlindState {
	const item = currentItem(s);
	if (!item || s.slots[slot] !== null) return s;
	const slots = [...s.slots];
	slots[slot] = item;
	return { ...s, slots };
}

export function skip(s: BlindState): BlindState {
	const item = currentItem(s);
	if (!item || skipsLeft(s) <= 0) return s;
	return { ...s, skipped: [...s.skipped, item] };
}

/** Everything not in the top list, in the order it was shown (unseen ones last). */
export const skippedItems = (order: string[], slots: BlindSlots) =>
	order.filter((id) => !slots.includes(id));

/**
 * Reads a draft back from browser storage; null if it doesn't fit these items any more
 * (the template was changed since).
 */
export function restoreBlind(
	raw: unknown,
	itemIds: string[]
): BlindState | null {
	if (!raw || typeof raw !== "object") return null;
	const { order, slots, skipped } = raw as Partial<BlindState>;
	const ids = new Set(itemIds);
	if (
		!Array.isArray(order) ||
		!Array.isArray(slots) ||
		!Array.isArray(skipped) ||
		order.length !== itemIds.length ||
		new Set(order).size !== order.length ||
		!order.every((id) => ids.has(id)) ||
		slots.length !== slotCount(itemIds.length)
	)
		return null;
	const state = { order, slots, skipped } as BlindState;
	// The placed and skipped items must be exactly the ones shown so far, in order
	const shown = order.slice(0, handledCount(state));
	const used = [...slots.filter((x): x is string => !!x), ...skipped];
	if (used.length !== shown.length || !shown.every((id) => used.includes(id)))
		return null;
	return state;
}

/**
 * Reads a finished ranking sent by the browser: every spot filled, with different items
 * from this template. Returns the spots (#1 first) or null.
 */
export function parseBlindSlots(
	raw: unknown,
	itemIds: string[]
): string[] | null {
	let value: unknown = raw;
	if (typeof raw === "string") {
		try {
			value = JSON.parse(raw);
		} catch {
			return null;
		}
	}
	const ids = new Set(itemIds);
	if (
		!Array.isArray(value) ||
		value.length !== slotCount(itemIds.length) ||
		!value.every((v) => typeof v === "string" && ids.has(v)) ||
		new Set(value).size !== value.length
	)
		return null;
	return value as string[];
}

export interface BlindVerdictRow {
	itemId: string;
	/** Average points: #1 of 10 gets 10, #10 gets 1, skipped gets 0. */
	score: number;
	/** Average spot when placed (1 = top), or null if never placed. */
	averageSpot: number | null;
	placed: number;
	skipped: number;
}

/**
 * The verdict: every item scored over all rankings (higher spots score more, skipped scores
 * nothing), best first. Also the most skipped items.
 */
export function blindVerdict(
	itemIds: string[],
	rankings: { picks: (string | null)[] | null }[]
): { rows: BlindVerdictRow[]; mostSkipped: BlindVerdictRow[] } {
	const size = slotCount(itemIds.length);
	const valid = rankings
		.map((r) => r.picks ?? [])
		.filter((p) => p.length === size);
	const rows = itemIds.map((itemId) => {
		let points = 0;
		let spotSum = 0;
		let placed = 0;
		for (const picks of valid) {
			const spot = picks.indexOf(itemId);
			if (spot === -1) continue;
			placed++;
			spotSum += spot + 1;
			points += size - spot;
		}
		return {
			itemId,
			score: valid.length ? points / valid.length : 0,
			averageSpot: placed ? spotSum / placed : null,
			placed,
			skipped: valid.length - placed
		};
	});
	rows.sort((a, b) => b.score - a.score);
	const mostSkipped = rows
		.filter((r) => r.skipped > 0)
		.sort((a, b) => b.skipped - a.skipped || a.score - b.score)
		.slice(0, 3);
	return { rows, mostSkipped };
}
