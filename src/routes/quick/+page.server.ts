import { fail, redirect } from "@sveltejs/kit";
import { needsUsername } from "$lib/server/auth";
import { parsePicks, seedMatchesItems, type Slot } from "$lib/bracket";
import { readTemplateForm } from "$lib/server/templateForm";
import { parsePlacements } from "$lib/tiers";
import type { Actions } from "./$types";

/**
 * Quick tier lists and brackets are made in the browser. Saving one creates a link-only
 * template (so it doesn't show up in browse) with the items, plus the tier list or bracket.
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

		// Checked here first: the template form would ask for a "template" title
		const formTitle = String(form.get("title") ?? "").trim();
		if (!formTitle || formTitle.length > 100) {
			const noun = form.get("format") === "bracket" ? "bracket" : "tier list";
			return fail(400, {
				error: `Give your ${noun} a title (max 100 characters).`
			});
		}

		const result = readTemplateForm(form, user.id);
		if (!result.ok) return fail(400, { error: result.error });
		const { title, tiers, items, format, bracketOrder } = result.value;
		const isBracket = format === "bracket";
		const listVisibility =
			form.get("list_visibility") === "private" ? "private" : "unlisted";

		// Placements arrive with the browser's item keys; they're swapped for the new ids below
		const keys = form.getAll("item_key").map((k) => String(k));
		if (keys.length !== items.length)
			return fail(400, {
				error: "Something went wrong reading your items. Please try again."
			});
		// Tier list: placements. Bracket: the first round and the picks made in the browser.
		const byKey = isBracket
			? {}
			: parsePlacements(form.get("placements"), tiers, new Set(keys));
		let seedKeys: Slot[] | null = null;
		let picksKeys: string[] | null = null;
		if (isBracket) {
			try {
				seedKeys = JSON.parse(String(form.get("bracket_seed") ?? "null"));
			} catch {
				seedKeys = null;
			}
			if (!seedMatchesItems(seedKeys, keys))
				return fail(400, {
					error: "Something went wrong reading your bracket. Please try again."
				});
			picksKeys = parsePicks(form.get("picks"), seedKeys!);
			if (!picksKeys)
				return fail(400, { error: "Pick a winner in every match first." });
		}
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
				format,
				bracket_order: bracketOrder,
				default_tiers: tiers
			})
			.select("id")
			.single();
		if (error || !template)
			return fail(500, {
				error: `Could not save your ${isBracket ? "bracket" : "tier list"}. Please try again.`
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
		const toId = (k: string | null) => (k ? (idOf.get(k) ?? null) : null);
		if (isBracket) {
			const { error: seedError } = await locals.supabase
				.from("templates")
				.update({ bracket_seed: seedKeys!.map(toId) })
				.eq("id", template.id);
			if (seedError) {
				await locals.supabase.from("templates").delete().eq("id", template.id);
				return fail(500, {
					error: "Could not save your bracket. Please try again."
				});
			}
		}
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
				tiers: isBracket ? [] : tiers,
				placements: isBracket ? {} : placements,
				picks: isBracket ? picksKeys!.map(toId) : null,
				visibility: listVisibility
			})
			.select("id")
			.single();

		if (listError || !list) {
			await locals.supabase.from("templates").delete().eq("id", template.id);
			return fail(500, {
				error: `Could not save your ${isBracket ? "bracket" : "tier list"}. Please try again.`
			});
		}

		redirect(303, `/lists/${list.id}?saved=1`);
	}
};
