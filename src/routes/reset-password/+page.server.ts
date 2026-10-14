import { fail, redirect } from "@sveltejs/kit";
import { isPwnedPassword, PWNED_MESSAGE } from "$lib/server/pwned";
import { MIN_PASSWORD_LENGTH } from "$lib/validation";
import type { Actions, PageServerLoad } from "./$types";

/**
 * Where the reset email's link ends up (via /auth/confirm, which logs the person in).
 * Without that login the link was old or already used, so send them to ask for a new one.
 */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, "/forgot-password?expired=1");
	return { email: locals.user.email ?? null };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, "/forgot-password?expired=1");

		const form = await request.formData();
		const password = String(form.get("password") ?? "");
		const confirm = String(form.get("confirm") ?? "");

		if (password.length < MIN_PASSWORD_LENGTH) {
			return fail(400, {
				error: `Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.`
			});
		}
		if (password !== confirm)
			return fail(400, { error: "The two passwords don’t match." });
		if (await isPwnedPassword(password))
			return fail(400, { error: PWNED_MESSAGE });

		const { error } = await locals.supabase.auth.updateUser({ password });
		if (error) {
			const message =
				error.code === "same_password"
					? "That’s already your password. Pick a different one."
					: error.code === "weak_password"
						? "That password is too weak. Try a longer one."
						: "Could not save your new password. Please try again.";
			return fail(400, { error: message });
		}

		redirect(303, "/me?toast=password-reset");
	}
};
