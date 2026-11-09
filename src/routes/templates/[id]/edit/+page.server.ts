import { error, fail, redirect } from "@sveltejs/kit";
import { IMAGE_BUCKET } from "$lib/images";
import {
	hasAnyRankings,
	isUuid,
	loadTemplate,
	refreshBracketSeed
} from "$lib/server/data";
import { readTemplateForm } from "$lib/server/templateForm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isUuid(params.id)) error(404, "Template not found");
	const { template, items } = await loadTemplate(locals.supabase, params.id);
	if (template.owner_id !== locals.user?.id)
		error(403, "Only the person who made this template can edit it");
	// A bracket's items can't change once someone has filled it out: their picks depend on them
	const itemsLocked =
		template.format === "bracket" &&
		(await hasAnyRankings(locals.supabase, template.id));
	return { template, items, itemsLocked };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const user = locals.user;
		if (!user) redirect(303, `/login?redirectTo=/templates/${params.id}/edit`);

		const { template, items: existing } = await loadTemplate(
			locals.supabase,
			params.id
		);
		if (template.owner_id !== user.id)
			error(403, "Only the person who made this template can edit it");

		const result = readTemplateForm(await request.formData(), user.id);
		if (!result.ok) return fail(400, { error: result.error });
		const { title, description, category, visibility, bracketOrder, tiers } =
			result.value;
		let { items } = result.value;
		// The format is chosen when the template is made and can't change afterwards
		const isBracket = template.format === "bracket";
		const itemsLocked =
			isBracket && (await hasAnyRankings(locals.supabase, params.id));
		// Locked: keep the items exactly as they are, whatever the form sent
		if (itemsLocked)
			items = existing.map((i) => ({
				id: i.id,
				label: i.label,
				image_path: i.image_path,
				full_image_path: i.full_image_path ?? null,
				position: i.position
			}));

		const existingById = new Map(existing.map((i) => [i.id, i]));
		const kept = items.filter((i) => i.id && existingById.has(i.id));
		const added = items.filter((i) => !i.id || !existingById.has(i.id));
		const keptIds = new Set(kept.map((i) => i.id));
		const removed = existing.filter((i) => !keptIds.has(i.id));

		// Images that are no longer used: from removed items, or replaced on kept ones
		const stillUsed = new Set(
			items.flatMap((i) => [i.image_path, i.full_image_path])
		);
		const unusedImages = existing
			.flatMap((i) => [i.image_path, i.full_image_path])
			.filter(
				(p): p is string =>
					!!p && !stillUsed.has(p) && p.startsWith(`${user.id}/`)
			);

		const { error: templateError } = await locals.supabase
			.from("templates")
			.update({
				title,
				description,
				category,
				visibility,
				default_tiers: tiers,
				// Brackets: the order setting can only change while the items can
				...(isBracket && !itemsLocked ? { bracket_order: bracketOrder } : {})
			})
			.eq("id", params.id);
		if (templateError)
			return fail(500, {
				error: "Could not save the template. Please try again."
			});

		if (removed.length) {
			const { error: err } = await locals.supabase
				.from("template_items")
				.delete()
				.in(
					"id",
					removed.map((i) => i.id)
				);
			if (err)
				return fail(500, {
					error: "Could not remove items. Please try again."
				});
		}

		if (kept.length) {
			const { error: err } = await locals.supabase
				.from("template_items")
				.upsert(
					kept.map(({ id, label, image_path, full_image_path, position }) => ({
						id: id!,
						template_id: params.id,
						label,
						image_path,
						full_image_path,
						position
					}))
				);
			if (err)
				return fail(500, {
					error: "Could not update items. Please try again."
				});
		}

		if (added.length) {
			const { error: err } = await locals.supabase
				.from("template_items")
				.insert(
					added.map(({ label, image_path, full_image_path, position }) => ({
						template_id: params.id,
						label,
						image_path,
						full_image_path,
						position
					}))
				);
			if (err)
				return fail(500, {
					error: "Could not add the new items. Please try again."
				});
		}

		// Brackets nobody has filled out yet: rebuild the first round if the items or order changed
		if (isBracket && !itemsLocked) {
			const ok = await refreshBracketSeed(
				locals.supabase,
				params.id,
				bracketOrder,
				template.bracket_seed,
				bracketOrder !== template.bracket_order
			);
			if (!ok)
				return fail(500, {
					error: "Could not update the bracket. Please try again."
				});
		}

		// Best effort: tidy up images nobody uses any more
		if (unusedImages.length) {
			await locals.supabase.storage.from(IMAGE_BUCKET).remove(unusedImages);
		}

		redirect(303, `/templates/${params.id}?toast=template-saved`);
	}
};
