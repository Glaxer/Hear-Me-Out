import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	// Logged in already: change the password in settings instead
	if (locals.user) redirect(303, "/me/settings");
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const email = String(form.get("email") ?? "").trim();
		const captchaToken = String(form.get("captcha_token") ?? "") || undefined;

		if (!email)
			return fail(400, { email, error: "Please enter your email address." });

		const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
			// The email's link leads here with a one-time code; /auth/confirm then sends them on to /reset-password
			redirectTo: `${url.origin}/auth/confirm`,
			captchaToken
		});

		if (error?.code === "captcha_failed") {
			return fail(400, {
				email,
				error: "We couldn’t verify that you’re human. Please try again."
			});
		}
		if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
			return fail(429, {
				email,
				error:
					"Too many reset emails were sent just now. Please wait a few minutes and try again."
			});
		}

		// Same answer whether or not the email has an account, so the form can't be used to find out who's signed up
		return { email, sent: true };
	}
};
