import { redirect, type RequestHandler } from '@sveltejs/kit';
import type { EmailOtpType } from '@supabase/supabase-js';
import { needsUsername, safeRedirect } from '$lib/server/auth';

/**
 * Where people land after logging in elsewhere:
 *
 * - token_hash flow (email confirmation link set up in the Supabase email template): works on any
 *   device, so the user is logged in even if they open the email on their phone.
 * - code flow, two cases:
 *   - Google/Discord (flow=oauth): the code is swapped for a login. New accounts pick a username
 *     on /welcome first.
 *   - Supabase's default email link: only logs in if it's opened in the same browser that signed
 *     up. On another device the email is still confirmed, so we send them to log in.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const tokenHash = url.searchParams.get('token_hash');
	const type = (url.searchParams.get('type') ?? 'email') as EmailOtpType;
	const isOAuth = url.searchParams.get('flow') === 'oauth';
	const next = safeRedirect(url.searchParams.get('next'), '');

	// Google/Discord send the user back with ?error=… if they cancel or something goes wrong
	if (url.searchParams.has('error')) {
		redirect(303, isOAuth ? '/login?oauthError=1' : '/login?confirmError=1');
	}

	if (tokenHash) {
		const { error } = await locals.supabase.auth.verifyOtp({ token_hash: tokenHash, type });
		if (!error) redirect(303, '/me?toast=welcome');
		redirect(303, '/login?confirmError=1');
	}

	if (code) {
		const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);

		if (!error && data.user) {
			if (await needsUsername(locals.supabase, data.user.id)) {
				redirect(303, `/welcome${next ? `?next=${encodeURIComponent(next)}` : ''}`);
			}
			if (isOAuth) {
				redirect(303, next ? `${next}${next.includes('?') ? '&' : '?'}toast=logged-in` : '/me?toast=logged-in');
			}
			redirect(303, '/me?toast=welcome');
		}

		if (isOAuth) redirect(303, '/login?oauthError=1');
		// Supabase only hands out an email code after confirming the email, so the account is confirmed
		redirect(303, '/login?toast=confirmed');
	}

	redirect(303, '/login?confirmError=1');
};
