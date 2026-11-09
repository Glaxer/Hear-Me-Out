/**
 * Tournament brackets: the "bracket" template format.
 *
 * A bracket has a power-of-two number of slots (2, 4, 8 … 64). The first round is fixed when the
 * template is saved (the "seed"), so everyone fills out the same bracket and results can be
 * compared. With fewer items than slots, some items get a bye: a first-round match without an
 * opponent, which they win automatically.
 *
 * Shapes:
 * - seed: first-round slots, two per match: [a, b, c, null, …]; null is a bye.
 * - picks: the winner of every match, round by round: round 1's matches, then round 2's, …,
 *   ending with the final. Length = slots − 1; null = not picked yet.
 */

export const MAX_BRACKET_ITEMS = 64;
export const MIN_BRACKET_ITEMS = 2;

export type BracketOrder = "shuffled" | "ordered";
export type Slot = string | null;
export type Picks = (string | null)[];

export interface Match {
	/** Position in the picks array. */
	index: number;
	round: number;
	/** Position within its round. */
	number: number;
	/** The two items playing; null while the earlier match isn't decided (or a bye). */
	a: string | null;
	b: string | null;
	/** True for a first-round match with only one item: it goes through automatically. */
	bye: boolean;
	winner: string | null;
}

/** Smallest power of two that fits `count` items (at least 2). */
export function bracketSize(count: number): number {
	let size = 2;
	while (size < count) size *= 2;
	return size;
}

export const roundCount = (size: number) => Math.log2(size);

/** Number of matches in a round (round 0 is the first round). */
export const matchesInRound = (size: number, round: number) =>
	size / 2 ** (round + 1);

/** Where a round's matches start in the picks array. */
function roundOffset(size: number, round: number): number {
	let offset = 0;
	for (let r = 0; r < round; r++) offset += matchesInRound(size, r);
	return offset;
}

/** Whether some items skip the first round (fewer items than slots). */
export const hasByes = (seed: Slot[]) => seed.some((s) => s === null);

/**
 * The round's name as shown to people. With byes, the first round only has the matches that
 * are actually played, so it's a "Play-in round" in front of the main bracket.
 */
export function roundLabel(seed: Slot[], round: number): string {
	if (round === 0 && hasByes(seed)) return "Play-in round";
	return roundName(seed.length, round);
}

/** "Final", "Semi-finals", "Quarter-finals", "Round of 16", … */
export function roundName(size: number, round: number): string {
	const matches = matchesInRound(size, round);
	if (matches === 1) return "Final";
	if (matches === 2) return "Semi-finals";
	if (matches === 4) return "Quarter-finals";
	return `Round of ${matches * 2}`;
}

function shuffle<T>(list: T[], random: () => number): T[] {
	for (let i = list.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[list[i], list[j]] = [list[j], list[i]];
	}
	return list;
}

/**
 * Builds the first round. Shuffled: random order (and so random byes). Ordered: the items'
 * own order, and the last-added items get the byes. Bye matches are spread evenly through
 * the bracket instead of bunching up in one half.
 */
export function buildSeed(
	itemIds: string[],
	order: BracketOrder,
	random: () => number = Math.random
): Slot[] {
	const ids = order === "shuffled" ? shuffle([...itemIds], random) : itemIds;
	const size = bracketSize(ids.length);
	const matches = size / 2;
	const byes = size - ids.length;
	const playing = ids.slice(0, ids.length - byes);
	const byeItems = ids.slice(ids.length - byes);
	const byeAt = new Set(
		Array.from({ length: byes }, (_, k) =>
			Math.floor(((k + 0.5) * matches) / byes)
		)
	);

	const slots: Slot[] = [];
	let p = 0;
	let b = 0;
	for (let m = 0; m < matches; m++) {
		if (byeAt.has(m)) slots.push(byeItems[b++], null);
		else slots.push(playing[p++], playing[p++]);
	}
	return slots;
}

