<script lang="ts">
	import { toastFormError } from "$lib/formErrors.svelte";
	import { enhance } from "$app/forms";
	import { MIN_PASSWORD_LENGTH } from "$lib/validation";
	import type { ActionData, PageData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();
	// Errors from submitting are shown as toasts, wherever the page is scrolled to
	toastFormError(() => form);

	let busy = $state<string | null>(null);
	let confirmText = $state("");

	/** Shows a spinner label on the form being submitted and keeps typed values after an error. */
	function submitting(section: string) {
		return () => {
			busy = section;
			return async ({
				update
			}: {
				update: (opts?: { reset?: boolean }) => Promise<void>;
			}) => {
				await update({ reset: section === "password" });
				busy = null;
			};
		};
	}

	const NAMES: Record<string, string> = {
		google: "Google",
		discord: "Discord"
	};
	const canDisconnect = $derived(data.loginCount > 1);

	const message = (section: string) =>
		form?.section === section ? form : null;
	const deleteReady = $derived(
		!!data.username &&
			confirmText.trim().toLowerCase() === data.username.toLowerCase()
	);
</script>

<svelte:head><title>Settings · Hear Me Out</title></svelte:head>

<p class="muted back"><a href="/me">← My page</a></p>
<h1>Settings</h1>

<section class="card setting">
	<h2>Username</h2>
	<p class="muted">Shown on your tier lists and templates.</p>
	<form
		method="POST"
		action="?/username"
		class="form"
		use:enhance={submitting("username")}
	>
		{#if message("username")?.success}<p class="form-success" role="status">
				{message("username")?.success}
			</p>{/if}
		<div class="field">
			<label for="username">Username</label>
			<input
				id="username"
				name="username"
				type="text"
				required
				minlength="3"
				maxlength="30"
				pattern="[a-zA-Z0-9_]+"
				autocomplete="nickname"
				value={message("username")?.username ?? data.username ?? ""}
			/>
			<small>Letters, numbers and underscores.</small>
		</div>
		<button class="btn" type="submit" disabled={busy === "username"}>
			{busy === "username" ? "Saving…" : "Save username"}
		</button>
	</form>
</section>

{#if data.logins.length}
	<section class="card setting">
		<h2>Login methods</h2>
		<p class="muted">
			Connect more ways to log in. They all open this same account, with your
			username, rankings and templates.
		</p>
		<ul class="logins">
			<li>
				<span class="login-name">Email and password</span>
				<span class="muted login-detail">
					{data.hasPassword
						? (data.email ?? "Connected")
						: "Set a password below to use it"}
				</span>
			</li>
			{#each data.logins as login (login.provider)}
				<li>
					<span class="login-name">{NAMES[login.provider]}</span>
					{#if login.connected}
						<span class="muted login-detail">{login.email ?? "Connected"}</span>
						<form
							method="POST"
							action="?/unlink"
							use:enhance={() => {
								busy = `unlink-${login.provider}`;
								return async ({ update }) => {
									await update();
									busy = null;
								};
							}}
						>
							<input type="hidden" name="provider" value={login.provider} />
							<button
								class="btn btn-secondary btn-small"
								type="submit"
								disabled={!canDisconnect || busy === `unlink-${login.provider}`}
								title={canDisconnect
									? undefined
									: "Your only login method can’t be removed"}
							>
								{busy === `unlink-${login.provider}`
									? "Disconnecting…"
									: "Disconnect"}
							</button>
						</form>
					{:else}
						<span class="muted login-detail">Not connected</span>
						<!-- A plain form: the server sends the user on to Google/Discord -->
						<form method="POST" action="/auth/link">
							<input type="hidden" name="provider" value={login.provider} />
							<button class="btn btn-small" type="submit">Connect</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
		{#if message("logins")?.success}<p class="form-success" role="status">
				{message("logins")?.success}
			</p>{/if}
	</section>
{/if}

<section class="card setting">
	<h2>Password</h2>
	{#if data.hasPassword}
		{#if data.email}<p class="muted">
				You log in as <strong>{data.email}</strong>.
			</p>{/if}
	{:else}
		<p class="muted">
			You signed up with Google or Discord. Set a password here if you also want
			to log in with
			{#if data.email}<strong>{data.email}</strong>{:else}your email{/if} and a password.
		</p>
	{/if}
	<form
		method="POST"
		action="?/password"
		class="form"
		use:enhance={submitting("password")}
	>
		{#if message("password")?.success}<p class="form-success" role="status">
				{message("password")?.success}
			</p>{/if}
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
				required
				minlength={MIN_PASSWORD_LENGTH}
				autocomplete="new-password"
			/>
			<small>At least {MIN_PASSWORD_LENGTH} characters.</small>
		</div>
		<div class="field">
			<label for="confirm">Repeat new password</label>
			<input
				id="confirm"
				name="confirm"
				type="password"
				required
				minlength={MIN_PASSWORD_LENGTH}
				autocomplete="new-password"
			/>
		</div>
		<button class="btn" type="submit" disabled={busy === "password"}>
			{busy === "password"
				? "Saving…"
				: data.hasPassword
					? "Change password"
					: "Set password"}
		</button>
	</form>
</section>

<section class="card setting danger">
	<h2>Delete account</h2>
	<p>This permanently deletes:</p>
	<ul>
		<li>your account and username,</li>
		<li>all your tier lists,</li>
		<li>
			all your templates and their pictures, <strong
				>including the rankings other people made of them</strong
			>.
		</li>
	</ul>
	<p class="muted">This can’t be undone.</p>
	<form
		method="POST"
		action="?/delete"
		class="form"
		use:enhance={({ cancel }) => {
			if (
				!confirm(
					"Delete your account and everything in it? This can’t be undone."
				)
			) {
				cancel();
				return;
			}
			return submitting("delete")();
		}}
	>
		<div class="field">
			<label for="delete-confirm"
				>Type <strong>{data.username}</strong> to confirm</label
			>
			<input
				id="delete-confirm"
				name="confirm"
				type="text"
				autocomplete="off"
				bind:value={confirmText}
			/>
		</div>
		<button
			class="btn btn-danger-solid"
			type="submit"
			disabled={!deleteReady || busy === "delete"}
		>
			{busy === "delete" ? "Deleting…" : "Delete my account"}
		</button>
	</form>
</section>

<style>
	.back {
		margin: 0 0 8px;
	}
	.setting {
		max-width: 640px;
		margin-top: 20px;
	}
	.setting h2 {
		margin: 0 0 4px;
		font-size: 1.25rem;
	}
	.setting > p {
		margin: 0 0 12px;
	}
	.setting .form {
		margin-top: 8px;
	}
	.setting .btn {
		justify-self: start;
	}
	.logins {
		list-style: none;
		margin: 12px 0 0;
		padding: 0;
	}
	.logins li {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 52px;
		padding: 8px 0;
		border-top: 1px solid var(--line);
	}
	.logins form {
		margin: 0 0 0 auto;
	}
	.setting .logins .btn {
		margin: 0;
	}
	.login-name {
		flex: none;
		width: 190px;
		font-weight: 600;
	}
	.login-detail {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.9375rem;
	}
	@media (max-width: 480px) {
		.login-name {
			width: auto;
		}
		.logins li {
			flex-wrap: wrap;
			row-gap: 2px;
		}
		.login-detail {
			order: 3;
			flex-basis: 100%;
		}
	}
	.danger {
		border-color: color-mix(in srgb, var(--danger) 45%, var(--line));
	}
	.danger h2 {
		color: var(--danger);
	}
	.danger ul {
		margin: 0 0 8px;
		padding-left: 20px;
	}
	.btn-danger-solid {
		background: var(--danger);
		border-color: var(--danger);
		color: #fff;
	}
</style>
