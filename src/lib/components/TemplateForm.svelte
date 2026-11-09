<script lang="ts">
	import { enhance } from "$app/forms";
	import ItemsEditor from "./ItemsEditor.svelte";
	import ItemTile from "./ItemTile.svelte";
	import { byeCount, MAX_BRACKET_ITEMS, type BracketOrder } from "$lib/bracket";
	import TierControls from "./TierControls.svelte";
	import { showError, toastFailure } from "$lib/formErrors.svelte";
	import { appendItemsToForm, MAX_ITEMS, type EditableItem } from "$lib/items";
	import { CATEGORIES } from "$lib/tiers";
	import { TEMPLATE_VISIBILITY } from "$lib/visibility";
	import type { TemplateFormat, TemplateVisibility, Tier } from "$lib/types";

	/**
	 * Format, title, description, category, default tiers (tier lists) or bracket order
	 * (brackets), and items. Shared by "New" and "Edit template".
	 * `formatLocked`: the format can only be picked when making a template.
	 * `itemsLocked`: a bracket someone has filled out; its items can't change any more.
	 */
	let {
		userId,
		initial,
		submitLabel,
		cancelHref,
		formatLocked = false,
		itemsLocked = false
	}: {
		userId: string;
		initial: {
			title: string;
			description: string;
			category: string;
			visibility: TemplateVisibility;
			format: TemplateFormat;
			bracketOrder: BracketOrder;
			tiers: Tier[];
			items: EditableItem[];
		};
		submitLabel: string;
		cancelHref: string;
		formatLocked?: boolean;
		itemsLocked?: boolean;
	} = $props();

	const FORMATS: { value: TemplateFormat; label: string; hint: string }[] = [
		{
			value: "tier_list",
			label: "Tier list",
			hint: "Sort the items into tiers, from S to D."
		},
		{
			value: "bracket",
			label: "Tournament bracket",
			hint: "Items face off two at a time until one winner is left."
		}
	];
	// svelte-ignore state_referenced_locally
	let format = $state<TemplateFormat>(initial.format);
	// svelte-ignore state_referenced_locally
	let bracketOrder = $state<BracketOrder>(initial.bracketOrder);
	const isBracket = $derived(format === "bracket");
	const maxItems = $derived(isBracket ? MAX_BRACKET_ITEMS : MAX_ITEMS);

	// The form owns its state after the first render
	// svelte-ignore state_referenced_locally
	let tiers = $state<Tier[]>(structuredClone(initial.tiers));
	// svelte-ignore state_referenced_locally
	let items = $state<EditableItem[]>(initial.items);
	/** How many items skip the first round of a bracket (a bye). */
	const byes = $derived(byeCount(items.length));
	let status = $state<string | null>(null);
	let submitting = $state(false);
	// svelte-ignore state_referenced_locally
	let visibility = $state<TemplateVisibility>(initial.visibility);
	const visibilityHint = $derived(
		TEMPLATE_VISIBILITY.find((v) => v.value === visibility)?.hint
	);
</script>

<form
	class="form wide"
	method="POST"
	use:enhance={async ({ formData, cancel }) => {
		const named = items.filter((i) => i.label.trim());
		if (named.length !== items.length) {
			showError("Every item needs a name.");
			cancel();
			return;
		}
		if (items.length < 2) {
			showError("Add at least two items to rank.");
			cancel();
			return;
		}
		if (items.length > maxItems) {
			showError(
				`A tournament bracket can have at most ${maxItems} items. Remove ${items.length - maxItems} to continue.`
			);
			cancel();
			return;
		}

		submitting = true;
		try {
			await appendItemsToForm(formData, items, userId, (done, total) => {
				status = `Uploading images… ${done + 1}/${total}`;
			});
			status = "Saving…";
		} catch (err) {
			showError(
				`Image upload failed: ${err instanceof Error ? err.message : "unknown error"}`
			);
			submitting = false;
			status = null;
			cancel();
			return;
		}

		return async ({ result, update }) => {
			toastFailure(result);
			await update({ reset: false });
			submitting = false;
			status = null;
		};
	}}
