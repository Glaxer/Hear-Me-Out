<script lang="ts">
	import { enhance } from "$app/forms";
	import { onMount, untrack } from "svelte";
	import BlindEditor from "./BlindEditor.svelte";
	import ExportImage from "./ExportImage.svelte";
	import type { ExportOptions } from "$lib/exportImage";
	import { isDone, skippedItems, type BlindState } from "$lib/blind";
	import { clearRankDraft, saveRankDraft } from "$lib/drafts";
	import { showError, toastFailure } from "$lib/formErrors.svelte";
	import { LIST_VISIBILITY } from "$lib/visibility";
	import type { ListVisibility, TemplateItem } from "$lib/types";

	/**
	 * Filling out a blind ranking and saving it (the blind version of ListForm).
	 * Keeps a draft in the browser while you go, including the order the items are shown in,
	 * so a refresh doesn't deal a new order. Works without an account until saving.
	 */
	let {
		items,
		shuffled,
		blind = null,
		title = "",
		visibility = "public",
		submitLabel = "Save & get link",
		draftKey = null,
		guest = false,
		autoSubmit = false,
		exportInfo = null
	}: {
		items: TemplateItem[];
		/** Deal the items in a random order (the template's order setting). */
		shuffled: boolean;
		/** A ranking in progress, from a draft. */
		blind?: BlindState | null;
		title?: string;
		visibility?: ListVisibility;
		submitLabel?: string;
		/** Template id: keeps an unsaved draft of this ranking in the browser. */
		draftKey?: string | null;
		/** Not logged in: saving sends them to log in first (the draft is kept meanwhile). */
		guest?: boolean;
		/** Submit straight away (used when coming back from logging in). */
		autoSubmit?: boolean;
		/** Shows "Share" (copy or download a picture of the top list). */
		exportInfo?: Pick<
			ExportOptions,
			"author" | "templateTitle" | "link"
		> | null;
	} = $props();

	let submitting = $state(false);
	let formEl = $state<HTMLFormElement>();

	// The form owns these after the first render
	let currentTitle = $state(untrack(() => title));
	let currentVisibility = $state<ListVisibility>(untrack(() => visibility));
	let ranking = $state.raw<BlindState | null>(untrack(() => blind));

	const complete = $derived(!!ranking && isDone(ranking));
	const exportOptions = $derived<ExportOptions | null>(
		exportInfo && ranking
			? {
					...exportInfo,
					title: currentTitle.trim() || exportInfo.templateTitle,
					tiers: [],
					placements: {},
					items,
					blind: {
						slots: ranking.slots,
						skipped: complete ? skippedItems(ranking.order, ranking.slots) : []
					}
				}
			: null
	);

	// Keep the draft up to date. Skips the first run, so simply opening the page never
	// overwrites a draft that the page hasn't loaded yet.
	let firstRun = true;
	$effect(() => {
		const draft = {
			title: currentTitle,
			visibility: currentVisibility,
			tiers: [],
			placements: {},
			blind: ranking
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
			showError("Fill every spot first.");
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
	<input
		type="hidden"
		name="picks"
		value={JSON.stringify(ranking?.slots ?? [])}
	/>

	<BlindEditor
		{items}
		{shuffled}
		initial={blind}
		onchange={(s) => (ranking = s)}
	/>

	{#if complete}
		<div class="meta-fields">
			<div class="field">
				<label for="blind-title">Title</label>
				<input
					id="blind-title"
					name="title"
					type="text"
					required
					maxlength="100"
					bind:value={currentTitle}
				/>
			</div>
			<div class="field">
				<label for="blind-visibility">Who can see it?</label>
				<select
					id="blind-visibility"
					name="visibility"
					bind:value={currentVisibility}
				>
					{#each LIST_VISIBILITY as v (v.value)}<option value={v.value}
							>{v.label}</option
						>{/each}
				</select>
			</div>
		</div>
	{:else}
		<input type="hidden" name="title" value={currentTitle} />
		<input type="hidden" name="visibility" value={currentVisibility} />
	{/if}

	{#if ranking}
		<div class="save-bar">
			<p class="muted note">
				{#if !complete}
					Fill every spot to save your ranking.
				{:else if guest}
					Log in or sign up to save it and get a link. Your ranking is kept
					while you do.
				{:else}
					Done! Save to get a link to share.
				{/if}
			</p>
			{#if exportOptions && complete}<ExportImage
					options={exportOptions}
					noLinkHint="Save your blind ranking to get a link to share."
				/>{/if}
			<button class="btn" type="submit" disabled={submitting || !complete}>
				{submitting ? (guest ? "One moment…" : "Saving…") : submitLabel}
			</button>
		</div>
	{/if}
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
		/* Above the item cards' number badges and tier labels while scrolling */
		z-index: 5;
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
