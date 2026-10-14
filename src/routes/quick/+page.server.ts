import { fail, redirect } from "@sveltejs/kit";
import { needsUsername } from "$lib/server/auth";
import { readTemplateForm } from "$lib/server/templateForm";
import { parsePlacements } from "$lib/tiers";
import type { Actions } from "./$types";

/**
 * Quick tier lists are made in the browser. Saving one creates a link-only template (so it
 * doesn't show up in browse) with the items, plus the tier list itself.
 */
export const actions: Actions = {
	default: async ({ request, locals }) => {
		// Coming back after logging in restores the draft and saves it (?resume=1)
		const user = locals.user;
		if (!user)
			redirect(
				303,
				`/login?redirectTo=${encodeURIComponent("/quick?resume=1")}`
			);
		if (await needsUsername(locals.supabase, user.id)) {
			redirect(303, `/welcome?next=${encodeURIComponent("/quick?resume=1")}`);
		}

		const form = await request.formData();
		form.set("visibility", "unlisted");
		form.set("category", "Other");
		form.set("description", "");

		const result = readTemplateForm(form, user.id);
		if (!result.ok) return fail(400, { error: result.error });
		const { title, tiers, items } = result.value;
		const listVisibility =
			form.get("list_visibility") === "private" ? "private" : "unlisted";

		// Placements arrive with the browser's item keys; they're swapped for the new ids below
		const keys = form.getAll("item_key").map((k) => String(k));
		if (keys.length !== items.length)
			return fail(400, {
				error: "Something went wrong reading your items. Please try again."
			});
		const byKey = parsePlacements(form.get("placements"), tiers, new Set(keys));
		if (!byKey)
			return fail(400, {
				error: "Something went wrong reading your ranking. Please try again."
			});

		const { data: template, error } = await locals.supabase
			.from("templates")
			.insert({
				owner_id: user.id,
				title,
				description: "",
				category: "Other",
				visibility: "unlisted",
				default_tiers: tiers
			})
			.select("id")
			.single();
		if (error || !template)
			return fail(500, {
				error: "Could not save your tier list. Please try again."
			});

		const { data: inserted, error: itemsError } = await locals.supabase
			.from("template_items")
			.insert(
				items.map(({ label, image_path, full_image_path, position }) => ({
					template_id: template.id,
					label,
					image_path,
					full_image_path,
					position
				}))
			)
			.select("id, position");

		if (itemsError || !inserted || inserted.length !== items.length) {
			await locals.supabase.from("templates").delete().eq("id", template.id);
			return fail(500, {
				error: "Could not save your items. Please try again."
			});
		}

		const idOf = new Map(
			inserted.map((row) => [keys[row.position], row.id as string])
		);
		const placements = Object.fromEntries(
			Object.entries(byKey).map(([tierId, ids]) => [
				tierId,
				ids.map((k) => idOf.get(k)!).filter(Boolean)
			])
		);

		const { data: list, error: listError } = await locals.supabase
			.from("tier_lists")
			.insert({
				template_id: template.id,
				owner_id: user.id,
				title,
				tiers,
				placements,
				visibility: listVisibility
			})
			.select("id")
			.single();

		if (listError || !list) {
			await locals.supabase.from("templates").delete().eq("id", template.id);
			return fail(500, {
				error: "Could not save your tier list. Please try again."
			});
		}

		redirect(303, `/lists/${list.id}?saved=1`);
	}
};