/** Whether a stored seed still fits the template's items (same items, valid shape). */
export function seedMatchesItems(seed: unknown, itemIds: string[]): boolean {
	if (!Array.isArray(seed)) return false;
	if (seed.length !== bracketSize(itemIds.length)) return false;
	const inSeed = seed.filter((s): s is string => typeof s === "string");
	const ids = new Set(itemIds);
	return (
		inSeed.length === itemIds.length &&
		new Set(inSeed).size === inSeed.length &&
		inSeed.every((id) => ids.has(id))
	);
}

/** An empty picks array, with byes already decided. */
export function emptyPicks(seed: Slot[]): Picks {
	const picks: Picks = Array(seed.length - 1).fill(null);
	for (let m = 0; m < seed.length / 2; m++) {
		const [a, b] = [seed[2 * m], seed[2 * m + 1]];
		if (!a || !b) picks[m] = a ?? b;
	}
	return picks;
}

/** Every match, round by round, with who's playing and who won (from the picks). */
export function matches(seed: Slot[], picks: Picks): Match[] {
	const size = seed.length;
	const all: Match[] = [];
	for (let round = 0; round < roundCount(size); round++) {
		const offset = roundOffset(size, round);
		const prev = round > 0 ? roundOffset(size, round - 1) : 0;
		for (let n = 0; n < matchesInRound(size, round); n++) {
			const a = round === 0 ? seed[2 * n] : (picks[prev + 2 * n] ?? null);
			const b =
				round === 0 ? seed[2 * n + 1] : (picks[prev + 2 * n + 1] ?? null);
			const bye = round === 0 && (!a || !b);
			const winner = picks[offset + n] ?? null;
			all.push({
				index: offset + n,
				round,
				number: n,
				a,
				b,
				bye,
				winner: winner && (winner === a || winner === b) ? winner : null
			});
		}
	}
	return all;
}

/**
 * Picks `winner` for a match. Later matches that depended on the old winner are cleared,
 * since that item may no longer be playing in them.
 */
export function pick(
	seed: Slot[],
	picks: Picks,
	index: number,
	winner: string
): Picks {
	const next = [...picks];
	const old = next[index];
	next[index] = winner;
	if (old && old !== winner) {
		// Clear the old winner from every later match it had reached
		for (let i = index + 1; i < next.length; i++)
			if (next[i] === old) next[i] = null;
	}
	// Drop anything that's no longer one of the two players
	return matches(seed, next).map((m) => m.winner);
}

/** The first match still to be decided (byes don't count), or null when all are picked. */
export function nextOpenMatch(seed: Slot[], picks: Picks): Match | null {
	return (
		matches(seed, picks).find((m) => !m.bye && !m.winner && m.a && m.b) ?? null
	);
}

/** Matches that need a pick from the person (every match except byes). */
export const playableCount = (seed: Slot[]) =>
	seed.length - 1 - seed.filter((s) => s === null).length;

export const champion = (picks: Picks) => picks[picks.length - 1] ?? null;

/**
 * Reads picks sent by the browser. Returns them only if every match has a valid winner;
 * null otherwise.
 */
export function parsePicks(raw: unknown, seed: Slot[]): string[] | null {
	let value: unknown = raw;
	if (typeof raw === "string") {
		try {
			value = JSON.parse(raw);
		} catch {
			return null;
		}
	}
	if (!Array.isArray(value) || value.length !== seed.length - 1) return null;
	if (!value.every((v) => typeof v === "string")) return null;
	const checked = matches(seed, value as string[]);
	if (checked.some((m) => !m.winner)) return null;
	return checked.map((m) => m.winner!);
}

/** How often each item was picked as the overall winner, most first. */
export function championTally(
	all: { picks: Picks | null }[]
): { itemId: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const { picks } of all) {
		const c = picks ? champion(picks) : null;
		if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
	}
	return [...counts]
		.map(([itemId, count]) => ({ itemId, count }))
		.sort((x, y) => y.count - x.count);
}
