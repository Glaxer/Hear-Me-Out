import { TEMPLATE_CARD_SELECT, type TemplateCardRow } from "$lib/server/data";
import { CATEGORIES } from "$lib/tiers";
import type { PageServerLoad } from "./$types";

const PAGE_SIZE = 24;

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
	const categoryParam = url.searchParams.get("category") ?? "";
	const category = (CATEGORIES as readonly string[]).includes(categoryParam)
		? categoryParam
		: "";
	const sort = url.searchParams.get("sort") === "new" ? "new" : "popular";
	const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

	let query = locals.supabase
		.from("templates")
		.select(TEMPLATE_CARD_SELECT, { count: "exact" })
		.eq("visibility", "public")
		.order("position", { referencedTable: "template_items" })
		.limit(4, { referencedTable: "template_items" });

	if (q) {
		// Escape characters that have meaning in PostgREST filters and LIKE patterns
		const safe = q.replace(/[%_\\,()]/g, " ");
		query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
	}
	if (category) query = query.eq("category", category);

	query =
		sort === "new"
			? query.order("created_at", { ascending: false })
			: query
					.order("list_count", { ascending: false })
					.order("created_at", { ascending: false });

	const from = (page - 1) * PAGE_SIZE;
	const { data, count } = await query.range(from, from + PAGE_SIZE - 1);

	return {
		templates: (data ?? []) as unknown as TemplateCardRow[],
		total: count ?? 0,
		page,
		pageCount: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
		filters: { q, category, sort }
	};
};
