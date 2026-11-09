<script lang="ts">
	import { enhance } from "$app/forms";
	import { page } from "$app/state";
	import { onDestroy, onMount, tick } from "svelte";
	import BracketEditor from "$lib/components/BracketEditor.svelte";
	import ExportImage from "$lib/components/ExportImage.svelte";
	import ItemsEditor from "$lib/components/ItemsEditor.svelte";
	import SocialMeta from "$lib/components/SocialMeta.svelte";
	import TierControls from "$lib/components/TierControls.svelte";
	import TierEditor from "$lib/components/TierEditor.svelte";
	import { showError, toastFormError } from "$lib/formErrors.svelte";
	import { appendItemsToForm, MAX_ITEMS, type EditableItem } from "$lib/items";
	import {
		buildSeed,
		byeCount,
		emptyPicks,
		matches,
		MAX_BRACKET_ITEMS,
		seedMatchesItems,
		type BracketOrder,
		type Picks,
		type Slot
	} from "$lib/bracket";
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
		TemplateFormat,
		TemplateItem,
		Tier
	} from "$lib/types";
	import type { ActionData, PageData } from "./$types";

	/**
	 * Quick tier list or bracket, in two steps:
	 * 1. Setup: the format, the tiers (or bracket order) and items, like the template form.
	 * 2. Rank: the board or the match-by-match picker, with "Share" (picture) and
	 *    "Save & share" (link).
	 * No account needed; everything stays in this browser until it's saved.
	 */
	let { data, form }: { data: PageData; form: ActionData } = $props();
	toastFormError(() => form);

	let phase = $state<"loading" | "choose" | "edit">("loading");
	let found = $state.raw<QuickDraft | null>(null); // an unfinished list, waiting for "Continue / Start over"

	let title = $state("");
	let visibility = $state<ListVisibility>("unlisted");
	// Edited in place by the tier settings in the setup step
	let tiers = $state<Tier[]>(defaultTiers());
	// Replaced as a whole on every change (never mutated), so a plain value is enough
	let placements = $state.raw<Placements>({});
	let items = $state<EditableItem[]>([]);
	let mode = $state<"setup" | "rank">("setup");
	// Brackets: the first round (with item keys) is built when going to rank, then kept
	let format = $state<TemplateFormat>("tier_list");
	let bracketOrder = $state<BracketOrder>("shuffled");
	let seed = $state.raw<Slot[] | null>(null);
	let picks = $state.raw<Picks>([]);
	const isBracket = $derived(format === "bracket");
	const maxItems = $derived(isBracket ? MAX_BRACKET_ITEMS : MAX_ITEMS);
	const byes = $derived(byeCount(items.length));
	const bracketDone = $derived(
		!!seed &&
			picks.length === seed.length - 1 &&
			matches(seed, picks).every((m) => m.winner)
	);
	/** Changes each time the ranking board opens, so it starts from the current state. */
	let boardKey = $state(0);

	let formEl = $state<HTMLFormElement>();
	let submitting = $state(false);
	let status = $state<string | null>(null);

	const nounFor = (f: TemplateFormat | undefined) =>
		f === "bracket" ? "bracket" : "tier list";
	const titleFor = (f: TemplateFormat) =>
		data.username ? `${data.username}’s ${nounFor(f)}` : `My ${nounFor(f)}`;
	const defaultTitle = $derived(titleFor(format));
	/** Switching format swaps the title too, as long as it's still the suggested one. */
	function setFormat(next: TemplateFormat) {
		if (title === titleFor(format)) title = titleFor(next);
		format = next;
	}

	// ---------- Draft: load, continue, start over ----------

	function restore(draft: QuickDraft) {
		title = draft.title;
		visibility = draft.visibility;
		tiers = draft.tiers;
		placements = draft.placements;
		format = draft.format ?? "tier_list";
		bracketOrder = draft.bracketOrder ?? "shuffled";
		seed = draft.seed ?? null;
		picks = draft.picks ?? [];
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
		mode = items.length >= 2 ? "rank" : "setup";
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
		format = "tier_list";
		bracketOrder = "shuffled";
		seed = null;
		picks = [];
		mode = "setup";
		phase = "edit";
	}

	async function startOver() {
		// While choosing, the draft's format isn't loaded yet
		const noun = nounFor(phase === "choose" ? found?.format : format);
		if (!confirm(`Start over? This deletes your unfinished ${noun}.`)) return;
		await clearQuickDraft();
		found = null;
		startFresh();
	}

	onMount(async () => {
		const draft = await loadQuickDraft();
		const resume = page.url.searchParams.get("resume") === "1";
		if (draft && resume && data.user) {
			// Back from logging in after pressing "Save & share": finish saving straight away
			if (draft.title === "My tier list" || draft.title === "My bracket")
				draft.title = titleFor(draft.format ?? "tier_list");
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
			// Plain copy: browser storage can't store Svelte's live state objects
			tiers: $state.snapshot(tiers) as Tier[],
			placements,
			items: items.map((i) => ({
				key: i.key,
				label: i.label,
				thumb: i.blob,
				full: i.fullBlob
			})),
			format,
			bracketOrder,
			seed,
			picks
		};
	}
	$effect(() => {
		if (phase !== "edit") return;
		// Read everything that should trigger a save
		void [title, visibility, JSON.stringify(tiers), JSON.stringify(placements)];
		void [format, bracketOrder, seed, picks];
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

	/** Drops placements for items or tiers that were removed during setup. */
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
		if (items.length < 2) return showError("Add at least two items first.");
		if (items.some((i) => !i.label.trim()))
			return showError("Every item needs a name.");
		if (isBracket) {
			if (items.length > MAX_BRACKET_ITEMS)
				return showError(
					`A tournament bracket can have at most ${MAX_BRACKET_ITEMS} items.`
				);
			// Build the bracket if there's none yet, or the items or order changed
			const keys = items.map((i) => i.key);
			const fits =
				bracketOrder === "ordered"
					? JSON.stringify(seed) === JSON.stringify(buildSeed(keys, "ordered"))
					: seedMatchesItems(seed, keys);
			if (!fits) {
				seed = buildSeed(keys, bracketOrder);
				picks = emptyPicks(seed);
			}
		} else if (tiers.some((t) => !t.label.trim()))
			return showError("Every tier needs a name.");
		placements = cleanPlacements();
		boardKey++;
		mode = "rank";
		window.scrollTo({ top: 0 });
	}

	function backToSetup() {
		mode = "setup";
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
		link: page.url.host,
		bracket: isBracket && seed ? { seed, picks } : undefined
	});
</script>

<SocialMeta
	title="Make a quick tier list"
	description="Drop in some pictures or names, rank them, and save it as an image. No account needed."
/>

<div class="head">
	<div>
		<h1>{isBracket ? "Quick bracket" : "Quick tier list"}</h1>
		<p class="muted lead">
			{#if mode === "rank" && isBracket}
				Pick the winner of each match.
				{data.user
					? "Save it to get a link."
					: "Save it as an image, no account needed."}
			{:else if mode === "rank"}
				Drag the items into the tiers.
				{data.user
					? "Save it to get a link."
					: "Save it as an image, no account needed."}
			{:else}
				Pick a format and add the pictures or names you want to rank.
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
		<h2>You have an unfinished {nounFor(found.format)}</h2>
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
	{#if mode === "setup"}
		<div class="setup">
			<fieldset class="field">
				<legend class="field-label">Format</legend>
				<div class="formats">
					{#each [{ value: "tier_list", label: "Tier list", hint: "Sort the items into tiers, from S to D." }, { value: "bracket", label: "Tournament bracket", hint: "Items face off two at a time until one winner is left." }] as f (f.value)}
						<label class="option" class:chosen={format === f.value}>
							<input
								type="radio"
								name="quick_format"
								value={f.value}
								checked={format === f.value}
								onchange={() => setFormat(f.value as TemplateFormat)}
							/>
							<span class="option-text">
								<strong>{f.label}</strong>
								<span class="muted">{f.hint}</span>
							</span>
						</label>
					{/each}
				</div>
			</fieldset>

			{#if isBracket}
				<fieldset class="field">
					<legend class="field-label">Bracket</legend>
					<div class="orders">
						<label class="option">
							<input
								type="radio"
								name="quick_order"
								value="shuffled"
								bind:group={bracketOrder}
							/>
							<span class="option-text"
								><strong>Shuffle</strong>
								<span class="muted"
									>A random first round. With an uneven number of items, random
									items skip the first round (a bye).</span
								></span
							>
						</label>
						<label class="option">
							<input
								type="radio"
								name="quick_order"
								value="ordered"
								bind:group={bracketOrder}
							/>
							<span class="option-text"
								><strong>In the order added</strong>
								<span class="muted"
									>Matches follow the list. The first items skip the first round
									if needed, so put your favourites first.</span
								></span
							>
						</label>
					</div>
					{#if items.length >= 2}
						<p class="muted bye-note">
							{#if byes === 0}
								{items.length} items: everyone plays in the first round.
							{:else}
								{items.length} items: {byes}
								{byes === 1 ? "item skips" : "items skip"} the first round ({bracketOrder ===
								"ordered"
									? `the first ${byes === 1 ? "one" : byes} in the list`
									: "picked at random"}).
							{/if}
						</p>
					{/if}
				</fieldset>
			{:else}
				<fieldset class="field">
					<legend class="field-label">Tiers</legend>
					<small
						>Rename, recolour or reorder them. You can still change them while
						ranking.</small
					>
					<TierControls bind:tiers />
				</fieldset>
			{/if}

			<ItemsEditor bind:items max={maxItems} />
		</div>

		<div class="save-bar">
			<span class="muted"
				>{items.length < 2
					? "Add at least two items to rank them."
					: `${items.length} items, up to ${maxItems}.`}</span
			>
			<button
				type="button"
				class="btn"
				onclick={goRank}
				disabled={items.length < 2}>Go to rank →</button
			>
		</div>
	{:else}
		<p class="back">
			<button
				type="button"
				class="link-button muted"
				onclick={backToSetup}
				disabled={submitting}>← Back to setup</button
			>
		</p>

		<form
			method="POST"
			bind:this={formEl}
			use:enhance={async ({ formData, cancel }) => {
				if (isBracket && !bracketDone) {
					showError("Pick a winner in every match first.");
					cancel();
					return;
				}
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
						showError(
							`Picture upload failed: ${err instanceof Error ? err.message : "unknown error"}`
						);
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

			<input type="hidden" name="format" value={format} />
			{#if isBracket && seed}
				<input type="hidden" name="bracket_order" value={bracketOrder} />
				<input type="hidden" name="bracket_seed" value={JSON.stringify(seed)} />
				<input type="hidden" name="picks" value={JSON.stringify(picks)} />
				<input type="hidden" name="tiers" value={JSON.stringify(tiers)} />
				{#key boardKey}
					<BracketEditor
						items={boardItems}
						{seed}
						initialPicks={picks}
						onchange={(p) => (picks = p)}
					/>
				{/key}
			{:else}
				{#key boardKey}
					<TierEditor
						items={boardItems}
						initialTiers={tiers}
						initialPlacements={placements}
						onchange={onBoardChange}
					/>
				{/key}
			{/if}

			<div class="save-bar">
				{#if !data.user}
					<p class="muted note">
						Want a link to share instead? Log in or sign up to save it. Your
						{nounFor(format)} is kept while you do.
					</p>
				{/if}
				<div class="save-actions">
					<ExportImage
						options={exportOptions}
						noLinkHint={isBracket
							? "Save your bracket to get a link to share."
							: "Save your tier list to get a link to share."}
					/>
					<button
						class="btn"
						type="submit"
						disabled={submitting || (isBracket && !bracketDone)}
					>
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
	.formats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.orders {
		display: grid;
		gap: 8px;
	}
	.option {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		padding: 12px 14px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
		background: var(--surface);
		cursor: pointer;
	}
	.option.chosen {
		border-color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--ink);
	}
	.option input {
		margin-top: 3px;
		accent-color: var(--accent);
	}
	.option-text {
		display: grid;
		gap: 2px;
	}
	.option-text .muted,
	.bye-note {
		font-size: 0.875rem;
	}
	.bye-note {
		margin: 8px 0 0;
	}
	@media (max-width: 560px) {
		.formats {
			grid-template-columns: 1fr;
		}
	}
	/* Same spacing as the template form */
	.setup {
		display: grid;
		gap: 20px;
	}
	fieldset {
		border: none;
		padding: 0;
		margin: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 6px;
	}
	.back {
		margin: 0 0 12px;
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
		/* Above the item cards' number badges and tier labels while scrolling */
		z-index: 5;
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
