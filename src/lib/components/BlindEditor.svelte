<script lang="ts">
	import { untrack } from "svelte";
	import { imageUrl } from "$lib/images";
	import {
		currentItem,
		dealOrder,
		handledCount,
		isDone,
		place,
		skip,
		skippedItems,
		skipsLeft,
		startBlind,
		type BlindState
	} from "$lib/blind";
	import type { TemplateItem } from "$lib/types";

	/**
	 * Filling out a blind ranking: one item at a time, put it in a free spot of the top list or
	 * skip it, without knowing what comes next. Placed items are locked. Starts with a short
	 * explanation; a draft (`initial`) carries on where it was.
	 */
	let {
		items,
		shuffled,
		initial = null,
		onchange
	}: {
		items: TemplateItem[];
		/** Deal the items in a random order (otherwise the template's own order). */
		shuffled: boolean;
		/** A ranking in progress (from a draft). */
		initial?: BlindState | null;
		/** Called after every move (e.g. to keep a draft). */
		onchange?: (state: BlindState | null) => void;
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	// The editor owns the ranking after the first render
	let ranking = $state.raw<BlindState | null>(untrack(() => initial));

	const item = $derived(
		ranking ? byId.get(currentItem(ranking) ?? "") : undefined
	);
	const done = $derived(!!ranking && isDone(ranking));
	const skips = $derived(ranking ? skipsLeft(ranking) : 0);
	const totalSkips = $derived(
		ranking ? ranking.order.length - ranking.slots.length : 0
	);
	const shownNumber = $derived(ranking ? handledCount(ranking) + 1 : 0);
	/** "Item 4 of 13 · 2 skips left" */
	const progress = $derived.by(() => {
		if (!ranking) return "";
		const base = `Item ${shownNumber} of ${ranking.order.length}`;
		if (totalSkips === 0) return base;
		const left =
			skips === 0
				? "No skips left"
				: `${skips} ${skips === 1 ? "skip" : "skips"} left`;
		return `${base} · ${left}`;
	});
	const skipped = $derived(
		ranking && done ? skippedItems(ranking.order, ranking.slots) : []
	);

	/** Brief highlight on the chosen spot before the next item, so the tap feels confirmed. */
	let justPlaced = $state<number | null>(null);

	function update(next: BlindState | null) {
		ranking = next;
		onchange?.(next);
	}

	function start() {
		update(
			startBlind(
				dealOrder(
					items.map((i) => i.id),
					shuffled
				)
			)
		);
	}

	function placeAt(slot: number) {
		if (!ranking || justPlaced !== null || ranking.slots[slot] !== null) return;
		justPlaced = slot;
		update(place(ranking, slot));
		setTimeout(() => (justPlaced = null), 220);
	}

	function startOver() {
		if (
			!confirm(
				"Start over? Your ranking so far is cleared and the items start again."
			)
		)
			return;
		update(null);
	}
</script>

{#snippet thumb(id: string)}
	{@const it = byId.get(id)}
	{#if it?.image_path}
		<img class="thumb" src={imageUrl(it.image_path)} alt="" loading="lazy" />
	{/if}
	<span class="slot-label">{it?.label ?? "?"}</span>
{/snippet}

<div class="blind-editor">
	{#if !ranking}
		<div class="card intro">
			<h2>How blind ranking works</h2>
			<ol>
				<li>
					The items show up <strong>one at a time</strong>. You don’t know which
					one comes next.
				</li>
				<li>
					Put each one in a free spot of your <strong
						>top {Math.min(10, items.length)}</strong
					>. Once placed, it can’t move.
				</li>
				{#if items.length > 10}
					<li>
						There are {items.length} items, so
						<strong>{items.length - 10} won’t make it</strong>. Skip the ones
						you don’t want, but choose wisely: when the skips run out,
						everything left has to go in.
					</li>
				{:else}
					<li>Every item gets a spot, so think about what might still come.</li>
				{/if}
			</ol>
			<button class="btn" type="button" onclick={start}>Start ranking</button>
		</div>
	{:else}
		<div class="board">
			<div class="stage card">
				{#if item && !done}
					<p class="muted progress-text">{progress}</p>
					{#key item.id}
						<div class="current" class:text-only={!item.image_path}>
							{#if item.image_path}
								<span class="current-img">
									<img
										src={imageUrl(item.full_image_path ?? item.image_path)}
										alt=""
										draggable="false"
									/>
								</span>
							{/if}
							<div class="current-side">
								<p class="current-label">{item.label}</p>
								<p class="muted ask">Where does it go?</p>
								{#if totalSkips > 0}
									<button
										type="button"
										class="btn btn-secondary btn-small"
										disabled={skips === 0}
										title={skips === 0
											? "Every item left needs a spot"
											: undefined}
										onclick={() => update(skip(ranking!))}>Skip</button
									>
								{/if}
							</div>
						</div>
					{/key}
				{:else if done}
					<div class="finished">
						<p class="done-title">Your top {ranking.slots.length} is set</p>
						{#if skipped.length}
							<p class="muted skipped-title">
								Skipped ({skipped.length})
							</p>
							<ul class="skipped">
								{#each skipped as id (id)}
									<li>{@render thumb(id)}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</div>

			<ol class="slots" aria-label="Your top {ranking.slots.length}">
				{#each ranking.slots as id, i (i)}
					<li class:filled={!!id} class:just={justPlaced === i}>
						<span class="rank">{i + 1}</span>
						{#if id}
							{@render thumb(id)}
						{:else if !done}
							<button
								type="button"
								class="place"
								onclick={() => placeAt(i)}
								aria-label="Put {item?.label ?? 'it'} at number {i + 1}"
								>Place here</button
							>
						{/if}
					</li>
				{/each}
			</ol>
		</div>
		<button
			type="button"
			class="link-button muted start-over"
			onclick={startOver}>Start over</button
		>
	{/if}
</div>

<style>
	.blind-editor {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
	}
	.intro {
		display: grid;
		gap: 12px;
		justify-items: start;
		max-width: 620px;
	}
	.intro h2,
	.intro ol {
		margin: 0;
	}
	.intro ol {
		display: grid;
		gap: 8px;
		padding-left: 1.25rem;
	}
	.board {
		display: grid;
		grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}
	.stage {
		display: grid;
		gap: 12px;
		position: sticky;
		top: 84px;
	}
	.progress-text {
		margin: 0;
		font-size: 0.875rem;
	}
	.current {
		display: grid;
		gap: 10px;
		animation: deal 0.2s ease;
	}
	@keyframes deal {
		from {
			opacity: 0;
		}
	}
	/* Portrait, like the bracket cards (2:3) */
	.current-img {
		display: grid;
		place-items: center;
		aspect-ratio: 2 / 3;
		border-radius: var(--radius-small);
		background: var(--surface-2);
		overflow: hidden;
	}
	.current-img img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	/* No picture: the name itself is the card */
	.text-only .current-side {
		padding: 28px 12px 4px;
	}
	.text-only .current-label {
		font-size: 1.75rem;
		line-height: 1.15;
	}
	.current-side {
		display: grid;
		gap: 8px;
		justify-items: center;
		text-align: center;
	}
	.current-side p {
		margin: 0;
	}
	.current-label {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 800;
		overflow-wrap: break-word;
	}
	.ask {
		font-size: 0.9375rem;
	}
	.start-over {
		justify-self: start;
		margin-top: 12px;
		font-size: 0.875rem;
	}
	.finished {
		display: grid;
		gap: 8px;
	}
	.finished p {
		margin: 0;
	}
	.done-title {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 800;
	}
	.skipped-title {
		font-size: 0.875rem;
	}
	.skipped {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.skipped li {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 32px;
		opacity: 0.7;
		font-size: 0.9375rem;
	}
	.slots {
		display: grid;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.slots li {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 56px;
		padding: 6px 10px 6px 6px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
		background: var(--surface);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}
	.slots li.just {
		border-color: var(--ink);
		box-shadow: 0 0 0 1px var(--ink);
	}
	.rank {
		flex: none;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-small);
		background: var(--surface-2);
		font-family: var(--font-display);
		font-weight: 800;
	}
	.slots li.filled .rank {
		background: var(--ink);
		color: var(--bg);
	}
	.thumb {
		flex: none;
		width: 40px;
		height: 40px;
		border-radius: 6px;
		object-fit: cover;
		background: var(--surface-2);
	}
	.skipped .thumb {
		width: 28px;
		height: 28px;
	}
	.slot-label {
		min-width: 0;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.place {
		flex: 1;
		align-self: stretch;
		border: 1px dashed var(--line);
		border-radius: 6px;
		background: transparent;
		color: var(--ink-soft);
		font: inherit;
		font-size: 0.9375rem;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.place:hover,
	.place:focus-visible {
		border-color: var(--ink-soft);
		border-style: solid;
		color: var(--ink);
		background: var(--surface-2);
	}
	/* Phones: the item on a strip at the top, the spots underneath */
	@media (max-width: 640px) {
		.board {
			grid-template-columns: minmax(0, 1fr);
			gap: 12px;
		}
		.stage {
			top: 72px;
			z-index: 3;
			padding: 12px;
			box-shadow: 0 8px 16px -8px rgb(0 0 0 / 0.5);
		}
		.current {
			grid-template-columns: 96px minmax(0, 1fr);
			align-items: center;
		}
		.current-side {
			justify-items: start;
			text-align: left;
		}
		.text-only {
			grid-template-columns: minmax(0, 1fr);
		}
		.text-only .current-side {
			padding: 4px 0 0;
		}
		.text-only .current-label {
			font-size: 1.375rem;
		}
		.current-label {
			font-size: 1.0625rem;
		}
		.slots li {
			min-height: 50px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.current {
			animation: none;
		}
		.slots li {
			transition: none;
		}
	}
</style>
