<script lang="ts">
	import { tick, untrack } from "svelte";
	import BlindView from "./BlindView.svelte";
	import ConfirmDialog from "./ConfirmDialog.svelte";
	import { imageUrl } from "$lib/images";
	import {
		currentItem,
		dealOrder,
		handledCount,
		isDone,
		place,
		skip,
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

	/** Brief highlight on the chosen spot before the next item, so the tap feels confirmed. */
	let justPlaced = $state<number | null>(null);

	function update(next: BlindState | null) {
		ranking = next;
		onchange?.(next);
	}

	let gameEl = $state<HTMLElement>();

	async function start() {
		update(
			startBlind(
				dealOrder(
					items.map((i) => i.id),
					shuffled
				)
			)
		);
		// Bring the whole game into view (on phones the intro sits lower on the page)
		await tick();
		gameEl?.scrollIntoView({ block: "start", behavior: "smooth" });
	}

	function placeAt(slot: number) {
		if (!ranking || justPlaced !== null || ranking.slots[slot] !== null) return;
		justPlaced = slot;
		update(place(ranking, slot));
		setTimeout(() => (justPlaced = null), 220);
	}

	/** "Start over" asks first, in the site's own popup (the browser's confirm() freezes the page). */
	let startOverDialog = $state<ReturnType<typeof ConfirmDialog>>();
</script>

{#snippet startOverButton()}
	<button
		type="button"
		class="link-button muted start-over"
		onclick={() => startOverDialog?.open()}>Start over</button
	>
{/snippet}

<ConfirmDialog
	bind:this={startOverDialog}
	title="Start over?"
	message="Your ranking so far is cleared, and the items start again from the beginning."
	confirmLabel="Start over"
	cancelLabel="Keep going"
	danger
	onconfirm={() => update(null)}
/>

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
	{:else if done}
		<div class="finished">
			<div class="finished-head">
				<p class="done-title">Your top {ranking.slots.length} is set</p>
				{@render startOverButton()}
			</div>
			<BlindView slots={ranking.slots} {items} />
		</div>
	{:else}
		<div class="game" style:--slots={ranking.slots.length} bind:this={gameEl}>
			<div class="game-head card">
				<p class="muted progress-text">{progress}</p>
				<span class="corner">{@render startOverButton()}</span>
				{#key item?.id}<p class="current-label">{item?.label}</p>{/key}
			</div>

			<div class="play">
				{#key item?.id}
					<div class="picture" class:text-only={!item?.image_path}>
						{#if item?.image_path}
							<img
								src={imageUrl(item.full_image_path ?? item.image_path)}
								alt={item.label}
								draggable="false"
							/>
						{:else}
							<span>{item?.label}</span>
						{/if}
					</div>
				{/key}

				<ol class="slots" aria-label="Your top {ranking.slots.length}">
					{#each ranking.slots as id, i (i)}
						{@const placed = id ? byId.get(id) : null}
						<li class:just={justPlaced === i}>
							{#if placed}
								<span class="slot filled" title="#{i + 1}: {placed.label}">
									{#if placed.image_path}
										<img src={imageUrl(placed.image_path)} alt="" />
									{:else}
										<span class="slot-text">{placed.label}</span>
									{/if}
									<span class="badge">{i + 1}</span>
								</span>
								<span class="slot-label">{placed.label}</span>
							{:else}
								<!-- Empty name: keeps the column the same width before and after placing -->
								<button
									type="button"
									class="slot empty"
									onclick={() => placeAt(i)}
									aria-label="Put {item?.label ?? 'it'} at number {i + 1}"
									>{i + 1}</button
								>
								<span class="slot-label" aria-hidden="true"></span>
							{/if}
						</li>
					{/each}
				</ol>
			</div>

			{#if totalSkips > 0}
				<button
					type="button"
					class="btn btn-secondary skip"
					disabled={skips === 0}
					title={skips === 0 ? "Every item left needs a spot" : undefined}
					onclick={() => update(skip(ranking!))}
					>{skips === 0 ? "No skips left" : "Skip"}</button
				>
			{/if}
			<p class="muted hint">Pick a number to put it there.</p>
		</div>
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

	/* The game: a strip with the name on top, then the big picture and the spots side by side */
	.game {
		/* Height of the picture; the spots share the same height */
		--play-h: min(560px, 62svh);
		--gap: 6px;
		--slot-h: min(
			64px,
			calc((var(--play-h) - (var(--slots) - 1) * var(--gap)) / var(--slots))
		);
		display: grid;
		gap: 12px;
		justify-items: center;
		/* Below the sticky site header when scrolled into view */
		scroll-margin-top: 76px;
	}
	.game-head {
		position: relative;
		width: 100%;
		max-width: 760px;
		display: grid;
		gap: 2px;
		padding: 8px 12px 10px;
		text-align: center;
	}
	.game-head p {
		margin: 0;
	}
	.progress-text {
		font-size: 0.8125rem;
		text-align: left;
	}
	.current-label {
		font-family: var(--font-display);
		font-size: 1.375rem;
		font-weight: 800;
		line-height: 1.2;
		overflow-wrap: break-word;
		animation: deal 0.2s ease;
	}
	.start-over {
		font-size: 0.8125rem;
		white-space: nowrap;
	}
	.game-head .corner {
		position: absolute;
		top: 8px;
		right: 12px;
	}
	.play {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 12px;
		align-items: start;
		width: 100%;
		max-width: 760px;
	}
	/* Portrait, like the bracket cards (2:3), as tall as the column of spots */
	.picture {
		display: grid;
		place-items: center;
		justify-self: center;
		width: min(100%, calc(var(--play-h) * 2 / 3));
		height: calc(
			var(--slots) * var(--slot-h) + (var(--slots) - 1) * var(--gap)
		);
		border-radius: var(--radius);
		background: var(--surface-2);
		overflow: hidden;
		animation: deal 0.2s ease;
	}
	.picture img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.picture.text-only span {
		padding: 16px;
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 800;
		line-height: 1.15;
		text-align: center;
		overflow-wrap: break-word;
	}
	@keyframes deal {
		from {
			opacity: 0;
		}
	}
	.slots {
		display: grid;
		grid-auto-rows: var(--slot-h);
		gap: var(--gap);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.slots li {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	.slot {
		position: relative;
		flex: none;
		display: grid;
		place-items: center;
		width: calc(var(--slot-h) * 1.25);
		height: 100%;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
		background: var(--surface);
		color: inherit;
		font-family: var(--font-display);
		font-size: 1.125rem;
		font-weight: 800;
		overflow: hidden;
	}
	button.slot {
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			border-color 0.12s ease,
			background 0.12s ease;
	}
	button.slot:hover,
	button.slot:focus-visible {
		border-color: var(--ink);
		background: var(--surface-2);
	}
	.slot.filled img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.slot-text {
		display: -webkit-box;
		padding: 2px 4px;
		font-family: var(--font-body, inherit);
		font-size: 0.6875rem;
		font-weight: 600;
		line-height: 1.1;
		text-align: center;
		overflow: hidden;
		overflow-wrap: anywhere;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
	}
	/* The spot number stays visible on a placed item */
	.badge {
		position: absolute;
		top: 2px;
		left: 2px;
		min-width: 16px;
		padding: 0 3px;
		border-radius: 4px;
		background: rgb(0 0 0 / 0.7);
		color: #fff;
		font-size: 0.6875rem;
		line-height: 16px;
		text-align: center;
	}
	.slots li.just .slot {
		border-color: var(--ink);
		box-shadow: 0 0 0 1px var(--ink);
	}
	.slot-label {
		width: 200px;
		font-size: 0.9375rem;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.skip {
		min-width: 160px;
	}
	.hint {
		margin: 0;
		font-size: 0.8125rem;
	}

	/* Finished */
	.finished {
		display: grid;
		gap: 12px;
	}
	.finished-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		max-width: 720px;
	}
	.done-title {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.375rem;
		font-weight: 800;
	}

	/* Phones: only the spots next to the picture (the names show in the finished list) */
	@media (max-width: 640px) {
		.game {
			--play-h: min(480px, 56svh);
		}
		.game-head {
			padding-right: 84px;
			text-align: left;
		}
		.current-label {
			font-size: 1.1875rem;
		}
		.play {
			gap: 8px;
		}
		.picture {
			width: 100%;
		}
		.slot-label {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.current-label,
		.picture {
			animation: none;
		}
		button.slot {
			transition: none;
		}
	}
</style>
