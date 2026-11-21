import { error, redirect, type RequestHandler } from "@sveltejs/kit";
import { isOAuthProvider } from "$lib/server/auth";

/**
 * "Connect" on the settings page: adds Google/Discord as another way to log in to the
 * logged-in account. Like /auth/oauth, but Supabase attaches the provider to this account
 * instead of logging in. The provider sends the user back to /auth/confirm?flow=link.
 * Needs "Allow manual linking" switched on in Supabase (Authentication -> Sign In / Providers).
 */
export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.user) redirect(303, "/login?redirectTo=/me/settings");

	const provider = (await request.formData()).get("provider");
	if (!isOAuthProvider(provider)) error(400, "Unknown login option");

	const callback = new URL("/auth/confirm", url.origin);
	callback.searchParams.set("flow", "link");

	const { data, error: linkError } = await locals.supabase.auth.linkIdentity({
		provider,
		options: {
			redirectTo: callback.toString(),
			// Discord only shares the email address when asked for it
			scopes: provider === "discord" ? "identify email" : undefined
		}
	});

	if (linkError || !data.url) {
		const disabled = linkError?.code === "manual_linking_disabled";
		redirect(
			303,
			`/me/settings?toast=${disabled ? "link-disabled" : "link-failed"}`
		);
	}
	redirect(303, data.url);
};
