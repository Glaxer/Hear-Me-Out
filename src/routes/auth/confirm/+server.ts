import { redirect, type RequestHandler } from '@sveltejs/kit';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Landing page for the email confirmation link.
 * Supports both the PKCE (Proof Key for Code Exchange) "code" flow and the "token_hash" flow,
 * depending on how the Supabase email template is set up.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as EmailOtpType | null;
	const nextParam = url.searchParams.get('next') ?? '/me';
	const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/me';

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, next);
	} else if (tokenHash && type) {
		const { error } = await locals.supabase.auth.verifyOtp({ token_hash: tokenHash, type });
		if (!error) redirect(303, next);
	}

	redirect(303, '/login?confirmError=1');
};
