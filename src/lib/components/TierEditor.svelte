<script lang="ts">
	import { untrack } from 'svelte';
	import ItemTile from './ItemTile.svelte';
	import TierControls from './TierControls.svelte';
	import { textOn, unrankedIds } from '$lib/tiers';
	import type { Placements, TemplateItem, Tier } from '$lib/types';

	let {
		items,
		initialTiers,
		initialPlacements = {}
	}: {
		items: TemplateItem[];
		initialTiers: Tier[];
		initialPlacements?: Placements;
	} = $props();

	const POOL = '__pool';

	// Editor state is seeded once from props; after that the editor owns it.
	let tiers = $state<Tier[]>(untrack(() => structuredClone(initialTiers)));
	let placements = $state<Placements>(
		untrack(() => {
			const p: Placements = {};
			for (const t of initialTiers) p[t.id] = [...(initialPlacements[t.id] ?? [])];
			return p;
		})
	);
	let pool = $state<string[]>(
		untrack(() =>
			unrankedIds(
				items.map((i) => i.id),
				initialPlacements
			)
		)
	);

	let draggingId = $state<string | null>(null);
	let selectedId = $state<string | null>(null);
	let hoverZone = $state<string | null>(null);
	let showTierSettings = $state(false);

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const selectedLabel = $derived(selectedId ? byId.get(selectedId)?.label : null);

	// Serialised for the surrounding <form>
	const tiersJson = $derived(JSON.stringify(tiers));
	const placementsJson = $derived(JSON.stringify(placements));

	function listFor(zone: string): string[] {
		if (zone === POOL) return pool;
		return (placements[zone] ??= []);
	}

	function detach(id: string) {
		pool = pool.filter((x) => x !== id);
		for (const key of Object.keys(placements)) {
			placements[key] = placements[key].filter((x) => x !== id);
		}
	}

	/** Moves an item into a zone, optionally before another item. */
	function place(id: string, zone: string, beforeId?: string) {
		if (id === beforeId) return;
		detach(id);
		const list = listFor(zone);
		const index = beforeId ? list.indexOf(beforeId) : -1;
		if (index < 0) list.push(id);
		else list.splice(index, 0, id);
		selectedId = null;
	}

	function onTierRemoved(tierId: string) {
		pool.push(...(placements[tierId] ?? []));
		delete placements[tierId];
	}

	function resetAll() {
		pool = items.map((i) => i.id);
		for (const key of Object.keys(placements)) placements[key] = [];
		selectedId = null;
	}

	// ---- Drag and drop (mouse) ----
	function onDragStart(e: DragEvent, id: string) {
		draggingId = id;
		e.dataTransfer?.setData('text/plain', id);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function onDragEnd() {
		draggingId = null;
		hoverZone = null;
	}

	function onZoneDragOver(e: DragEvent, zone: string) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		hoverZone = zone;
	}

	function onZoneDrop(e: DragEvent, zone: string) {
		e.preventDefault();
		const id = e.dataTransfer?.getData('text/plain') || draggingId;
		if (id) place(id, zone);
		onDragEnd();
	}

	function onTileDrop(e: DragEvent, zone: string, beforeId: string) {
		e.preventDefault();
		e.stopPropagation();
		const id = e.dataTransfer?.getData('text/plain') || draggingId;
		if (id) place(id, zone, beforeId);
		onDragEnd();
	}

	// ---- Tap / keyboard: select an item, then pick where it goes ----
	function toggleSelect(id: string) {
		selectedId = selectedId === id ? null : id;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') selectedId = null;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<input type="hidden" name="tiers" value={tiersJson} />
<input type="hidden" name="placements" value={placementsJson} />

{#snippet tile(id: string, zone: string)}
	{@const item = byId.get(id)}
	{#if item}
		<button
			type="button"
			class="item-tile editor-tile"
			class:dragging={draggingId === id}
			class:selected={selectedId === id}
			draggable="true"
			aria-pressed={selectedId === id}
			aria-label="{item.label}{selectedId === id ? ' (selected)' : ''}"
			ondragstart={(e) => onDragStart(e, id)}
			ondragend={onDragEnd}
			ondragover={(e) => onZoneDragOver(e, zone)}
			ondrop={(e) => onTileDrop(e, zone, id)}
			onclick={() => toggleSelect(id)}
		>
			<ItemTile {item} />
		</button>
	{/if}
{/snippet}

{#snippet placeHere(zone: string, label: string)}
	{#if selectedId}
		<button type="button" class="place-here" onclick={() => selectedId && place(selectedId, zone)}>
			Place in {label}
		</button>
	{/if}
{/snippet}

<div class="toolbar">
	<p class="muted hint">
		{#if selectedLabel}
			<strong>{selectedLabel}</strong> selected — choose where it goes, or press Esc.
		{:else}
			Drag items into tiers, or tap an item and then tap “Place in …”.
		{/if}
	</p>
	<div class="row">
		<button
			type="button"
			class="btn btn-secondary btn-small"
			aria-expanded={showTierSettings}
			onclick={() => (showTierSettings = !showTierSettings)}
		>
			{showTierSettings ? 'Done editing tiers' : 'Edit tiers'}
		</button>
		<button type="button" class="btn btn-secondary btn-small" onclick={resetAll}>Reset</button>
	</div>
</div>

{#if showTierSettings}
	<div class="card tier-settings">
		<TierControls bind:tiers onremove={onTierRemoved} />
	</div>
{/if}

<div class="tier-board">
	{#each tiers as tier (tier.id)}
		<div class="tier-row">
			<div class="tier-label" style:background={tier.color} style:color={textOn(tier.color)}>
				{tier.label}
			</div>
			<div
				class="tier-items drop-zone"
				class:over={hoverZone === tier.id}
				role="list"
				aria-label="Tier {tier.label}"
				ondragover={(e) => onZoneDragOver(e, tier.id)}
				ondragleave={() => hoverZone === tier.id && (hoverZone = null)}
				ondrop={(e) => onZoneDrop(e, tier.id)}
			>
				{#each placements[tier.id] ?? [] as id (id)}
					{@render tile(id, tier.id)}
				{/each}
				{@render placeHere(tier.id, tier.label)}
			</div>
		</div>
	{/each}
</div>

<div class="pool-wrap">
	<h3>Items to rank <span class="muted">({pool.length})</span></h3>
	<div
		class="tier-items drop-zone pool"
		class:over={hoverZone === POOL}
		role="list"
		aria-label="Unranked items"
		ondragover={(e) => onZoneDragOver(e, POOL)}
		ondragleave={() => hoverZone === POOL && (hoverZone = null)}
		ondrop={(e) => onZoneDrop(e, POOL)}
	>
		{#each pool as id (id)}
			{@render tile(id, POOL)}
		{:else}
			{#if !selectedId}<p class="muted all-done">Everything is ranked 🎉</p>{/if}
		{/each}
		{@render placeHere(POOL, 'unranked')}
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}
	.hint {
		margin: 0;
	}
	.tier-settings {
		margin-bottom: 16px;
		max-width: 520px;
	}
	.tier-board {
		display: grid;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--surface);
	}
	.tier-row {
		display: grid;
		grid-template-columns: 96px 1fr;
		min-height: 88px;
		border-bottom: 1px solid var(--line);
	}
	.tier-row:last-child {
		border-bottom: none;
	}
	.tier-label {
		display: grid;
		place-items: center;
		padding: 8px;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.25rem;
		text-align: center;
		word-break: break-word;
	}
	.tier-items {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 4px;
		align-content: flex-start;
		min-height: 88px;
	}
	.drop-zone {
		transition: background 0.1s ease;
	}
	.drop-zone.over {
		background: color-mix(in srgb, var(--focus) 10%, transparent);
	}
	.pool-wrap {
		margin-top: 24px;
	}
	.pool {
		border: 2px dashed var(--line);
		border-radius: var(--radius);
		padding: 8px;
	}
	.all-done {
		margin: auto;
		padding: 16px;
	}

	.editor-tile {
		cursor: grab;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--ink);
	}
	.editor-tile:active {
		cursor: grabbing;
	}
	.editor-tile.dragging {
		opacity: 0.35;
	}
	.editor-tile.selected {
		outline: 3px solid var(--focus);
		outline-offset: 1px;
	}

	.place-here {
		width: 80px;
		height: 80px;
		border-radius: var(--radius-small);
		border: 2px dashed var(--focus);
		background: color-mix(in srgb, var(--focus) 8%, transparent);
		color: var(--focus);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		padding: 4px;
	}

	@media (max-width: 560px) {
		.tier-row {
			grid-template-columns: 64px 1fr;
			min-height: 72px;
		}
		.tier-items {
			min-height: 72px;
		}
		.tier-label {
			font-size: 1rem;
		}
		.place-here {
			width: 64px;
			height: 64px;
		}
	}
</style>
