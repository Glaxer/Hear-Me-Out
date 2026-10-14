<script lang="ts">
	/**
	 * "Continue with Google / Discord" buttons for the login and sign-up pages.
	 * Each is a plain form (no JavaScript needed) that posts to /auth/oauth, which sends the
	 * user on to the provider. Only providers switched on in Supabase are passed in.
	 */
	let {
		providers,
		redirectTo = null
	}: { providers: string[]; redirectTo?: string | null } = $props();

	const NAMES: Record<string, string> = { google: 'Google', discord: 'Discord' };
</script>

{#if providers.length}
	<div class="oauth">
		{#each providers as provider (provider)}
			<form method="POST" action="/auth/oauth">
				<input type="hidden" name="provider" value={provider} />
				{#if redirectTo}<input type="hidden" name="redirectTo" value={redirectTo} />{/if}
				<button class="btn btn-secondary oauth-button {provider}" type="submit">
					Continue with {NAMES[provider] ?? provider}
				</button>
			</form>
		{/each}
	</div>
	<p class="divider" aria-hidden="true"><span>or with email</span></p>
{/if}

<style>
	.oauth {
		display: grid;
		gap: 8px;
		margin-bottom: 4px;
	}
	.oauth form {
		margin: 0;
	}
	.oauth-button {
		width: 100%;
		justify-content: center;
	}
	.divider {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 16px 0;
		color: var(--ink-soft);
		font-size: 0.875rem;
	}
	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--line);
	}
</style>
