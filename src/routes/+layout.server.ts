import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, session } = locals;
	let username: string | null = null;

	if (user) {
		const { data } = await locals.supabase
			.from('profiles')
			.select('username')
			.eq('id', user.id)
			.single();
		username = data?.username ?? null;
	}

	return { session, user, username };
};
