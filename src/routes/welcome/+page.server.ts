import { fail, redirect } from '@sveltejs/kit';
import { needsUsername, safeRedirect, suggestUsername } from '$lib/server/auth';
import { USERNAME_HINT, USERNAME_PATTERN } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

/** Where to go after picking a username: back to what they were doing, or their page. */
const destination = (url: URL) => safeRedirect(url.searchParams.get('next'), '/me');

/** One-time step for new Google/Discord accounts: pick the username shown on their tier lists. */
export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) redirect(303, '/login');
	if (!(await needsUsername(locals.supabase, user.id))) redirect(303, destination(url));

	return { suggestion: suggestUsername(user) };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const user = locals.user;
		if (!user) redirect(303, '/login');

		const username = String((await request.formData()).get('username') ?? '').trim();
		if (!USERNAME_PATTERN.test(username)) return fail(400, { username, error: USERNAME_HINT });

		// Usernames are unique regardless of upper/lower case
		const { data: taken } = await locals.supabase
			.from('profiles')
			.select('id')
			.ilike('username', username)
			.neq('id', user.id)
			.maybeSingle();
		if (taken) return fail(400, { username, error: 'That username is already taken.' });

		const { error } = await locals.supabase
			.from('profiles')
			.update({ username, needs_username: false })
			.eq('id', user.id);
		if (error) {
			const message =
				error.code === '23505' ? 'That username is already taken.' : 'Could not save your username. Please try again.';
			return fail(400, { username, error: message });
		}

		const to = destination(url);
		redirect(303, `${to}${to.includes('?') ? '&' : '?'}toast=username-picked`);
	}
};
