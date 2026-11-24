<script lang="ts">
	import { imageUrl } from "$lib/images";
	import PeekButton from "./PeekButton.svelte";
	import type { BlindVerdictRow } from "$lib/blind";
	import type { TemplateItem } from "$lib/types";

	/**
	 * For blind rankings: everyone's top list combined, plus the most skipped items. Hidden until
	 * you've done your own blind ranking, like the other verdicts, so it can't sway you (or spoil
	 * which items are coming).
	 */
	let {
		status,
		rows,
		mostSkipped,
		total,
		minRankings,
		slots,
		items,
		templateId,
		loggedIn
	}: {
		status: "locked" | "waiting" | "ready";
		rows: BlindVerdictRow[];
		mostSkipped: BlindVerdictRow[];
		total: number;
		minRankings: number;
		/** Size of the top list (10, or fewer with fewer items). */
		slots: number;
		items: TemplateItem[];
		templateId: string;
		loggedIn: boolean;
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const top = $derived(rows.filter((r) => r.placed > 0).slice(0, slots));
	const needed = $derived(Math.max(0, minRankings - total));
	const rankings = (n: number) =>
		`${n} blind ${n === 1 ? "ranking" : "rankings"}`;
	const spot = (n: number) => `#${n.toFixed(1).replace(/\.0$/, "")}`;
</script>

{#snippet entry(row: BlindVerdictRow, detail: string)}
	{@const item = byId.get(row.itemId)}
	{#if item}
		{#if item.image_path}
			<img src={imageUrl(item.image_path)} alt="" loading="lazy" />
		{/if}
		<span class="who">
			<strong>{item.label}</strong>
			<span class="muted small">{detail}</span>
		</span>
	{/if}
{/snippet}

<section class="section" aria-labelledby="blind-verdict-heading">
	<div class="section-head">
		<h2 id="blind-verdict-heading">The verdict</h2>
		{#if status === "ready"}
			<span class="muted">Based on {rankings(total)}</span>
		{/if}
	</div>

	{#if status === "locked"}
		<div class="card locked">
			<p class="lock" aria-hidden="true">🔒</p>
			<h3>How did everyone else rank it?</h3>
			<p class="muted">
				{total
					? `${rankings(total)} so far. Do your own first to see them. It stays hidden until then, so it can’t spoil the items.`
					: "Nobody has done it yet. Be the first!"}
			</p>
			<a class="btn" href="/templates/{templateId}/rank"
				>{loggedIn ? "Start blind ranking" : "Try it to see"}</a
			>
			{#if total}<PeekButton
					what="your picks, and it shows which items are coming"
				/>{/if}
		</div>
	{:else if status === "waiting"}
		<div class="card locked">
			<p class="lock" aria-hidden="true">⏳</p>
			<h3>Almost there</h3>
			<p class="muted">
				The verdict shows up after {rankings(minRankings)}. {needed} more to go: share
				the link to get more people in.
			</p>
		</div>
	{:else}
		<div class="verdict">
			<ol class="top">
				{#each top as row, i (row.itemId)}
					<li>
						<span class="place" class:first={i === 0}>{i + 1}</span>
						{@render entry(
							row,
							`Average ${spot(row.averageSpot ?? 0)} · in ${row.placed} of ${total} top lists`
						)}
					</li>
				{/each}
			</ol>
			{#if mostSkipped.length}
				<div class="skipped">
					<h3>Most skipped</h3>
					<ol>
						{#each mostSkipped as row (row.itemId)}
							<li>
								{@render entry(row, `Skipped in ${row.skipped} of ${total}`)}
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</div>
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
	.verdict {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
		gap: 24px;
		align-items: start;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	li {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 56px;
		padding: 6px 12px 6px 6px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
		background: var(--surface);
	}
	.place {
		flex: none;
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-small);
		background: var(--surface-2);
		font-family: var(--font-display);
		font-weight: 800;
	}
	.place.first {
		background: #f5c84c;
		color: #1a1814;
	}
	img {
		flex: none;
		width: 44px;
		height: 44px;
		border-radius: 8px;
		object-fit: cover;
		background: var(--surface-2);
	}
	.who {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.who strong {
		overflow-wrap: anywhere;
	}
	.small {
		font-size: 0.8125rem;
	}
	.skipped h3 {
		margin: 0 0 8px;
		font-size: 1rem;
	}
	.skipped li {
		opacity: 0.85;
	}
	@media (max-width: 720px) {
		.verdict {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
