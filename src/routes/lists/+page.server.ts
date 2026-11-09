import { redirect } from "@sveltejs/kit";
import type {
	ListVisibility,
	Placements,
	TemplateFormat,
	TemplateItem,
	Tier
} from "$lib/types";
import type { PageServerLoad } from "./$types";

interface MyList {
	id: string;
	title: string;
	tiers: Tier[];
	placements: Placements;
	picks: (string | null)[] | null;
	visibility: ListVisibility;
	updated_at: string;
	template_id: string;
	templates: {
		title: string;
		format: TemplateFormat;
		template_items: TemplateItem[];
	} | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) redirect(303, "/login?redirectTo=/lists");

	// Each list with its template's items, so the cards can show a small preview of the ranking
	const { data } = await locals.supabase
		.from("tier_lists")
		.select(
			"id, title, tiers, placements, picks, visibility, updated_at, template_id, templates(title, format, template_items(id, label, image_path, position))"
		)
		.eq("owner_id", user.id)
		.order("updated_at", { ascending: false });

	return { lists: (data ?? []) as unknown as MyList[] };
};
