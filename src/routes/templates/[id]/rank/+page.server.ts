import { error, fail, redirect } from "@sveltejs/kit";
import { readListForm } from "$lib/server/listForm";
import { isUuid, loadTemplate } from "$lib/server/data";
import { needsUsername } from "$lib/server/auth";
import type { Actions, PageServerLoad } from "./$types";

/** Anyone can rank; saving needs an account. */
export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isUuid(params.id)) error(404, "Template not found");
	return loadTemplate(locals.supabase, params.id);
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		// Coming back here after logging in restores the draft and saves it (?resume=1)
		const back = `/templates/${params.id}/rank?resume=1`;

		const user = locals.user;
		if (!user) redirect(303, `/login?redirectTo=${encodeURIComponent(back)}`);
		if (await needsUsername(locals.supabase, user.id)) {
			redirect(303, `/welcome?next=${encodeURIComponent(back)}`);
		}

		const { items } = await loadTemplate(locals.supabase, params.id);
		const result = readListForm(await request.formData(), items);
		if (!result.ok) return fail(400, { error: result.error });

		const { data, error: err } = await locals.supabase
			.from("tier_lists")
			.insert({ ...result.value, template_id: params.id, owner_id: user.id })
			.select("id")
			.single();

		if (err || !data)
			return fail(500, {
				error: "Could not save your tier list. Please try again."
			});
		redirect(303, `/lists/${data.id}?saved=1`);
	}
};
