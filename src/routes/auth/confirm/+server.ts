import { redirect, type RequestHandler } from '@sveltejs/kit';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Landing page for the email confirmation link.
 *
 * - token_hash flow (recommended, set up in the Supabase email template): works on any device,
 *   so the user is logged in even if they open the email on their phone.
 * - code flow (Supabase's default link): only logs in if the link is opened in the same browser
 *   that signed up. On another device the email is still confirmed, so we send them to log in.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const tokenHash = url.searchParams.get('token_hash');
	const type = (url.searchParams.get('type') ?? 'email') as EmailOtpType;

	if (tokenHash) {
		const { error } = await locals.supabase.auth.verifyOtp({ token_hash: tokenHash, type });
		if (!error) redirect(303, '/me?toast=welcome');
		redirect(303, '/login?confirmError=1');
	}

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, '/me?toast=welcome');
		// Supabase only hands out a code after confirming the email, so the account is confirmed
		redirect(303, '/login?toast=confirmed');
	}

	redirect(303, '/login?confirmError=1');
};
