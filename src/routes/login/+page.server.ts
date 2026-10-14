import { fail, redirect } from "@sveltejs/kit";
import { enabledOAuthProviders, safeRedirect } from "$lib/server/auth";
import { isPwnedPassword } from "$lib/server/pwned";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	if (locals.user)
		redirect(303, safeRedirect(url.searchParams.get("redirectTo")));
	return { providers: await enabledOAuthProviders(fetch) };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const email = String(form.get("email") ?? "").trim();
		const password = String(form.get("password") ?? "");
		const captchaToken = String(form.get("captcha_token") ?? "") || undefined;

		if (!email || !password) {
			return fail(400, {
				email,
				error: "Please enter your email and password."
			});
		}

		// Checked alongside the login (not before it), so it adds no waiting time
		const pwned = isPwnedPassword(password);

		const { error } = await locals.supabase.auth.signInWithPassword({
			email,
			password,
			options: { captchaToken }
		});
		if (error) {
			const message =
				error.code === "captcha_failed"
					? "We couldn’t verify that you’re human. Please try again."
					: error.code === "email_not_confirmed"
						? "Please confirm your email first. Check your inbox and spam folder for the link."
						: "Wrong email or password.";
			return fail(400, { email, error: message });
		}

		// A leaked password never blocks logging in; it just shows a warning afterwards
		const to = safeRedirect(url.searchParams.get("redirectTo"));
		if (await pwned)
			redirect(303, `${to}${to.includes("?") ? "&" : "?"}toast=pwned-password`);
		redirect(303, to);
	}
};
