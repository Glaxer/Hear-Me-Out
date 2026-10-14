<script lang="ts">
	import TierLabel from './TierLabel.svelte';
	import type { Tier } from '$lib/types';

	/** How many people put an item in each tier, as horizontal bars. */
	let { tiers, distribution }: { tiers: Tier[]; distribution: number[] } = $props();
	const max = $derived(Math.max(1, ...distribution));
</script>

<ul class="vote-bars" aria-label="Votes per tier">
	{#each tiers as tier, i (tier.id)}
		<li>
			<div class="label"><TierLabel {tier} compact /></div>
			<div class="track">
				<span class="bar" style:width="{(distribution[i] / max) * 100}%" style:background={tier.color}></span>
			</div>
			<span class="count">{distribution[i]}</span>
		</li>
	{/each}
</ul>

<style>
	.vote-bars {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 4px;
	}
	li {
		display: grid;
		grid-template-columns: 56px 1fr 28px;
		align-items: center;
		gap: 8px;
	}
	.label {
		display: grid;
		height: 24px;
		border-radius: 4px;
		overflow: hidden;
	}
	.track {
		height: 14px;
		border-radius: 7px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.bar {
		display: block;
		height: 100%;
		border-radius: 7px;
		min-width: 0;
		transition: width 0.3s ease;
	}
	.count {
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		font-size: 0.875rem;
	}
</style>
