import { error } from "@sveltejs/kit";
import { isUuid, loadTemplate, loadTierList } from "$lib/server/data";
import { unrankedIds } from "$lib/tiers";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isUuid(params.id) || !isUuid(params.itemId)) error(404, "Not found");

	const list = await loadTierList(locals.supabase, params.id);
	const { template, items } = await loadTemplate(
		locals.supabase,
		list.template_id
	);
	const item = items.find((i) => i.id === params.itemId);
	if (!item) error(404, "This item isn’t in the template any more");

	// Browse in the list's order: tier by tier, then the unranked items
	const ranked = list.tiers.flatMap((t) => list.placements[t.id] ?? []);
	const order = [
		...ranked,
		...unrankedIds(
			items.map((i) => i.id),
			list.placements
		)
	].filter((id) => items.some((i) => i.id === id));
	const index = order.indexOf(item.id);
	const tier =
		list.tiers.find((t) => list.placements[t.id]?.includes(item.id)) ?? null;

	return {
		list: {
			id: list.id,
			title: list.title,
			owner: list.profiles?.username ?? null
		},
		template: {
			id: template.id,
			title: template.title,
			owner_id: template.owner_id
		},
		item,
		tier,
		position: { index, total: order.length },
		prevId: index > 0 ? order[index - 1] : null,
		nextId: index < order.length - 1 ? order[index + 1] : null
	};
};
