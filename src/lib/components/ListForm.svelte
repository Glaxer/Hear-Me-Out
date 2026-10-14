<script lang="ts">
	import { enhance } from '$app/forms';
	import TierEditor from './TierEditor.svelte';
	import { LIST_VISIBILITY } from '$lib/visibility';
	import type { ListVisibility, Placements, TemplateItem, Tier } from '$lib/types';

	let {
		items,
		tiers,
		placements = {},
		title = '',
		visibility = 'public',
		error = null,
		submitLabel = 'Save & get link'
	}: {
		items: TemplateItem[];
		tiers: Tier[];
		placements?: Placements;
		title?: string;
		visibility?: ListVisibility;
		error?: string | null;
		submitLabel?: string;
	} = $props();

	let submitting = $state(false);
</script>

<form
	method="POST"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}

	<div class="meta-fields">
		<div class="field">
			<label for="list-title">Title</label>
			<input id="list-title" name="title" type="text" required maxlength="100" value={title} />
		</div>
		<div class="field">
			<label for="visibility">Who can see it?</label>
			<select id="visibility" name="visibility" value={visibility}>
				{#each LIST_VISIBILITY as v (v.value)}<option value={v.value}>{v.label}</option>{/each}
			</select>
		</div>
	</div>

	<TierEditor {items} initialTiers={tiers} initialPlacements={placements} />

	<div class="save-bar">
		<button class="btn" type="submit" disabled={submitting}>
			{submitting ? 'Saving…' : submitLabel}
		</button>
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
	}
	@media (max-width: 640px) {
		.meta-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
