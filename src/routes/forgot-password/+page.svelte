<script lang="ts">
	import { page } from "$app/state";
	import Turnstile, { captchaEnabled } from "$lib/components/Turnstile.svelte";
	import type { ActionData } from "./$types";

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
	let captchaToken = $state<string | null>(null);
	// Bound (not just value=…) so re-rendering on submit can't wipe what was typed
	// svelte-ignore state_referenced_locally
	let email = $state(form?.email ?? "");
</script>

<svelte:head><title>Forgot password · Hear Me Out</title></svelte:head>

<div class="auth">
	<h1>Forgot your password?</h1>

	{#if form?.sent}
		<p class="form-success" role="status">
			If <strong>{form.email}</strong> has an account, we’ve sent it a link to choose
			a new password. It can take a minute to arrive, so check your spam folder too.
		</p>
		<p class="muted"><a href="/login">Back to log in</a></p>
	{:else}
		<p class="muted">
			Enter the email you signed up with, and we’ll send you a link to choose a
			new one.
		</p>
		{#if page.url.searchParams.has("expired")}
			<p class="form-error">
				That reset link has expired or was already used. Request a new one
				below.
			</p>
		{/if}

		<form class="form" method="POST" onsubmit={() => (submitting = true)}>
			{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

			<div class="field">
				<label for="email">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="username"
					required
					bind:value={email}
				/>
			</div>

			<Turnstile bind:token={captchaToken} />

			<button
				class="btn"
				type="submit"
				disabled={submitting || (captchaEnabled && !captchaToken)}
			>
				{submitting ? "Sending…" : "Send reset link"}
			</button>
			<p class="muted"><a href="/login">Back to log in</a></p>
		</form>
	{/if}
</div>

<style>
	.auth {
		max-width: 420px;
		margin: 0 auto;
	}
</style>
