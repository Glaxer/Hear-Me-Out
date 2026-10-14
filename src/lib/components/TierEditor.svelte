<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import ItemTile from './ItemTile.svelte';
	import TierControls from './TierControls.svelte';
	import TierLabel from './TierLabel.svelte';
	import { unrankedIds } from '$lib/tiers';
	import { tooltip } from '$lib/tooltip';
	import type { Placements, TemplateItem, Tier } from '$lib/types';

	let {
		items,
		initialTiers,
		initialPlacements = {},
		onchange
	}: {
		items: TemplateItem[];
		initialTiers: Tier[];
		initialPlacements?: Placements;
		/** Called after every change to the tiers or the ranking (e.g. to keep a draft). */
		onchange?: (tiers: Tier[], placements: Placements) => void;
	} = $props();

	const POOL = '__pool';

	// Editor state is seeded once from props; after that the editor owns it.
	let tiers = $state<Tier[]>(untrack(() => $state.snapshot(initialTiers) as Tier[]));
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

	/** Where a dragged item would land: before `beforeId` (null = at the end), plus where to draw the line. */
	interface DropTarget {
		zone: string;
		beforeId: string | null;
		x: number;
		y: number;
		height: number;
	}

	let draggingId = $state<string | null>(null);
	let selectedId = $state<string | null>(null);
	let hoverZone = $state<string | null>(null);
	let drop = $state<DropTarget | null>(null);
	let showTierSettings = $state(false);

	/** True on phones/tablets: there, dragging is done with our own touch handling, not the browser's. */
	let coarsePointer = $state(false);
	onMount(() => {
		coarsePointer = window.matchMedia('(pointer: coarse)').matches;
	});

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const selectedLabel = $derived(selectedId ? byId.get(selectedId)?.label : null);

	// Serialised for the surrounding <form>
	const tiersJson = $derived(JSON.stringify(tiers));
	const placementsJson = $derived(JSON.stringify(placements));

	// Report changes (the JSON strings are read so this runs on any change, deep or not)
	$effect(() => {
		const t = JSON.parse(tiersJson) as Tier[];
		const p = JSON.parse(placementsJson) as Placements;
		untrack(() => onchange?.(t, p));
	});

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
		if (!e.dataTransfer) return;
		e.dataTransfer.setData('text/plain', id);
		e.dataTransfer.effectAllowed = 'move';
		// Use the tile itself as the drag preview (instead of the browser's text/URL label)
		const el = e.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		e.dataTransfer.setDragImage(el, e.clientX - rect.left, e.clientY - rect.top);
	}

	function onDragEnd() {
		draggingId = null;
		hoverZone = null;
		drop = null;
	}

	/**
	 * Finds the gap the pointer is in: before the first tile that is on a lower row,
	 * or on the same row with its middle to the right of the pointer. Otherwise: at the end.
	 */
	function findDropTarget(e: { clientX: number; clientY: number }, zone: string, zoneEl: HTMLElement): DropTarget {
		const tiles = Array.from(zoneEl.querySelectorAll<HTMLElement>(':scope > .editor-tile'));
		const box = zoneEl.getBoundingClientRect();
		const originX = box.left + zoneEl.clientLeft;
		const originY = box.top + zoneEl.clientTop;

		for (const tile of tiles) {
			const r = tile.getBoundingClientRect();
			if (e.clientY < r.top || (e.clientY <= r.bottom && e.clientX < r.left + r.width / 2)) {
				return { zone, beforeId: tile.dataset.id!, x: r.left - originX - 2, y: r.top - originY, height: r.height };
			}
		}

		const last = tiles.at(-1);
		if (last) {
			const r = last.getBoundingClientRect();
			return { zone, beforeId: null, x: r.right - originX + 2, y: r.top - originY, height: r.height };
		}
		// Empty tier: line at the start
		const pad = parseFloat(getComputedStyle(zoneEl).paddingTop) || 4;
		return { zone, beforeId: null, x: pad, y: pad, height: Math.max(40, zoneEl.clientHeight - pad * 2) };
	}

	/** True when dropping here would leave the item exactly where it already is. */
	function isNoMove(target: DropTarget): boolean {
		if (!draggingId) return false;
		const list = listFor(target.zone);
		const index = list.indexOf(draggingId);
		if (index < 0) return false;
		return target.beforeId === draggingId || target.beforeId === (list[index + 1] ?? null);
	}

	function onZoneDragOver(e: DragEvent, zone: string) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		hoverZone = zone;
		const target = findDropTarget(e, zone, e.currentTarget as HTMLElement);
		// Only update when the gap changes, to avoid needless re-renders while the mouse moves
		if (!drop || drop.zone !== target.zone || drop.beforeId !== target.beforeId || drop.x !== target.x || drop.y !== target.y) {
			drop = target;
		}
	}

	function onZoneDragLeave(e: DragEvent, zone: string) {
		const zoneEl = e.currentTarget as HTMLElement;
		if (zoneEl.contains(e.relatedTarget as Node)) return; // moved onto a tile inside the same tier
		if (hoverZone === zone) hoverZone = null;
		if (drop?.zone === zone) drop = null;
	}

	function onZoneDrop(e: DragEvent, zone: string) {
		e.preventDefault();
		const id = e.dataTransfer?.getData('text/plain') || draggingId;
		const target = drop?.zone === zone ? drop : findDropTarget(e, zone, e.currentTarget as HTMLElement);
		if (id) place(id, zone, target.beforeId ?? undefined);
		onDragEnd();
	}

	// ---- Touch dragging (phones/tablets): hold to pick up, drag, let go to drop ----
	const HOLD_MS = 180; // how long to hold before an item lifts (moving earlier = scrolling)
	const MOVE_TOLERANCE = 10; // moving further than this before the hold ends = scrolling
	const EDGE = 80; // px from the screen edge where dragging scrolls the page

	let ghost = $state<{ id: string; x: number; y: number } | null>(null);
	let holdTimer: ReturnType<typeof setTimeout> | undefined;
	let pending: { id: string; startX: number; startY: number; x: number; y: number } | null = null;
	let touchDragging = false;
	let suppressClick = false;
	let scrollFrame = 0;

	function onTilePointerDown(e: PointerEvent, id: string) {
		if (e.pointerType === 'mouse' || touchDragging) return;
		pending = { id, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY };
		clearTimeout(holdTimer);
		holdTimer = setTimeout(startTouchDrag, HOLD_MS);
		window.addEventListener('pointermove', onTouchMove);
		window.addEventListener('pointerup', onTouchEnd);
		window.addEventListener('pointercancel', cancelTouch);
	}

	function startTouchDrag() {
		if (!pending) return;
		touchDragging = true;
		draggingId = pending.id;
		selectedId = null;
		ghost = { id: pending.id, x: pending.x, y: pending.y };
		navigator.vibrate?.(15);
		// Stop the page from scrolling while an item is being dragged
		document.addEventListener('touchmove', blockScroll, { passive: false });
		scrollFrame = requestAnimationFrame(autoScroll);
		updateTouchDrop();
	}

	function blockScroll(e: TouchEvent) {
		if (touchDragging) e.preventDefault();
	}

	function onTouchMove(e: PointerEvent) {
		if (!pending) return;
		pending.x = e.clientX;
		pending.y = e.clientY;
		if (!touchDragging) {
			// Moved before the hold finished: the person is scrolling, not dragging
			if (Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) > MOVE_TOLERANCE) cancelTouch();
			return;
		}
		ghost = { id: pending.id, x: e.clientX, y: e.clientY };
		updateTouchDrop();
	}

	/** Finds the tier under the finger and the gap to drop into. */
	function updateTouchDrop() {
		if (!pending) return;
		const under = document.elementFromPoint(pending.x, pending.y);
		const zoneEl = under?.closest<HTMLElement>('.drop-zone[data-zone]');
		if (!zoneEl) {
			drop = null;
			hoverZone = null;
			return;
		}
		const zone = zoneEl.dataset.zone!;
		hoverZone = zone;
		drop = findDropTarget({ clientX: pending.x, clientY: pending.y }, zone, zoneEl);
	}

	/** Scrolls the page while the finger is near the top or bottom edge. */
	function autoScroll() {
		if (!touchDragging || !pending) return;
		const { y } = pending;
		const speed = y < EDGE ? -Math.ceil((EDGE - y) / 6) : y > window.innerHeight - EDGE ? Math.ceil((y - (window.innerHeight - EDGE)) / 6) : 0;
		if (speed) {
			window.scrollBy(0, speed);
			updateTouchDrop();
		}
		scrollFrame = requestAnimationFrame(autoScroll);
	}

	function onTouchEnd() {
		if (touchDragging && pending) {
			const target = drop;
			if (target && !isNoMove(target)) place(pending.id, target.zone, target.beforeId ?? undefined);
			// Lifting the finger can also count as a tap on the item; ignore taps for a moment
			suppressClick = true;
			setTimeout(() => (suppressClick = false), 400);
		}
		cancelTouch();
	}

	function cancelTouch() {
		clearTimeout(holdTimer);
		cancelAnimationFrame(scrollFrame);
		window.removeEventListener('pointermove', onTouchMove);
		window.removeEventListener('pointerup', onTouchEnd);
		window.removeEventListener('pointercancel', cancelTouch);
		document.removeEventListener('touchmove', blockScroll);
		if (touchDragging) {
			draggingId = null;
			hoverZone = null;
			drop = null;
		}
		touchDragging = false;
		pending = null;
		ghost = null;
	}

	// ---- Tap / keyboard: select an item, then pick where it goes ----
	function toggleSelect(id: string) {
		if (suppressClick) {
			suppressClick = false;
			return;
		}
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
			data-id={id}
			class:dragging={draggingId === id}
			class:selected={selectedId === id}
			draggable={coarsePointer ? 'false' : 'true'}
			aria-pressed={selectedId === id}
			use:tooltip={item.label}
			aria-label="{item.label}{selectedId === id ? ' (selected)' : ''}"
			ondragstart={(e) => onDragStart(e, id)}
			ondragend={onDragEnd}
			onpointerdown={(e) => onTilePointerDown(e, id)}
			oncontextmenu={(e) => e.preventDefault()}
			onclick={() => toggleSelect(id)}
		>
			<ItemTile {item} />
		</button>
	{/if}
{/snippet}

{#snippet dropLine(zone: string)}
	{#if drop?.zone === zone && !isNoMove(drop)}
		<span class="drop-line" aria-hidden="true" style:left="{drop.x}px" style:top="{drop.y}px" style:height="{drop.height}px"></span>
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
			{#if coarsePointer}
				Hold an item to drag it, or tap it and then tap “Place in …”.
			{:else}
				Drag items into tiers, or tap an item and then tap “Place in …”.
			{/if}
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
			<TierLabel {tier} />
			<div
				class="tier-items drop-zone"
				data-zone={tier.id}
				class:over={hoverZone === tier.id}
				role="list"
				aria-label="Tier {tier.label}"
				ondragover={(e) => onZoneDragOver(e, tier.id)}
				ondragleave={(e) => onZoneDragLeave(e, tier.id)}
				ondrop={(e) => onZoneDrop(e, tier.id)}
			>
				{#each placements[tier.id] ?? [] as id (id)}
					{@render tile(id, tier.id)}
				{/each}
				{@render dropLine(tier.id)}
				{@render placeHere(tier.id, tier.label)}
			</div>
		</div>
	{/each}
</div>

<div class="pool-wrap">
	<h3>Items to rank <span class="muted">({pool.length})</span></h3>
	<div
		class="tier-items drop-zone pool"
		data-zone={POOL}
		class:over={hoverZone === POOL}
		role="list"
		aria-label="Unranked items"
		ondragover={(e) => onZoneDragOver(e, POOL)}
		ondragleave={(e) => onZoneDragLeave(e, POOL)}
		ondrop={(e) => onZoneDrop(e, POOL)}
	>
		{@render dropLine(POOL)}
		{#each pool as id (id)}
			{@render tile(id, POOL)}
		{:else}
			{#if !selectedId}<p class="muted all-done">Everything is ranked 🎉</p>{/if}
		{/each}
		{@render placeHere(POOL, 'unranked')}
	</div>
</div>

{#if ghost}
	{@const item = byId.get(ghost.id)}
	{#if item}
		<div class="item-tile touch-ghost" aria-hidden="true" style:left="{ghost.x}px" style:top="{ghost.y}px">
			<ItemTile {item} />
		</div>
	{/if}
{/if}

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
		grid-template-columns: 104px 1fr;
		min-height: 88px;
		border-bottom: 1px solid var(--line);
	}
	.tier-row:last-child {
		border-bottom: none;
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
		position: relative;
		transition: background 0.1s ease;
	}
	/* The insertion line: where the dragged item will land */
	.drop-line {
		position: absolute;
		width: 4px;
		margin-left: -2px;
		border-radius: 2px;
		background: var(--focus);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--focus) 30%, transparent);
		pointer-events: none;
		z-index: 2;
	}
	.drop-line::before,
	.drop-line::after {
		content: '';
		position: absolute;
		left: -3px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--focus);
	}
	.drop-line::before {
		top: -5px;
	}
	.drop-line::after {
		bottom: -5px;
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
	/* Phones: no long-press menu or text selection on items, and no double-tap zoom delay */
	.editor-tile {
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
		touch-action: manipulation;
	}
	.touch-ghost {
		position: fixed;
		z-index: 300;
		pointer-events: none;
		/* Sit above the finger so the finger doesn't cover it */
		transform: translate(-50%, -115%) scale(1.1);
		box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.5);
		outline: 3px solid var(--focus);
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
			grid-template-columns: 76px 1fr;
			min-height: 72px;
		}
		.tier-items {
			min-height: 72px;
		}
		.place-here {
			width: 64px;
			height: 64px;
		}
	}
</style>
