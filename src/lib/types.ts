export interface Tier {
	id: string;
	label: string;
	color: string;
}

/** tierId -> ordered list of item ids */
export type Placements = Record<string, string[]>;

export type TemplateVisibility = "public" | "unlisted";
/** tier_list: rank items into tiers; bracket: a knockout tournament between the items. */
/** "blind": a blind ranking, a top 10 filled one item at a time (see $lib/blind). */
export type TemplateFormat = "tier_list" | "bracket" | "blind";
export type ListVisibility = "public" | "unlisted" | "private";

export interface TemplateItem {
	id: string;
	label: string;
	/** Small thumbnail (256px) used in tier lists. */
	image_path: string | null;
	/** Large version for the image viewer; missing for items made before it existed. */
	full_image_path?: string | null;
	position: number;
}

export interface Template {
	id: string;
	owner_id: string;
	title: string;
	description: string;
	category: string;
	default_tiers: Tier[];
	visibility: TemplateVisibility;
	format: TemplateFormat;
	/** Brackets only: random first round, or the order the items were added. */
	bracket_order: "shuffled" | "ordered";
	/** Brackets only: the fixed first round (see $lib/bracket). */
	bracket_seed: (string | null)[] | null;
	/** Made by the quick tier list: left out of "My templates". */
	is_quick?: boolean;
	list_count: number;
	created_at: string;
	profiles?: { username: string } | null;
}

export interface TierList {
	id: string;
	template_id: string;
	owner_id: string;
	title: string;
	tiers: Tier[];
	placements: Placements;
	/** Bracket templates only: the winner of every match (see $lib/bracket). */
	picks?: (string | null)[] | null;
	visibility: ListVisibility;
	created_at: string;
	updated_at: string;
	profiles?: { username: string } | null;
	templates?: { title: string } | null;
}
