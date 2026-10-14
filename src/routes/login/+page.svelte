<script lang="ts">
	import { enhance } from '$app/forms';
	import OAuthButtons from '$lib/components/OAuthButtons.svelte';
	import Turnstile, { captchaEnabled } from '$lib/components/Turnstile.svelte';
	import { page } from '$app/state';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);
	let captchaToken = $state<string | null>(null);
	let turnstile = $state<Turnstile>();

	const redirectTo = $derived(page.url.searchParams.get('redirectTo'));
	const action = $derived(redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '');
</script>

<svelte:head><title>Log in · Hear Me Out</title></svelte:head>

<div class="auth">
	<h1>Log in</h1>
	{#if redirectTo}<p class="muted">Log in to continue.</p>{/if}
	{#if page.url.searchParams.has('confirmError')}
		<p class="form-error">That confirmation link didn’t work or has expired. Try logging in, or sign up again.</p>
	{/if}
	{#if page.url.searchParams.has('oauthError')}
		<p class="form-error">That didn’t work, or the login was cancelled. Please try again.</p>
	{/if}

	<OAuthButtons providers={data.providers} {redirectTo} />

	<form
		class="form"
		method="POST"
		{action}
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
				turnstile?.reset(); // each check can only be used once
			};
		}}
	>
		{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

		<div class="field">
			<label for="email">Email</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				value={form?.email ?? ''}
			/>
		</div>

		<div class="field">
			<label for="password">Password</label>
			<input id="password" name="password" type="password" autocomplete="current-password" required />
		</div>

		<Turnstile bind:this={turnstile} bind:token={captchaToken} />

		<button class="btn" type="submit" disabled={submitting || (captchaEnabled && !captchaToken)}>
			{submitting ? 'Logging in…' : 'Log in'}
		</button>
		<p class="muted">New here? <a href="/signup">Create an account</a></p>
	</form>
</div>

<style>
	.auth {
		max-width: 420px;
		margin: 0 auto;
	}
</style>
