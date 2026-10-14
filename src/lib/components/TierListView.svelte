<script lang="ts">
	import ItemTile from './ItemTile.svelte';
	import { textOn, unrankedIds } from '$lib/tiers';
	import type { Placements, TemplateItem, Tier } from '$lib/types';

	let {
		tiers,
		placements,
		items,
		showUnranked = false,
		compact = false
	}: {
		tiers: Tier[];
		placements: Placements;
		items: TemplateItem[];
		showUnranked?: boolean;
		compact?: boolean;
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const unranked = $derived(
		unrankedIds(
			items.map((i) => i.id),
			placements
		)
	);
</script>

<div class="tier-board" class:compact>
	{#each tiers as tier (tier.id)}
		<div class="tier-row">
			<div class="tier-label" style:background={tier.color} style:color={textOn(tier.color)}>
				{tier.label}
			</div>
			<div class="tier-items">
				{#each placements[tier.id] ?? [] as id (id)}
					{@const item = byId.get(id)}
					{#if item}
						<div class="item-tile"><ItemTile {item} /></div>
					{/if}
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
				{@const item = byId.get(id)}
				{#if item}
					<div class="item-tile"><ItemTile {item} /></div>
				{/if}
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
	}
	.unranked {
		margin-top: 20px;
	}

	.compact .tier-row {
		grid-template-columns: 44px 1fr;
		min-height: 36px;
	}
	.compact .tier-label {
		font-size: 0.875rem;
		padding: 2px;
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
			grid-template-columns: 64px 1fr;
			min-height: 72px;
		}
		.tier-label {
			font-size: 1rem;
		}
	}
</style>
