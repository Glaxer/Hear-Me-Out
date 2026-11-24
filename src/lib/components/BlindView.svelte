<script lang="ts">
	import { imageUrl } from "$lib/images";
	import type { TemplateItem } from "$lib/types";

	/**
	 * A finished blind ranking: the numbered top list, and the items that were skipped.
	 */
	let {
		slots,
		items
	}: {
		/** The ranking, #1 first. */
		slots: (string | null)[];
		items: TemplateItem[];
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const skipped = $derived(items.filter((i) => !slots.includes(i.id)));
</script>

{#snippet entry(item: TemplateItem | undefined)}
	{#if item?.image_path}
		<img class="thumb" src={imageUrl(item.image_path)} alt="" loading="lazy" />
	{/if}
	<span class="label">{item?.label ?? "—"}</span>
{/snippet}

<div class="blind-view">
	<ol class="top">
		{#each slots as id, i (i)}
			<li>
				<span class="rank" class:first={i === 0}>{i + 1}</span>
				{@render entry(id ? byId.get(id) : undefined)}
			</li>
		{/each}
	</ol>
	{#if skipped.length}
		<section class="skipped" aria-labelledby="skipped-title">
			<h2 id="skipped-title" class="muted">Skipped ({skipped.length})</h2>
			<ul>
				{#each skipped as item (item.id)}
					<li>{@render entry(item)}</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	.blind-view {
		display: grid;
		gap: 24px;
		max-width: 720px;
	}
	.top {
		display: grid;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.top li {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 64px;
		padding: 6px 12px 6px 6px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
		background: var(--surface);
	}
	.rank {
		flex: none;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-small);
		background: var(--surface-2);
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 800;
	}
	.rank.first {
		background: #f5c84c;
		color: #1a1814;
	}
	.thumb {
		flex: none;
		width: 52px;
		height: 52px;
		border-radius: 8px;
		object-fit: cover;
		background: var(--surface-2);
	}
	.label {
		min-width: 0;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.skipped h2 {
		margin: 0 0 8px;
		font-size: 1rem;
	}
	.skipped ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 6px 16px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.skipped li {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 36px;
		opacity: 0.75;
		font-size: 0.9375rem;
	}
	.skipped .thumb {
		width: 32px;
		height: 32px;
		border-radius: 6px;
	}
</style>
