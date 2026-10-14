<script lang="ts">
	import type { Tier } from '$lib/types';

	/** One thin bar split into tier-coloured parts: a quick picture of how votes are spread. */
	let { tiers, distribution }: { tiers: Tier[]; distribution: number[] } = $props();
	const total = $derived(distribution.reduce((a, b) => a + b, 0) || 1);
</script>

<div class="stacked" aria-hidden="true">
	{#each tiers as tier, i (tier.id)}
		{#if distribution[i] > 0}
			<span style:flex-grow={distribution[i] / total} style:background={tier.color}></span>
		{/if}
	{/each}
</div>

<style>
	.stacked {
		display: flex;
		gap: 2px;
		height: 8px;
		border-radius: 4px;
		overflow: hidden;
	}
	.stacked span {
		flex-basis: 0;
	}
</style>
