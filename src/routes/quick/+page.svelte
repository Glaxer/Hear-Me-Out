<script lang="ts">
	import { enhance } from "$app/forms";
	import { page } from "$app/state";
	import { onDestroy, onMount, tick } from "svelte";
	import ExportImage from "$lib/components/ExportImage.svelte";
	import ItemsEditor from "$lib/components/ItemsEditor.svelte";
	import SocialMeta from "$lib/components/SocialMeta.svelte";
	import TierEditor from "$lib/components/TierEditor.svelte";
	import { appendItemsToForm, MAX_ITEMS, type EditableItem } from "$lib/items";
	import {
		clearQuickDraft,
		loadQuickDraft,
		saveQuickDraft,
		type QuickDraft
	} from "$lib/quickDraft";
	import { defaultTiers } from "$lib/tiers";
	import type {
		ListVisibility,
		Placements,
		TemplateItem,
		Tier
	} from "$lib/types";
	import type { ActionData, PageData } from "./$types";

	/**
	 * Quick tier list: add pictures or text, rank them, save as an image. No account needed;
	 * everything stays in this browser until you save it with "Save & share".
	 */
	let { data, form }: { data: PageData; form: ActionData } = $props();

	let phase = $state<"loading" | "choose" | "edit">("loading");
	let found = $state.raw<QuickDraft | null>(null); // an unfinished list, waiting for "Continue / Start over"

	let title = $state("");
	let visibility = $state<ListVisibility>("unlisted");
	// Replaced as a whole on every change (never mutated), so plain values are enough
	let tiers = $state.raw<Tier[]>(defaultTiers());
	let placements = $state.raw<Placements>({});
	let items = $state<EditableItem[]>([]);
	let mode = $state<"items" | "rank">("items");
	/** Changes each time the ranking board opens, so it starts from the current state. */
	let boardKey = $state(0);

	let formEl = $state<HTMLFormElement>();
	let submitting = $state(false);
	let status = $state<string | null>(null);
	let clientError = $state<string | null>(null);

	const defaultTitle = $derived(
		data.username ? `${data.username}’s tier list` : "My tier list"
	);

	// ---------- Draft: load, continue, start over ----------

	function restore(draft: QuickDraft) {
		title = draft.title;
		visibility = draft.visibility;
		tiers = draft.tiers;
		placements = draft.placements;
		items = draft.items.map((i) => ({
			key: i.key,
			id: null,
			label: i.label,
			imagePath: null,
			fullImagePath: null,
			blob: i.thumb,
			fullBlob: i.full,
			preview: i.thumb ? URL.createObjectURL(i.thumb) : null
		}));
		mode = items.length >= 2 ? "rank" : "items";
		boardKey++;
		phase = "edit";
	}

	function startFresh() {
		releasePreviews();
		title = defaultTitle;
		visibility = "unlisted";
		tiers = defaultTiers();
		placements = {};
		items = [];
		mode = "items";
		phase = "edit";
	}

	async function startOver() {
		if (!confirm("Start over? This deletes your unfinished tier list.")) return;
		await clearQuickDraft();
		found = null;
		startFresh();
	}

	onMount(async () => {
		const draft = await loadQuickDraft();
		const resume = page.url.searchParams.get("resume") === "1";
		if (draft && resume && data.user) {
			// Back from logging in after pressing "Save & share": finish saving straight away
			if (draft.title === "My tier list") draft.title = defaultTitle;
			restore(draft);
			await tick();
			formEl?.requestSubmit();
		} else if (draft && draft.items.length) {
			found = draft;
			phase = "choose";
		} else {
			startFresh();
		}
	});

	function releasePreviews() {
		for (const item of items)
			if (item.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview);
	}
	onDestroy(releasePreviews);

	// Keep the draft in the browser (shortly after each change, not on every keystroke)
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	function snapshot(): Omit<QuickDraft, "updatedAt"> {
		return {
			title,
			visibility,
			tiers,
			placements,
			items: items.map((i) => ({
				key: i.key,
				label: i.label,
				thumb: i.blob,
				full: i.fullBlob
			}))
		};
	}
	$effect(() => {
		if (phase !== "edit") return;
		// Read everything that should trigger a save
		void [title, visibility, JSON.stringify(tiers), JSON.stringify(placements)];
		void items.map((i) => [i.key, i.label, i.blob]);
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => saveQuickDraft(snapshot()), 400);
	});

	// ---------- Ranking ----------

	/** The items in the shape the ranking board expects (pictures shown straight from the browser). */
	const boardItems = $derived<TemplateItem[]>(
		items.map((i, position) => ({
			id: i.key,
			label: i.label || "Untitled",
			image_path: i.preview,
			position
		}))
	);

	/** Drops placed items that were removed meanwhile. */
	function cleanPlacements(): Placements {
		const keys = new Set(items.map((i) => i.key));
		return Object.fromEntries(
			tiers.map((t) => [
				t.id,
				(placements[t.id] ?? []).filter((k) => keys.has(k))
			])
		);
	}

	function goRank() {
		clientError = null;
		if (items.length < 2) {
			clientError = "Add at least two items first.";
			return;
		}
		if (items.some((i) => !i.label.trim())) {
			clientError = "Every item needs a name.";
			return;
		}
		placements = cleanPlacements();
		boardKey++;
		mode = "rank";
		window.scrollTo({ top: 0 });
	}

	function onBoardChange(t: Tier[], p: Placements) {
		tiers = t;
		placements = p;
	}

	const exportOptions = $derived({
		title: title.trim() || defaultTitle,
		author: data.username ?? "",
		templateTitle: "", // a quick list has no separate template to mention
		tiers,
		placements,
		items: boardItems,
		link: page.url.host
	});
