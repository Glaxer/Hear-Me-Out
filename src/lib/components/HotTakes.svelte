<script lang="ts">
	import ItemTile from './ItemTile.svelte';
	import { textOn } from '$lib/tiers';
	import type { TemplateItem, Tier } from '$lib/types';
	import type { HotTake } from '$lib/verdict';

	let {
		status,
		takes,
		items,
		whose,
		isOwner,
		rankHref
	}: {
		status: 'locked' | 'not-enough' | 'ready';
		takes: HotTake[] | null;
		items: TemplateItem[];
		/** Owner's username, for "Anna's hottest takes". */
		whose: string;
		isOwner: boolean;
		rankHref: string;
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const title = $derived(isOwner ? 'Your hottest takes' : `${whose}’s hottest takes`);
	const subject = $derived(isOwner ? 'You' : whose);
</script>

{#snippet badge(tier: Tier)}
	<span class="badge" style:background={tier.color} style:color={textOn(tier.color)}>{tier.label}</span>
{/snippet}

{#if status === 'locked'}
	<div class="card hot locked-takes">
		<h2>🔥 {title}</h2>
		<p class="muted">Make your own ranking of this template to see where {whose} disagrees with everyone else.</p>
		<a class="btn btn-small" href={rankHref}>Rank it</a>
	</div>
{:else if status === 'ready' && takes}
	<div class="card hot">
		<h2>🔥 {title}</h2>
		{#if takes.length === 0}
			<p class="muted">No hot takes here. This ranking pretty much agrees with everyone else.</p>
		{:else}
			<p class="muted">Where {isOwner ? 'you disagree' : `${whose} disagrees`} most with everyone else’s rankings.</p>
			<ul>
				{#each takes as take (take.itemId)}
					{@const item = byId.get(take.itemId)}
					{#if item}
						<li>
							<span class="item-tile small"><ItemTile {item} /></span>
							<div class="take">
								<strong>{item.label}</strong>
								<span class="compare">
									{subject} {isOwner ? 'put' : 'puts'} it in {@render badge(take.mine)}
									<span class="muted">· everyone else says</span>
									{@render badge(take.others)}
								</span>
								<span class="muted direction">
									{take.diff > 0 ? '⬆ Rated higher' : '⬇ Rated lower'} than the other {take.otherVotes}
									{take.otherVotes === 1 ? 'vote' : 'votes'}
								</span>
							</div>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style>
	.hot {
		margin-top: 24px;
	}
	.hot h2 {
		margin: 0 0 4px;
		font-size: 1.25rem;
	}
	.hot > p {
		margin: 0 0 12px;
	}
	.locked-takes > p {
		margin-bottom: 12px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	li {
		display: grid;
		grid-template-columns: 64px 1fr;
		gap: 12px;
		align-items: center;
	}
	.item-tile.small {
		width: 64px;
		height: 64px;
		font-size: 0.625rem;
	}
	.item-tile.small :global(.item-caption) {
		display: none;
	}
	.take {
		display: grid;
		gap: 4px;
	}
	.compare {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}
	.badge {
		min-width: 28px;
		padding: 1px 8px;
		border-radius: 6px;
		font-family: var(--font-display);
		font-weight: 800;
		text-align: center;
	}
	.direction {
		font-size: 0.8125rem;
	}
</style>
