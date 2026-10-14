<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount, untrack } from 'svelte';
	import ExportImage from './ExportImage.svelte';
	import TierEditor from './TierEditor.svelte';
	import { clearRankDraft, saveRankDraft } from '$lib/drafts';
	import { LIST_VISIBILITY } from '$lib/visibility';
	import type { ExportOptions } from '$lib/exportImage';
	import type { ListVisibility, Placements, TemplateItem, Tier } from '$lib/types';

	let {
		items,
		tiers,
		placements = {},
		title = '',
		visibility = 'public',
		error = null,
		submitLabel = 'Save & get link',
		draftKey = null,
		exportInfo = null,
		guest = false,
		autoSubmit = false
	}: {
		items: TemplateItem[];
		tiers: Tier[];
		placements?: Placements;
		title?: string;
		visibility?: ListVisibility;
		error?: string | null;
		submitLabel?: string;
		/** Template id: keeps an unsaved draft of this ranking in the browser. */
		draftKey?: string | null;
		/** Shows "Save as image" for the ranking as it is right now. */
		exportInfo?: Pick<ExportOptions, 'author' | 'templateTitle' | 'link'> | null;
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
	let currentTiers = $state<Tier[]>(untrack(() => tiers));
	let currentPlacements = $state<Placements>(untrack(() => placements));

	function onEditorChange(t: Tier[], p: Placements) {
		currentTiers = t;
		currentPlacements = p;
	}

	// Keep the draft up to date. Skips the first run, so simply opening the page never
	// overwrites a draft that the page hasn't loaded yet.
	let firstRun = true;
	$effect(() => {
		const draft = {
			title: currentTitle,
			visibility: currentVisibility,
			tiers: currentTiers,
			placements: currentPlacements
		};
		if (firstRun) {
			firstRun = false;
			return;
		}
		if (draftKey) untrack(() => saveRankDraft(draftKey!, draft));
	});

	const exportOptions = $derived<ExportOptions | null>(
		exportInfo
			? {
					...exportInfo,
					title: currentTitle.trim() || exportInfo.templateTitle,
					tiers: currentTiers,
					placements: currentPlacements,
					items
				}
			: null
	);

	onMount(() => {
		if (autoSubmit) formEl?.requestSubmit();
	});
</script>

<form
	method="POST"
	bind:this={formEl}
	use:enhance={() => {
		submitting = true;
		return async ({ result, update }) => {
			// Saved for real: the draft isn't needed any more
			if (draftKey && result.type === 'redirect' && result.location.startsWith('/lists/')) {
				clearRankDraft(draftKey);
			}
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}

	<div class="meta-fields">
		<div class="field">
			<label for="list-title">Title</label>
			<input id="list-title" name="title" type="text" required maxlength="100" bind:value={currentTitle} />
		</div>
		<div class="field">
			<label for="visibility">Who can see it?</label>
			<select id="visibility" name="visibility" bind:value={currentVisibility}>
				{#each LIST_VISIBILITY as v (v.value)}<option value={v.value}>{v.label}</option>{/each}
			</select>
		</div>
	</div>

	<TierEditor {items} initialTiers={tiers} initialPlacements={placements} onchange={onEditorChange} />

	<div class="save-bar">
		{#if guest}
			<p class="muted guest-note">
				Log in or sign up to save it, get a link and count in the verdict. Your ranking is kept while you do.
			</p>
		{/if}
		<div class="save-actions">
			{#if exportOptions}<ExportImage options={exportOptions} />{/if}
			<button class="btn" type="submit" disabled={submitting}>
				{submitting ? (guest ? 'One moment…' : 'Saving…') : submitLabel}
			</button>
		</div>
	</div>
</form>

<style>
	.meta-fields {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 12px;
		margin-bottom: 20px;
	}
	.save-bar {
		position: sticky;
		bottom: 0;
		padding: 16px 0;
		margin-top: 16px;
		background: linear-gradient(to top, var(--bg) 70%, transparent);
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 12px 16px;
		flex-wrap: wrap;
	}
	.save-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: auto;
	}
	.guest-note {
		margin: 0;
		font-size: 0.875rem;
		flex: 1 1 260px;
	}
	@media (max-width: 640px) {
		.meta-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
