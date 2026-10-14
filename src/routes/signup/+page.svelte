<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
</script>

<svelte:head><title>Sign up · Hear Me Out</title></svelte:head>

<div class="auth">
	<h1>Create an account</h1>

	{#if form?.checkEmail}
		<p class="form-success">
			Almost there! We sent a confirmation link to <strong>{form.email}</strong>. Click it to
			finish signing up. You’ll be logged in straight away.
		</p>
	{:else}
		<form
			class="form"
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update({ reset: false });
					submitting = false;
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

			<button class="btn" type="submit" disabled={submitting}>
				{submitting ? 'Creating account…' : 'Sign up'}
			</button>
			<p class="muted">Already have an account? <a href="/login">Log in</a></p>
		</form>
	{/if}
</div>

<style>
	.auth {
		max-width: 420px;
		margin: 0 auto;
	}
</style>
