<script lang="ts">
	import { enhance } from "$app/forms";
	import { onMount, untrack } from "svelte";
	import BracketEditor from "./BracketEditor.svelte";
	import { champion, matches, type Picks, type Slot } from "$lib/bracket";
	import { clearRankDraft, saveRankDraft } from "$lib/drafts";
	import { showError, toastFailure } from "$lib/formErrors.svelte";
	import { LIST_VISIBILITY } from "$lib/visibility";
	import type { ListVisibility, TemplateItem } from "$lib/types";

	/**
	 * Filling out a tournament bracket and saving it (the bracket version of ListForm).
	 * Keeps a draft in the browser while you go, and works without an account until saving.
	 */
	let {
		items,
		seed,
		picks = null,
		title = "",
		visibility = "public",
		submitLabel = "Save & get link",
		draftKey = null,
		guest = false,
		autoSubmit = false
	}: {
		items: TemplateItem[];
		seed: Slot[];
		picks?: Picks | null;
		title?: string;
		visibility?: ListVisibility;
		submitLabel?: string;
		/** Template id: keeps an unsaved draft of this bracket in the browser. */
		draftKey?: string | null;
		/** Not logged in: saving sends them to log in first (the draft is kept meanwhile). */
		guest?: boolean;
		/** Submit straight away (used when coming back from logging in). */
		autoSubmit?: boolean;
	} = $props();

	let submitting = $state(false);
	let formEl = $state<HTMLFormElement>();

	// The form owns these after the first render
	let currentTitle = $state(untrack(() => title));
	let currentVisibility = $state<ListVisibility>(untrack(() => visibility));
	let currentPicks = $state.raw<Picks>(untrack(() => picks ?? []));

	const complete = $derived(
		currentPicks.length === seed.length - 1 &&
			matches(seed, currentPicks).every((m) => m.winner)
	);
	const winner = $derived(complete ? champion(currentPicks) : null);

	// Keep the draft up to date. Skips the first run, so simply opening the page never
	// overwrites a draft that the page hasn't loaded yet.
	let firstRun = true;
	$effect(() => {
		const draft = {
			title: currentTitle,
			visibility: currentVisibility,
			tiers: [],
			placements: {},
			picks: currentPicks
		};
		if (firstRun) {
			firstRun = false;
			return;
		}
		if (draftKey) untrack(() => saveRankDraft(draftKey!, draft));
	});

	onMount(() => {
		if (autoSubmit && complete) formEl?.requestSubmit();
	});
</script>

<form
	method="POST"
	bind:this={formEl}
	use:enhance={({ cancel }) => {
		if (!complete) {
			showError("Pick a winner in every match first.");
			cancel();
			return;
		}
		submitting = true;
		return async ({ result, update }) => {
			toastFailure(result);
			// Saved for real: the draft isn't needed any more
			if (
				draftKey &&
				result.type === "redirect" &&
				result.location.startsWith("/lists/")
			) {
				clearRankDraft(draftKey);
			}
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	<input type="hidden" name="picks" value={JSON.stringify(currentPicks)} />

	<BracketEditor
		{items}
		{seed}
		initialPicks={picks}
		onchange={(p) => (currentPicks = p)}
	/>

	<div class="meta-fields">
		<div class="field">
			<label for="bracket-title">Title</label>
			<input
				id="bracket-title"
				name="title"
				type="text"
				required
				maxlength="100"
				bind:value={currentTitle}
			/>
		</div>
		<div class="field">
			<label for="bracket-visibility">Who can see it?</label>
			<select
				id="bracket-visibility"
				name="visibility"
				bind:value={currentVisibility}
			>
				{#each LIST_VISIBILITY as v (v.value)}<option value={v.value}
						>{v.label}</option
					>{/each}
			</select>
		</div>
	</div>

	<div class="save-bar">
		<p class="muted note">
			{#if !complete}
				Pick a winner in every match to save your bracket.
			{:else if guest}
				Log in or sign up to save it and get a link. Your bracket is kept while
				you do.
			{:else if winner}
				Your champion is in. Save to get a link to share.
			{/if}
		</p>
		<button class="btn" type="submit" disabled={submitting || !complete}>
			{submitting ? (guest ? "One moment…" : "Saving…") : submitLabel}
		</button>
	</div>
</form>

<style>
	form {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
	}
	.meta-fields {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 12px;
	}
	.save-bar {
		position: sticky;
		bottom: 0;
		padding: 16px 0;
		background: linear-gradient(to top, var(--bg) 70%, transparent);
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 12px 16px;
		flex-wrap: wrap;
	}
	.note {
		margin: 0;
		font-size: 0.875rem;
		flex: 1 1 240px;
	}
	@media (max-width: 640px) {
		.meta-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
