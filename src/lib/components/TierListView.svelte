<script lang="ts">
	import ItemTile from './ItemTile.svelte';
	import TierLabel from './TierLabel.svelte';
	import { unrankedIds } from '$lib/tiers';
	import { tooltip } from '$lib/tooltip';
	import type { Placements, TemplateItem, Tier } from '$lib/types';

	let {
		tiers,
		placements,
		items,
		showUnranked = false,
		compact = false,
		itemHref,
		itemTooltip,
		onItemSelect,
		selectedId = null
	}: {
		tiers: Tier[];
		placements: Placements;
		items: TemplateItem[];
		showUnranked?: boolean;
		compact?: boolean;
		/** When given, each item links to its full-size view. */
		itemHref?: (itemId: string) => string;
		/** Tooltip text per item (defaults to the item's name). */
		itemTooltip?: (itemId: string) => string;
		/** When given, items are buttons that call this instead of links. */
		onItemSelect?: (itemId: string) => void;
		selectedId?: string | null;
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const unranked = $derived(
		unrankedIds(
			items.map((i) => i.id),
			placements
		)
	);
</script>

{#snippet tile(id: string)}
	{@const item = byId.get(id)}
	{#if item}
		{@const tip = itemTooltip ? itemTooltip(id) : item.label}
		{#if onItemSelect && !compact}
			<button
				type="button"
				class="item-tile linked"
				class:selected={selectedId === id}
				aria-pressed={selectedId === id}
				aria-label={tip}
				use:tooltip={tip}
				onclick={() => onItemSelect(id)}
			>
				<ItemTile {item} />
			</button>
		{:else if itemHref && !compact}
			<a class="item-tile linked" href={itemHref(id)} use:tooltip={tip} aria-label="{item.label}: view full size">
				<ItemTile {item} />
			</a>
		{:else}
			<div class="item-tile" use:tooltip={compact ? '' : item.label}><ItemTile {item} /></div>
		{/if}
	{/if}
{/snippet}

<div class="tier-board" class:compact>
	{#each tiers as tier (tier.id)}
		<div class="tier-row">
			<TierLabel {tier} {compact} />
			<div class="tier-items">
				{#each placements[tier.id] ?? [] as id (id)}
					{@render tile(id)}
				{/each}
			</div>
		</div>
	{/each}
</div>

{#if showUnranked && unranked.length > 0}
	<div class="unranked">
		<h3>Not ranked</h3>
		<div class="tier-items">
			{#each unranked as id (id)}
				{@render tile(id)}
			{/each}
		</div>
	</div>
{/if}

<style>
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
	}
	.unranked {
		margin-top: 20px;
	}
	.linked {
		color: inherit;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: transform 0.12s ease;
	}
	.linked.selected {
		outline: 3px solid var(--focus);
		outline-offset: 1px;
	}
	.linked:hover {
		transform: translateY(-2px);
		outline: 2px solid var(--ink);
		outline-offset: 1px;
	}

	.compact .tier-row {
		grid-template-columns: 52px 1fr;
		min-height: 36px;
	}
	.compact .tier-items {
		gap: 2px;
		padding: 2px;
	}
	.compact :global(.item-tile) {
		width: 32px;
		height: 32px;
		font-size: 0.5rem;
		padding: 1px;
	}
	.compact :global(.item-caption) {
		display: none;
	}

	@media (max-width: 560px) {
		.tier-row {
			grid-template-columns: 76px 1fr;
			min-height: 72px;
		}
		.compact .tier-row {
			grid-template-columns: 52px 1fr;
		}
	}
</style>