>
	<input type="hidden" name="format" value={format} />
	{#if formatLocked}
		<p class="muted format-note">
			Format: <strong>{FORMATS.find((f) => f.value === format)?.label}</strong>
		</p>
	{:else}
		<fieldset class="field">
			<legend class="field-label">Format</legend>
			<div class="formats">
				{#each FORMATS as f (f.value)}
					<label class="format-option" class:chosen={format === f.value}>
						<input
							type="radio"
							name="format_choice"
							value={f.value}
							bind:group={format}
						/>
						<span class="format-text">
							<strong>{f.label}</strong>
							<span class="muted">{f.hint}</span>
						</span>
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	<div class="field">
		<label for="title">Title</label>
		<input
			id="title"
			name="title"
			type="text"
			required
			maxlength="100"
			placeholder="Cafeteria food, week 42"
			value={initial.title}
		/>
	</div>

	<div class="field">
		<label for="description"
			>Description <span class="muted">(optional)</span></label
		>
		<textarea
			id="description"
			name="description"
			maxlength="500"
			placeholder="What are we ranking, and why?"
			>{initial.description}</textarea
		>
	</div>

	<div class="field">
		<label for="category">Category</label>
		<select id="category" name="category" required value={initial.category}>
			{#each CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}
		</select>
	</div>

	<div class="field">
		<label for="visibility">Who can find it?</label>
		<select id="visibility" name="visibility" bind:value={visibility}>
			{#each TEMPLATE_VISIBILITY as v (v.value)}<option value={v.value}
					>{v.label}</option
				>{/each}
		</select>
		<small>{visibilityHint}</small>
	</div>

	<input type="hidden" name="tiers" value={JSON.stringify(tiers)} />
	{#if isBracket}
		<fieldset class="field">
			<legend class="field-label">Bracket</legend>
			<small
				>Everyone fills out the same bracket, so results can be compared.{#if itemsLocked}
					It can’t change any more, because people have filled it out.{/if}</small
			>
			<input type="hidden" name="bracket_order" value={bracketOrder} />
			<div class="orders">
				<label class="order-option">
					<input
						type="radio"
						name="bracket_order_choice"
						value="shuffled"
						bind:group={bracketOrder}
						disabled={itemsLocked}
					/>
					<span
						><strong>Shuffle</strong>
						<span class="muted"
							>A random first round. With an uneven number of items, random
							items skip the first round (a bye).</span
						></span
					>
				</label>
				<label class="order-option">
					<input
						type="radio"
						name="bracket_order_choice"
						value="ordered"
						bind:group={bracketOrder}
						disabled={itemsLocked}
					/>
					<span
						><strong>In the order added</strong>
						<span class="muted"
							>Matches follow the list. With an uneven number of items, the
							first items skip the first round, like top seeds, so put your
							favourites first. Drag the items to reorder them.</span
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
				>The starting tiers for new rankings. People can still rename or add
				tiers in their own ranking.</small
			>
			<TierControls bind:tiers />
		</fieldset>
	{/if}

	<fieldset class="field">
		<legend class="visually-hidden">Items</legend>
		{#if itemsLocked}
			<p class="field-label">
				Items <span class="muted">({items.length})</span>
			</p>
			<p class="muted locked-note">
				The items can’t change once someone has filled out the bracket, because
				their picks depend on them.
			</p>
			<div class="locked-items">
				{#each items as item (item.key)}
					<div class="item-tile">
						<ItemTile
							item={{
								id: item.key,
								label: item.label,
								image_path: item.imagePath,
								position: 0
							}}
						/>
					</div>
				{/each}
			</div>
		{:else}
			<ItemsEditor bind:items max={maxItems} />
			{#if isBracket && items.length > maxItems}
				<p class="form-error">
					A tournament bracket can have at most {maxItems} items. Remove {items.length -
						maxItems} to continue.
				</p>
			{/if}
		{/if}
	</fieldset>

	<div class="save-bar">
		<a href={cancelHref} class="muted">Cancel</a>
		<button class="btn" type="submit" disabled={submitting}>
			{submitting ? (status ?? "Saving…") : submitLabel}
		</button>
	</div>
</form>

<style>
	.wide {
		max-width: 760px;
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
	.save-bar {
		position: sticky;
		bottom: 0;
		/* Above the item cards' number badges and tier labels while scrolling */
		z-index: 5;
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 16px;
		padding: 16px 0;
		background: linear-gradient(to top, var(--bg) 70%, transparent);
	}
	.format-note {
		margin: 0;
	}
	.formats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.format-option,
	.order-option {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		padding: 12px 14px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
		background: var(--surface);
		cursor: pointer;
	}
	.format-option.chosen {
		border-color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--ink);
	}
	.format-option input,
	.order-option input {
		margin-top: 3px;
		accent-color: var(--accent);
	}
	.format-text,
	.order-option > span {
		display: grid;
		gap: 2px;
	}
	.format-text .muted,
	.order-option .muted {
		font-size: 0.875rem;
	}
	.orders {
		display: grid;
		gap: 8px;
		margin-top: 6px;
	}
	.order-option:has(input:disabled) {
		cursor: default;
		opacity: 0.7;
	}
	.bye-note {
		margin: 8px 0 0;
		font-size: 0.875rem;
	}
	.locked-note {
		margin: 0 0 10px;
		font-size: 0.875rem;
	}
	.locked-items {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	@media (max-width: 560px) {
		.formats {
			grid-template-columns: 1fr;
		}
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
</style>
