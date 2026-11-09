import { fail, redirect } from "@sveltejs/kit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMAGE_BUCKET } from "$lib/images";
import { isUuid, loadTemplate, refreshBracketSeed } from "$lib/server/data";
import { readTemplateForm } from "$lib/server/templateForm";
import type { Actions, PageServerLoad } from "./$types";

/** `?from=<template id>`: "Duplicate" fills the form with a copy of that template. */
export const load: PageServerLoad = async ({ locals, url }) => {
	const from = url.searchParams.get("from");
	if (!from || !isUuid(from)) return { source: null };
	return { source: await loadTemplate(locals.supabase, from) };
};

/**
 * Duplicating: copies the source template's pictures into the user's own folder, so the copy
 * keeps working if the original (or its owner's account) is deleted. Only pictures that belong
 * to that template are copied; the form fields are rewritten to point at the copies.
 * Returns the new paths (to clean up if saving fails), or null if copying failed.
 */
async function copySourceImages(
	supabase: SupabaseClient,
	userId: string,
	sourceId: string,
	form: FormData
): Promise<string[] | null> {
	const { items } = await loadTemplate(supabase, sourceId);
	const allowed = new Set(
		items
			.flatMap((i) => [i.image_path, i.full_image_path])
			.filter((p): p is string => !!p)
	);

	const copies = new Map<string, string>();
	for (const field of ["item_image", "item_full_image"])
		for (const value of form.getAll(field)) {
			const path = String(value);
			if (!allowed.has(path) || copies.has(path)) continue;
			const ext = path.split(".").pop()?.toLowerCase() ?? "";
			const safeExt = ["webp", "png", "jpg"].includes(ext) ? ext : "webp";
			copies.set(path, `${userId}/${crypto.randomUUID()}.${safeExt}`);
		}

	const done: string[] = [];
	const pairs = [...copies];
	const bucket = supabase.storage.from(IMAGE_BUCKET);
	for (let i = 0; i < pairs.length; i += 10) {
		const results = await Promise.all(
			pairs.slice(i, i + 10).map(async ([from, to]) => {
				const { error } = await bucket.copy(from, to);
				if (!error) done.push(to);
				return !error;
			})
		);
		if (results.includes(false)) {
			if (done.length) await bucket.remove(done);
			return null;
		}
	}

	for (const field of ["item_image", "item_full_image"]) {
		const values = form.getAll(field).map(String);
		form.delete(field);
		for (const v of values) form.append(field, copies.get(v) ?? v);
	}
	return done;
}

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const user = locals.user;
		if (!user) redirect(303, "/login?redirectTo=/templates/new");

		const form = await request.formData();
		let result = readTemplateForm(form, user.id);
		if (!result.ok) return fail(400, { error: result.error });

		// Checked first, so nothing is copied for a form that can't be saved anyway
		const from = url.searchParams.get("from");
		let copied: string[] = [];
		if (from && isUuid(from)) {
			const done = await copySourceImages(locals.supabase, user.id, from, form);
			if (!done)
				return fail(500, {
					error: "Could not copy the pictures. Please try again."
				});
			copied = done;
			result = readTemplateForm(form, user.id);
			if (!result.ok) return fail(400, { error: result.error });
		}
		const removeCopies = async () => {
			if (copied.length)
				await locals.supabase.storage.from(IMAGE_BUCKET).remove(copied);
		};

		const {
			title,
			description,
			category,
			visibility,
			format,
			bracketOrder,
			tiers,
			items
		} = result.value;

		const { data: template, error } = await locals.supabase
			.from("templates")
			.insert({
				owner_id: user.id,
				title,
				description,
				category,
				visibility,
				format,
				bracket_order: bracketOrder,
				default_tiers: tiers
			})
			.select("id")
			.single();

		if (error || !template) {
			await removeCopies();
			return fail(500, {
				error: "Could not save the template. Please try again."
			});
		}

		const { error: itemsError } = await locals.supabase
			.from("template_items")
			.insert(
				items.map(({ label, image_path, full_image_path, position }) => ({
					template_id: template.id,
					label,
					image_path,
					full_image_path,
					position
				}))
			);

		if (itemsError) {
			await locals.supabase.from("templates").delete().eq("id", template.id);
			await removeCopies();
			return fail(500, {
				error: "Could not save the items. Please try again."
			});
		}

		// Brackets: fix the first round now, so everyone fills out the same bracket
		if (
			format === "bracket" &&
			!(await refreshBracketSeed(
				locals.supabase,
				template.id,
				bracketOrder,
				null,
				true
			))
		) {
			await locals.supabase.from("templates").delete().eq("id", template.id);
			await removeCopies();
			return fail(500, {
				error: "Could not set up the bracket. Please try again."
			});
		}

		redirect(303, `/templates/${template.id}/rank?toast=template-saved`);
	}
};
