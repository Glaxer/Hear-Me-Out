<script lang="ts">
	import { enhance } from "$app/forms";
	import ItemsEditor from "./ItemsEditor.svelte";
	import TierControls from "./TierControls.svelte";
	import { appendItemsToForm, type EditableItem } from "$lib/items";
	import { CATEGORIES } from "$lib/tiers";
	import { TEMPLATE_VISIBILITY } from "$lib/visibility";
	import type { TemplateVisibility, Tier } from "$lib/types";

	/** Title, description, category, default tiers and items, shared by "New" and "Edit template". */
	let {
		userId,
		initial,
		error = null,
		submitLabel,
		cancelHref
	}: {
		userId: string;
		initial: {
			title: string;
			description: string;
			category: string;
			visibility: TemplateVisibility;
			tiers: Tier[];
			items: EditableItem[];
		};
		error?: string | null;
		submitLabel: string;
		cancelHref: string;
	} = $props();

	// The form owns its state after the first render
	// svelte-ignore state_referenced_locally
	let tiers = $state<Tier[]>(structuredClone(initial.tiers));
	// svelte-ignore state_referenced_locally
	let items = $state<EditableItem[]>(initial.items);
	let status = $state<string | null>(null);
	let clientError = $state<string | null>(null);
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
		clientError = null;
		const named = items.filter((i) => i.label.trim());
		if (named.length !== items.length) {
			clientError = "Every item needs a name.";
			cancel();
			return;
		}
		if (items.length < 2) {
			clientError = "Add at least two items to rank.";
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
			clientError = `Image upload failed: ${err instanceof Error ? err.message : "unknown error"}`;
			submitting = false;
			status = null;
			cancel();
			return;
		}

		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
			status = null;
		};
	}}
>
	{#if error || clientError}
		<p class="form-error" role="alert">{clientError ?? error}</p>
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

	<fieldset class="field">
		<legend class="field-label">Tiers</legend>
		<small
			>The starting tiers for new rankings. People can still rename or add tiers
			in their own ranking.</small
		>
		<TierControls bind:tiers />
		<input type="hidden" name="tiers" value={JSON.stringify(tiers)} />
	</fieldset>

	<fieldset class="field">
		<legend class="visually-hidden">Items</legend>
		<ItemsEditor bind:items />
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
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 16px;
		padding: 16px 0;
		background: linear-gradient(to top, var(--bg) 70%, transparent);
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
