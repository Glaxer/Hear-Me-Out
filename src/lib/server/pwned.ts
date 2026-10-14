export const PWNED_MESSAGE =
	'This password has appeared in a data breach, so it’s easy for others to guess. Please pick a different one.';

/**
 * Checks a password against Have I Been Pwned's list of passwords from known data breaches.
 * Only the first 5 characters of the password's SHA-1 hash are sent ("k-anonymity"), so the
 * service never learns the password. If the service can't be reached, the password is allowed:
 * this check is an extra, not something that should stop people from signing up.
 */
export async function isPwnedPassword(password: string, fetchFn: typeof fetch = fetch): Promise<boolean> {
	// Web Crypto: built into Node and browsers, so no import or extra types are needed
	const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
	const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
		.join('')
		.toUpperCase();
	const prefix = hash.slice(0, 5);
	const suffix = hash.slice(5);

	try {
		const res = await fetchFn(`https://api.pwnedpasswords.com/range/${prefix}`, {
			// Padding hides how many matches there are, so the response size gives nothing away
			headers: { 'Add-Padding': 'true', 'User-Agent': 'hear-me-out' },
			signal: AbortSignal.timeout(3000)
		});
		if (!res.ok) return false;

		// Each line is "<rest of hash>:<times seen>"; padding lines have a count of 0
		for (const line of (await res.text()).split('\n')) {
			const [rest, count] = line.trim().split(':');
			if (rest === suffix && Number(count) > 0) return true;
		}
		return false;
	} catch {
		return false;
	}
}