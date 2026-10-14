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

	// Where to go after signing up, e.g. back to a ranking that's waiting to be saved
	const redirectTo = $derived(page.url.searchParams.get('redirectTo'));
	const action = $derived(redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '');
</script>

<svelte:head><title>Sign up · Hear Me Out</title></svelte:head>

<div class="auth">
	<h1>Create an account</h1>
	{#if redirectTo?.includes('/rank')}
		<p class="muted">Sign up to save your ranking. Don’t worry, it’s kept while you do.</p>
	{:else if redirectTo}
		<p class="muted">Sign up to continue.</p>
	{/if}

	{#if form?.checkEmail}
		<p class="form-success">
			Almost there! We sent a confirmation link to <strong>{form.email}</strong>. Click it to
			finish signing up. You’ll be logged in straight away.
		</p>
	{:else}
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
				<label for="username">Username</label>
				<input
					id="username"
					name="username"
					type="text"
					autocomplete="username"
					required
					minlength="3"
					maxlength="30"
					pattern="[a-zA-Z0-9_]+"
					value={form?.username ?? ''}
				/>
				<small>Shown on your tier lists. Letters, numbers and underscores.</small>
			</div>

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
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="new-password"
					required
					minlength="8"
				/>
				<small>At least 8 characters.</small>
			</div>

			<Turnstile bind:this={turnstile} bind:token={captchaToken} />

			<button class="btn" type="submit" disabled={submitting || (captchaEnabled && !captchaToken)}>
				{submitting ? 'Creating account…' : 'Sign up'}
			</button>
			<p class="muted small">
				By signing up (also with Google or Discord) you agree to us storing your email, username and what you create, as described in
				the <a href="/privacy">privacy page</a>.
			</p>
			<p class="muted">Already have an account? <a href="/login{action}">Log in</a></p>
		</form>
	{/if}
</div>

<style>
	.auth {
		max-width: 420px;
		margin: 0 auto;
	}
	.small {
		font-size: 0.875rem;
		margin: 0;
	}
</style>
