<script lang="ts">
	import { imageUrl } from "$lib/images";
	import { champion } from "$lib/bracket";
	import TierListView from "./TierListView.svelte";
	import type { Placements, TemplateItem, Tier } from "$lib/types";

	/**
	 * A small preview of someone's ranking for list cards: the tiers for a tier list, or the
	 * champion (and who they beat in the final) for a bracket.
	 */
	let {
		list,
		items,
		bracket = false,
		blind = false
	}: {
		list: {
			tiers: Tier[];
			placements: Placements;
			picks?: (string | null)[] | null;
		};
		items: TemplateItem[];
		bracket?: boolean;
		/** A blind ranking: shows the top 3. */
		blind?: boolean;
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const winner = $derived(
		bracket && list.picks ? byId.get(champion(list.picks) ?? "") : null
	);
	/** The final: the last two semi-final winners (or round-1 winners in a 4-item bracket). */
	const runnerUp = $derived.by(() => {
		const p = list.picks;
		if (!bracket || !p || p.length < 3) return null;
		const [x, y] = [p[p.length - 3], p[p.length - 2]];
		const other = x === p[p.length - 1] ? y : x;
		return other ? byId.get(other) : null;
	});
</script>

{#if blind}
	<ol class="blind-top">
		{#each (list.picks ?? []).slice(0, 3) as id, i (i)}
			{@const item = id ? byId.get(id) : null}
			<li>
				<span class="num">{i + 1}</span>
				{#if item?.image_path}<img
						src={imageUrl(item.image_path)}
						alt=""
						loading="lazy"
					/>{/if}
				<span class="blind-label">{item?.label ?? "—"}</span>
			</li>
		{/each}
	</ol>
{:else if bracket}
	<div class="champ">
		{#if winner}
			{#if winner.image_path}
				<img src={imageUrl(winner.image_path)} alt="" loading="lazy" />
			{:else}
				<span class="trophy" aria-hidden="true">🏆</span>
			{/if}
			<span class="champ-text">
				<span class="muted small">Champion</span>
				<strong>{winner.label}</strong>
				{#if runnerUp}<span class="muted small"
						>beat {runnerUp.label} in the final</span
					>{/if}
			</span>
		{:else}
			<span class="muted small">Not finished</span>
		{/if}
	</div>
{:else}
	<TierListView
		tiers={list.tiers}
		placements={list.placements}
		{items}
		compact
	/>
{/if}

<style>
	.blind-top {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.blind-top li {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 32px;
		font-size: 0.9375rem;
	}
	.blind-top .num {
		flex: none;
		width: 20px;
		font-family: var(--font-display);
		font-weight: 800;
		text-align: center;
		color: var(--ink-soft);
	}
	.blind-top img {
		flex: none;
		width: 32px;
		height: 32px;
		border-radius: 6px;
		object-fit: cover;
		background: var(--surface-2);
	}
	.blind-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.champ {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 72px;
	}
	.champ img {
		width: 72px;
		height: 72px;
		flex: none;
		border-radius: var(--radius-small);
		object-fit: cover;
		background: var(--surface-2);
	}
	.trophy {
		width: 72px;
		height: 72px;
		flex: none;
		display: grid;
		place-items: center;
		font-size: 2rem;
		border-radius: var(--radius-small);
		background: var(--surface-2);
	}
	.champ-text {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.champ-text strong {
		overflow-wrap: anywhere;
	}
	.small {
		font-size: 0.8125rem;
	}
</style>
