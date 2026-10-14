export interface Tier {
	id: string;
	label: string;
	color: string;
}

/** tierId -> ordered list of item ids */
export type Placements = Record<string, string[]>;

export interface TemplateItem {
	id: string;
	label: string;
	image_path: string | null;
	position: number;
}

export interface Template {
	id: string;
	owner_id: string;
	title: string;
	description: string;
	category: string;
	default_tiers: Tier[];
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
	is_public: boolean;
	created_at: string;
	updated_at: string;
	profiles?: { username: string } | null;
	templates?: { title: string } | null;
}
