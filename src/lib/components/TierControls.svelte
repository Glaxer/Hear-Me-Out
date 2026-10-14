<script lang="ts">
	import { TIER_COLORS, newTierId } from '$lib/tiers';
	import type { Tier } from '$lib/types';

	/** Rename, recolour, reorder, add and remove tiers. */
	let {
		tiers = $bindable(),
		onremove
	}: {
		tiers: Tier[];
		/** Called with the removed tier's id, so the editor can send its items back. */
		onremove?: (id: string) => void;
	} = $props();

	function add() {
		const color = TIER_COLORS[tiers.length % TIER_COLORS.length];
		tiers = [...tiers, { id: newTierId(), label: 'New', color }];
	}

	function remove(index: number) {
		const [removed] = tiers.splice(index, 1);
		tiers = [...tiers];
		onremove?.(removed.id);
	}

	function move(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= tiers.length) return;
		const next = [...tiers];
		[next[index], next[target]] = [next[target], next[index]];
		tiers = next;
	}
</script>

<div class="tier-controls">
	{#each tiers as tier, i (tier.id)}
		<div class="tier-control-row">
			<input
				class="color"
				type="color"
				bind:value={tier.color}
				aria-label="Colour for tier {tier.label}"
			/>
			<input
				type="text"
				bind:value={tier.label}
				maxlength="40"
				required
				aria-label="Name of tier {i + 1}"
			/>
			<button
				class="icon-button"
				type="button"
				onclick={() => move(i, -1)}
				disabled={i === 0}
				aria-label="Move {tier.label} up">↑</button
			>
			<button
				class="icon-button"
				type="button"
				onclick={() => move(i, 1)}
				disabled={i === tiers.length - 1}
				aria-label="Move {tier.label} down">↓</button
			>
			<button
				class="icon-button"
				type="button"
				onclick={() => remove(i)}
				disabled={tiers.length <= 1}
				aria-label="Remove tier {tier.label}">✕</button
			>
		</div>
	{/each}
	<button class="btn btn-secondary btn-small add" type="button" onclick={add} disabled={tiers.length >= 15}>
		+ Add tier
	</button>
</div>

<style>
	.tier-controls {
		display: grid;
		gap: 8px;
	}
	.tier-control-row {
		display: grid;
		grid-template-columns: 40px 1fr 32px 32px 32px;
		gap: 6px;
		align-items: center;
	}
	.color {
		width: 40px;
		height: 36px;
		padding: 2px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface);
		cursor: pointer;
	}
	.add {
		justify-self: start;
	}
</style>
