import { fail, redirect } from "@sveltejs/kit";
import { refreshBracketSeed } from "$lib/server/data";
import { readTemplateForm } from "$lib/server/templateForm";
import type { Actions } from "./$types";

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) redirect(303, "/login?redirectTo=/templates/new");

		const result = readTemplateForm(await request.formData(), user.id);
		if (!result.ok) return fail(400, { error: result.error });
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

		if (error || !template)
			return fail(500, {
				error: "Could not save the template. Please try again."
			});

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
			return fail(500, {
				error: "Could not set up the bracket. Please try again."
			});
		}

		redirect(303, `/templates/${template.id}/rank?toast=template-saved`);
	}
};
