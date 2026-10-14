import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

/** Creates a Supabase client per request that reads and writes the auth cookies. */
const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	/**
	 * getSession() alone trusts the cookie; getUser() verifies the token with Supabase.
	 * Only return a session once the user has been verified.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

/**
 * If Supabase can't use our /auth/confirm address (e.g. it isn't in the redirect allow list),
 * it falls back to the Site URL and the confirmation code lands on the front page.
 * Forward it to /auth/confirm so the user still gets logged in.
 */
const authCallback: Handle = async ({ event, resolve }) => {
	const { url } = event;
	if (
		url.pathname !== '/auth/confirm' &&
		(url.searchParams.has('code') || url.searchParams.has('token_hash'))
	) {
		redirect(303, `/auth/confirm${url.search}`);
	}
	return resolve(event);
};

/** Pages that require a signed-in user. */
const PROTECTED = ['/templates/new', '/me'];
const PROTECTED_PATTERNS = [
	/^\/templates\/[^/]+\/(rank|edit)$/,
	/^\/lists\/[^/]+\/edit$/
];

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const path = event.url.pathname;
	const needsAuth =
		PROTECTED.some((p) => path.startsWith(p)) || PROTECTED_PATTERNS.some((r) => r.test(path));

	if (needsAuth && !user) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(path + event.url.search)}`);
	}

	return resolve(event);
};

export const handle = sequence(authCallback, supabase, authGuard);