</script>

<SocialMeta
	title="Make a quick tier list"
	description="Drop in some pictures or names, rank them, and save it as an image. No account needed."
/>

<div class="head">
	<div>
		<h1>Quick tier list</h1>
		<p class="muted lead">
			{#if data.user}
				Add pictures or names, rank them, and save it to get a link.
			{:else}
				Add pictures or names, rank them, and save it as an image. No account
				needed.
			{/if}
		</p>
	</div>
	{#if phase === "edit" && items.length}
		<button type="button" class="link-button muted" onclick={startOver}
			>Start over</button
		>
	{/if}
</div>

{#if phase === "loading"}
	<p class="muted">Loading…</p>
{:else if phase === "choose" && found}
	<div class="card resume">
		<h2>You have an unfinished tier list</h2>
		<p class="muted">
			<strong>{found.title || "Untitled"}</strong> · {found.items.length} items. It’s
			saved in this browser only.
		</p>
		<div class="row">
			<button type="button" class="btn" onclick={() => found && restore(found)}
				>Continue</button
			>
			<button type="button" class="btn btn-secondary" onclick={startOver}
				>Start over</button
			>
		</div>
	</div>
{:else}
	<ol class="steps" aria-label="Steps">
		<li class:current={mode === "items"}>
			<button
				type="button"
				class="step-button"
				onclick={() => (mode = "items")}
				disabled={submitting}>1. Add items</button
			>
		</li>
		<li class:current={mode === "rank"}>
			<button
				type="button"
				class="step-button"
				onclick={goRank}
				disabled={submitting}>2. Rank them</button
			>
		</li>
	</ol>

	{#if clientError}<p class="form-error" role="alert">{clientError}</p>{/if}
	{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

	{#if mode === "items"}
		<ItemsEditor bind:items />
		<div class="save-bar">
			<span class="muted"
				>{items.length < 2
					? "Add at least two items to rank them."
					: `${items.length} items, up to ${MAX_ITEMS}.`}</span
			>
			<button
				type="button"
				class="btn"
				onclick={goRank}
				disabled={items.length < 2}>Rank them →</button
			>
		</div>
	{:else}
		<form
			method="POST"
			bind:this={formEl}
			use:enhance={async ({ formData, cancel }) => {
				clientError = null;
				submitting = true;
				// Make sure the latest version is kept, e.g. while logging in
				clearTimeout(saveTimer);
				await saveQuickDraft(snapshot());

				if (data.user) {
					try {
						await appendItemsToForm(
							formData,
							items,
							data.user.id,
							(done, total) => {
								status = `Uploading pictures… ${done + 1}/${total}`;
							}
						);
					} catch (err) {
						clientError = `Picture upload failed: ${err instanceof Error ? err.message : "unknown error"}`;
						submitting = false;
						status = null;
						cancel();
						return;
					}
					for (const item of items) formData.append("item_key", item.key);
					status = "Saving…";
				}

				return async ({ result, update }) => {
					if (
						result.type === "redirect" &&
						result.location.startsWith("/lists/")
					)
						await clearQuickDraft();
					await update({ reset: false });
					submitting = false;
					status = null;
				};
			}}
		>
			<div class="meta-fields">
				<div class="field">
					<label for="quick-title">Title</label>
					<input
						id="quick-title"
						name="title"
						type="text"
						required
						maxlength="100"
						bind:value={title}
					/>
				</div>
				{#if data.user}
					<div class="field">
						<label for="quick-visibility">Who can see it?</label>
						<select
							id="quick-visibility"
							name="list_visibility"
							bind:value={visibility}
						>
							<option value="unlisted">Only people with the link</option>
							<option value="private">Only me</option>
						</select>
					</div>
				{/if}
			</div>

			{#key boardKey}
				<TierEditor
					items={boardItems}
					initialTiers={tiers}
					initialPlacements={placements}
					onchange={onBoardChange}
				/>
			{/key}

			<div class="save-bar">
				{#if !data.user}
					<p class="muted note">
						Want a link to share instead? Log in or sign up to save it. Your
						list is kept while you do.
					</p>
				{/if}
				<div class="save-actions">
					<ExportImage options={exportOptions} />
					<button class="btn" type="submit" disabled={submitting}>
						{status ??
							(submitting
								? "One moment…"
								: data.user
									? "Save & get link"
									: "Save & share")}
					</button>
				</div>
			</div>
		</form>
	{/if}
{/if}

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
	}
	.head h1 {
		margin-bottom: 4px;
	}
	.lead {
		margin: 0 0 16px;
	}
	.resume {
		max-width: 560px;
	}
	.resume h2 {
		margin: 0 0 6px;
		font-size: 1.25rem;
	}
	.steps {
		list-style: none;
		display: flex;
		gap: 8px;
		margin: 0 0 20px;
		padding: 0;
	}
	.step-button {
		font: inherit;
		font-weight: 600;
		padding: 6px 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--ink-soft);
		cursor: pointer;
	}
	.current .step-button {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--bg);
	}
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
		justify-content: space-between;
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
	.note {
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
