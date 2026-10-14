import { error, redirect, type RequestHandler } from "@sveltejs/kit";
import { isOAuthProvider, safeRedirect } from "$lib/server/auth";

/**
 * "Continue with Google / Discord": asks Supabase for the provider's login page and sends the
 * user there. Afterwards the provider sends them back to /auth/confirm with a one-time code.
 * Done on the server so the code verifier (PKCE, Proof Key for Code Exchange) is kept in a cookie
 * that /auth/confirm can read.
 */
export const POST: RequestHandler = async ({ request, locals, url }) => {
	const form = await request.formData();
	const provider = form.get("provider");
	if (!isOAuthProvider(provider)) error(400, "Unknown login option");

	const next = safeRedirect(String(form.get("redirectTo") ?? "") || null, "");
	const callback = new URL("/auth/confirm", url.origin);
	callback.searchParams.set("flow", "oauth");
	if (next) callback.searchParams.set("next", next);

	const { data, error: oauthError } =
		await locals.supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: callback.toString(),
				// Discord only shares the email address when asked for it
				scopes: provider === "discord" ? "identify email" : undefined
			}
		});

	if (oauthError || !data.url) redirect(303, "/login?oauthError=1");
	redirect(303, data.url);
};
