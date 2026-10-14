import type { Placements, Tier } from "./types";

/** The verdict only appears once this many rankings count. */
export const VERDICT_MIN_LISTS = 3;
/** Items need this many votes to be called "divisive". */
const DIVISIVE_MIN_VOTES = 3;
/** Standard deviation (on the 0–1 scale) above which an item counts as divisive. */
const DIVISIVE_MIN_SPREAD = 0.25;
/** A take is "hot" when it's this far from everyone else (0.25 ≈ one tier in a 5-tier list). */
const HOT_TAKE_MIN_DIFF = 0.3;
/** Other people's votes needed on an item before we compare against them. */
const HOT_TAKE_MIN_OTHER_VOTES = 2;

/** The parts of a tier list the verdict needs. */
export interface RankingInput {
	id: string;
	tiers: Tier[];
	placements: Placements;
}

export interface ItemStats {
	votes: number;
	/** 0 (bottom tier) to 1 (top tier). */
	average: number;
	/** Index into the verdict tiers where the average lands. */
	tierIndex: number;
	/** Votes per verdict tier, top to bottom. */
	distribution: number[];
	/** Standard deviation of the scores: how much people disagree. */
	spread: number;
}

export interface Verdict {
	tiers: Tier[];
	placements: Placements;
	stats: Record<string, ItemStats>;
	listCount: number;
	/** Up to three item ids people disagree about most, most divisive first. */
	divisive: string[];
}

export interface HotTake {
	itemId: string;
	/** The tier this list put the item in. */
	mine: Tier;
	/** Where everyone else's average lands (a verdict tier). */
	others: Tier;
	otherVotes: number;
	/** Positive: this list rates it higher than everyone else. */
	diff: number;
}

/** Where an item sits in one person's list: 1 = top tier, 0 = bottom tier, null = not ranked. */
export function scoreIn(list: RankingInput, itemId: string): number | null {
	const n = list.tiers.length;
	const index = list.tiers.findIndex((t) =>
		list.placements[t.id]?.includes(itemId)
	);
	if (index < 0) return null;
	return n <= 1 ? 0.5 : 1 - index / (n - 1);
}

/** Maps a 0–1 score onto a set of tiers (evenly spaced, top tier first). */
export function tierIndexFor(score: number, tierCount: number): number {
	if (tierCount <= 1) return 0;
	const index = Math.round((1 - score) * (tierCount - 1));
	return Math.min(tierCount - 1, Math.max(0, index));
}

/**
 * Combines everyone's rankings into one tier list using the template's default tiers.
 * Unranked items don't count as votes. Order inside a tier is by average, best first.
 */
export function computeVerdict(
	templateTiers: Tier[],
	itemIds: string[],
	lists: RankingInput[]
): Verdict {
	const n = templateTiers.length;
	const stats: Record<string, ItemStats> = {};

	for (const itemId of itemIds) {
		const scores = lists
			.map((l) => scoreIn(l, itemId))
			.filter((s): s is number => s !== null);
		if (scores.length === 0) continue;

		const average = scores.reduce((a, b) => a + b, 0) / scores.length;
		const variance =
			scores.reduce((a, s) => a + (s - average) ** 2, 0) / scores.length;
		const distribution = new Array(n).fill(0);
		for (const s of scores) distribution[tierIndexFor(s, n)]++;

		stats[itemId] = {
			votes: scores.length,
			average,
			tierIndex: tierIndexFor(average, n),
			distribution,
			spread: Math.sqrt(variance)
		};
	}

	const placements: Placements = {};
	templateTiers.forEach((tier, i) => {
		placements[tier.id] = Object.keys(stats)
			.filter((id) => stats[id].tierIndex === i)
			.sort((a, b) => stats[b].average - stats[a].average);
	});

	const divisive = Object.keys(stats)
		.filter(
			(id) =>
				stats[id].votes >= DIVISIVE_MIN_VOTES &&
				stats[id].spread >= DIVISIVE_MIN_SPREAD
		)
		.sort((a, b) => stats[b].spread - stats[a].spread)
		.slice(0, 3);

	return {
		tiers: templateTiers,
		placements,
		stats,
		listCount: lists.length,
		divisive
	};
}

/**
 * The (up to) three items where `list` differs most from everyone else's rankings.
 * `others` should not include `list` itself.
 */
export function computeHotTakes(
	list: RankingInput,
	others: RankingInput[],
	templateTiers: Tier[]
): HotTake[] {
	const takes: HotTake[] = [];

	for (const [index, tier] of list.tiers.entries()) {
		for (const itemId of list.placements[tier.id] ?? []) {
			const mine = scoreIn(list, itemId);
			const theirs = others
				.map((o) => scoreIn(o, itemId))
				.filter((s): s is number => s !== null);
			if (mine === null || theirs.length < HOT_TAKE_MIN_OTHER_VOTES) continue;

			const average = theirs.reduce((a, b) => a + b, 0) / theirs.length;
			const diff = mine - average;
			if (Math.abs(diff) < HOT_TAKE_MIN_DIFF) continue;

			takes.push({
				itemId,
				mine: list.tiers[index],
				others: templateTiers[tierIndexFor(average, templateTiers.length)],
				otherVotes: theirs.length,
				diff
			});
		}
	}

	return takes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 3);
}
