<script lang="ts">
	import ItemTile from "./ItemTile.svelte";
	import type { TemplateItem } from "$lib/types";

	/**
	 * For bracket templates: how often each item was picked as the overall winner. Hidden until
	 * you've filled out the bracket yourself, like the tier list verdict, so it can't sway you.
	 */
	let {
		status,
		tally,
		total,
		items,
		templateId,
		loggedIn
	}: {
		status: "locked" | "ready";
		tally: { itemId: string; count: number }[];
		total: number;
		items: TemplateItem[];
		templateId: string;
		loggedIn: boolean;
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const top = $derived(tally[0]?.count ?? 0);
</script>

<section class="section" aria-labelledby="tally-heading">
	<div class="section-head">
		<h2 id="tally-heading">Who wins?</h2>
		{#if status === "ready"}
			<span class="muted"
				>{total} {total === 1 ? "bracket" : "brackets"} filled out</span
			>
		{/if}
	</div>

	{#if status === "locked"}
		<div class="card locked">
			<p class="lock" aria-hidden="true">🔒</p>
			<h3>Who did everyone else pick?</h3>
			<p class="muted">
				{total
					? `${total} ${total === 1 ? "person has" : "people have"} filled it out. Fill out your own bracket to see their champions.`
					: "Nobody has filled it out yet. Be the first!"}
			</p>
			<a class="btn" href="/templates/{templateId}/rank"
				>{loggedIn ? "Fill out the bracket" : "Fill it out to see"}</a
			>
		</div>
	{:else if tally.length}
		<ol class="tally">
			{#each tally as row, i (row.itemId)}
				{@const item = byId.get(row.itemId)}
				{#if item}
					<li class:leader={i === 0}>
						<span class="place">{i + 1}</span>
						<span class="item-tile"><ItemTile {item} /></span>
						<span class="who">
							<strong>{item.label}</strong>
							<span class="muted small"
								>Champion in {row.count} of {total}
								{total === 1 ? "bracket" : "brackets"}</span
							>
							<span class="bar"
								><span style:width="{(row.count / top) * 100}%"></span></span
							>
						</span>
					</li>
				{/if}
			{/each}
		</ol>
	{:else}
		<p class="muted">No finished brackets yet.</p>
	{/if}
</section>

<style>
	.locked {
		display: grid;
		justify-items: center;
		gap: 8px;
		text-align: center;
		padding: 28px 16px;
	}
	.locked h3,
	.locked p {
		margin: 0;
	}
	.lock {
		font-size: 1.5rem;
	}
	.tally {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	.tally li {
		display: grid;
		grid-template-columns: 28px auto 1fr;
		align-items: center;
		gap: 12px;
	}
	.place {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.125rem;
		text-align: center;
		color: var(--ink-soft);
	}
	.leader .place {
		color: var(--ink);
	}
	.who {
		display: grid;
		gap: 3px;
		min-width: 0;
	}
	.who strong {
		overflow-wrap: anywhere;
	}
	.small {
		font-size: 0.8125rem;
	}
	.bar {
		display: block;
		height: 6px;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
		max-width: 320px;
	}
	.bar span {
		display: block;
		height: 100%;
		background: var(--tier-s);
	}
</style>
