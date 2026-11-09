import { error } from "@sveltejs/kit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Template, TemplateItem, TierList } from "$lib/types";
import type { RankingInput } from "$lib/verdict";
import { buildSeed, seedMatchesItems, type BracketOrder } from "$lib/bracket";

export const TEMPLATE_CARD_SELECT =
	"id, owner_id, title, description, category, default_tiers, format, list_count, created_at, profiles(username), template_items(label, image_path, position)";

export type TemplateCardRow = Template & {
	template_items: {
		label: string;
		image_path: string | null;
		position: number;
	}[];
};

/** Loads a template and its items, or throws a 404. */
export async function loadTemplate(
	supabase: SupabaseClient,
	id: string
): Promise<{ template: Template; items: TemplateItem[] }> {
	const { data: template } = await supabase
		.from("templates")
		.select("*, profiles(username)")
		.eq("id", id)
		.maybeSingle();

	if (!template) error(404, "Template not found");

	const { data: items } = await supabase
		.from("template_items")
		.select("id, label, image_path, full_image_path, position")
		.eq("template_id", id)
		.order("position");

	return {
		template: template as Template,
		items: (items ?? []) as TemplateItem[]
	};
}

/** Loads a tier list (RLS hides private lists from other users), or throws a 404. */
export async function loadTierList(
	supabase: SupabaseClient,
	id: string
): Promise<TierList> {
	const { data } = await supabase
		.from("tier_lists")
		.select("*, profiles(username), templates(title)")
		.eq("id", id)
		.maybeSingle();

	if (!data) error(404, "Tier list not found");
	return data as TierList;
}

/** Checks that a string looks like a UUID before it hits the database. */
export function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
		value
	);
}

/**
 * Rankings that count towards a template's verdict: public and link-only lists (not private).
 * Only aggregates computed from these are ever sent to the browser.
 */
export async function loadCountableRankings(
	supabase: SupabaseClient,
	templateId: string
): Promise<
	(RankingInput & { owner_id: string; picks: (string | null)[] | null })[]
> {
	const { data } = await supabase
		.from("tier_lists")
		.select("id, owner_id, tiers, placements, picks")
		.eq("template_id", templateId)
		.in("visibility", ["public", "unlisted"])
		.limit(2000);
	return (data ?? []) as (RankingInput & {
		owner_id: string;
		picks: (string | null)[] | null;
	})[];
}

/** Whether this user has made any ranking (any visibility) of the template. */
export async function hasRanked(
	supabase: SupabaseClient,
	templateId: string,
	userId: string | undefined
) {
	if (!userId) return false;
	const { count } = await supabase
		.from("tier_lists")
		.select("id", { count: "exact", head: true })
		.eq("template_id", templateId)
		.eq("owner_id", userId);
	return (count ?? 0) > 0;
}

/** Whether anyone has filled out (ranked) this template yet, in any visibility. */
export async function hasAnyRankings(
	supabase: SupabaseClient,
	templateId: string
): Promise<boolean> {
	const { count } = await supabase
		.from("tier_lists")
		.select("id", { count: "exact", head: true })
		.eq("template_id", templateId);
	return (count ?? 0) > 0;
}

/**
 * Makes sure a bracket template's first round fits its items. Builds a new one when there is
 * none, when the items changed, or when `rebuild` is set (e.g. the order setting changed).
 * Only call this while nobody has filled the bracket out: their picks depend on it.
 */
export async function refreshBracketSeed(
	supabase: SupabaseClient,
	templateId: string,
	order: BracketOrder,
	currentSeed: unknown,
	rebuild = false
): Promise<boolean> {
	const { data: items } = await supabase
		.from("template_items")
		.select("id, position")
		.eq("template_id", templateId)
		.order("position");
	const ids = (items ?? []).map((i) => i.id as string);
	// "In the order added": the bracket follows the item order, so a reorder changes it too
	const unchanged =
		order === "ordered"
			? JSON.stringify(currentSeed) === JSON.stringify(buildSeed(ids, order))
			: seedMatchesItems(currentSeed, ids);
	if (!rebuild && unchanged) return true;
	const { error } = await supabase
		.from("templates")
		.update({ bracket_seed: buildSeed(ids, order) })
		.eq("id", templateId);
	return !error;
}
