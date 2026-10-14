<script lang="ts">
	import { MIN_PASSWORD_LENGTH } from "$lib/validation";
	import type { ActionData, PageData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);
</script>

<svelte:head><title>Choose a new password · Hear Me Out</title></svelte:head>

<div class="auth">
	<h1>Choose a new password</h1>
	<p class="muted">
		You’re almost back in. Pick a new password for your account.
	</p>

	<form class="form" method="POST" onsubmit={() => (submitting = true)}>
		{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

		<!-- Helps password managers save the new password for the right account -->
		<input
			type="text"
			name="email"
			autocomplete="username"
			value={data.email ?? ""}
			hidden
			readonly
		/>

		<div class="field">
			<label for="password">New password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="new-password"
				required
				minlength={MIN_PASSWORD_LENGTH}
			/>
			<small>At least {MIN_PASSWORD_LENGTH} characters.</small>
		</div>
		<div class="field">
			<label for="confirm">Repeat new password</label>
			<input
				id="confirm"
				name="confirm"
				type="password"
				autocomplete="new-password"
				required
				minlength={MIN_PASSWORD_LENGTH}
			/>
		</div>

		<button class="btn" type="submit" disabled={submitting}>
			{submitting ? "Saving…" : "Save new password"}
		</button>
	</form>
</div>

<style>
	.auth {
		max-width: 420px;
		margin: 0 auto;
	}
</style>
