import { error, fail, redirect } from "@sveltejs/kit";
import {
	hasRanked,
	isUuid,
	loadCountableRankings,
	loadTemplate,
	loadTierList
} from "$lib/server/data";
import { computeHotTakes, type HotTake } from "$lib/verdict";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isUuid(params.id)) error(404, "Tier list not found");
	const list = await loadTierList(locals.supabase, params.id);
	const { template, items } = await loadTemplate(
		locals.supabase,
		list.template_id
	);

	// Hottest takes reveal what everyone else thinks, so (like the verdict) they're only
	// calculated for people who've ranked this template themselves.
	const isOwner = locals.user?.id === list.owner_id;
	const canSee =
		isOwner || (await hasRanked(locals.supabase, template.id, locals.user?.id));
	let hotTakes: HotTake[] | null = null;
	let hotTakesState: "locked" | "not-enough" | "ready" = "locked";
	if (canSee) {
		const others = (
			await loadCountableRankings(locals.supabase, template.id)
		).filter((l) => l.id !== list.id);
		if (others.length >= 2) {
			hotTakes = computeHotTakes(list, others, template.default_tiers);
			hotTakesState = "ready";
		} else {
			hotTakesState = "not-enough";
		}
	}

	return { list, template, items, hotTakes, hotTakesState, isOwner };
};

export const actions: Actions = {
	delete: async ({ locals, params }) => {
		if (!locals.user) redirect(303, "/login");
		const list = await loadTierList(locals.supabase, params.id);
		const { error: err } = await locals.supabase
			.from("tier_lists")
			.delete()
			.eq("id", params.id)
			.eq("owner_id", locals.user.id);
		if (err) return fail(500, { error: "Could not delete the tier list." });
		redirect(303, `/templates/${list.template_id}?toast=list-deleted`);
	}
};
