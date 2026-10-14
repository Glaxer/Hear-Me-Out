export interface Tier {
	id: string;
	label: string;
	color: string;
}

/** tierId -> ordered list of item ids */
export type Placements = Record<string, string[]>;

export type TemplateVisibility = 'public' | 'unlisted';
export type ListVisibility = 'public' | 'unlisted' | 'private';

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
	visibility: ListVisibility;
	created_at: string;
	updated_at: string;
	profiles?: { username: string } | null;
	templates?: { title: string } | null;
}
