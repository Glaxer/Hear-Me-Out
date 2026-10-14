import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/** Only allow relative redirects, so a link can't send people to another site after logging in. */
export function safeRedirect(target: string | null | undefined, fallback = '/me'): string {
	if (target && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')) {
		return target;
	}
	return fallback;
}

/** The "Continue with …" options we support, in the order they're shown. */
export const OAUTH_PROVIDERS = ['google', 'discord'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const isOAuthProvider = (value: unknown): value is OAuthProvider =>
	OAUTH_PROVIDERS.includes(value as OAuthProvider);

let cached: { providers: OAuthProvider[]; at: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

/**
 * Which providers are switched on in Supabase (Authentication -> Sign In / Providers).
 * Asked from Supabase's public settings endpoint, so a button only shows up once the provider
 * is set up there. If Supabase can't be reached, no buttons are shown (email login still works).
 */
export async function enabledOAuthProviders(fetchFn: typeof fetch = fetch): Promise<OAuthProvider[]> {
	if (cached && Date.now() - cached.at < CACHE_MS) return cached.providers;
	try {
		const res = await fetchFn(`${PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
			headers: { apikey: PUBLIC_SUPABASE_ANON_KEY },
			signal: AbortSignal.timeout(3000)
		});
		if (!res.ok) return [];
		const settings = (await res.json()) as { external?: Record<string, boolean> };
		const providers = OAUTH_PROVIDERS.filter((p) => settings.external?.[p] === true);
		cached = { providers, at: Date.now() };
		return providers;
	} catch {
		return [];
	}
}

/** True when a Google/Discord account hasn't picked its username yet. */
export async function needsUsername(supabase: SupabaseClient, userId: string): Promise<boolean> {
	const { data } = await supabase.from('profiles').select('needs_username').eq('id', userId).maybeSingle();
	return data?.needs_username === true;
}

/**
 * True when the account was made with email + password. (A Google/Discord account that later
 * sets a password can also log in with it, but Supabase doesn't record that here.)
 */
export function hasPassword(user: User): boolean {
	const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider];
	return providers.includes('email');
}

/**
 * A username suggestion from the Google/Discord profile, e.g. "Jacob Hansen" -> "Jacob_Hansen".
 * Only a suggestion: the user can change it before saving.
 */
export function suggestUsername(user: User): string {
	const meta = user.user_metadata ?? {};
	const candidates = [
		meta.custom_claims?.global_name, // Discord display name
		meta.full_name,
		meta.name,
		user.email?.split('@')[0]
	];
	for (const raw of candidates) {
		if (typeof raw !== 'string') continue;
		const cleaned = raw
			.normalize('NFKD')
			.replace(/æ/gi, (m) => (m === 'Æ' ? 'Ae' : 'ae'))
			.replace(/ø/gi, (m) => (m === 'Ø' ? 'Oe' : 'oe'))
			.replace(/[̀-ͯ]/g, '') // accents: é -> e, å -> a
			.replace(/#\d+$/, '') // old Discord names: "jacob#1234"
			.replace(/[^a-zA-Z0-9_]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.slice(0, 30);
		if (cleaned.length >= 3) return cleaned;
	}
	return '';
}
