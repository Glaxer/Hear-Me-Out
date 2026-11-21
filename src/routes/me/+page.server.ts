import { redirect } from "@sveltejs/kit";
import { TEMPLATE_CARD_SELECT, type TemplateCardRow } from "$lib/server/data";
import type { TierList } from "$lib/types";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) redirect(303, "/login?redirectTo=/me");

	const [templates, lists] = await Promise.all([
		locals.supabase
			.from("templates")
			.select(TEMPLATE_CARD_SELECT)
			.eq("owner_id", user.id)
			// Templates made by the quick tier list belong with their ranking, not here
			.eq("is_quick", false)
			.order("created_at", { ascending: false })
			.order("position", { referencedTable: "template_items" })
			.limit(4, { referencedTable: "template_items" }),
		locals.supabase
			.from("tier_lists")
			.select(
				"id, title, visibility, updated_at, template_id, templates(title)"
			)
			.eq("owner_id", user.id)
			.order("updated_at", { ascending: false })
	]);

	// Favorite templates, most recently favorited first
	const { data: favs } = await locals.supabase
		.from("template_favorites")
		.select("template_id")
		.eq("user_id", user.id)
		.order("created_at", { ascending: false });
	const favIds = (favs ?? []).map((f) => f.template_id as string);
	const { data: favData } = favIds.length
		? await locals.supabase
				.from("templates")
				.select(TEMPLATE_CARD_SELECT)
				.in("id", favIds)
				.order("position", { referencedTable: "template_items" })
				.limit(4, { referencedTable: "template_items" })
		: { data: [] };
	const favoriteTemplates = ((favData ?? []) as unknown as TemplateCardRow[])
		.slice()
		.sort((a, b) => favIds.indexOf(a.id) - favIds.indexOf(b.id));

	return {
		templates: (templates.data ?? []) as unknown as TemplateCardRow[],
		favorites: favoriteTemplates,
		favoriteIds: favIds,
		lists: (lists.data ?? []) as unknown as TierList[],
		email: user.email ?? null
	};
};
