<script lang="ts">
	import { untrack } from "svelte";
	import { imageUrl } from "$lib/images";
	import {
		champion,
		emptyPicks,
		matches,
		matchesInRound,
		nextOpenMatch,
		pick,
		playableCount,
		roundName,
		type Picks,
		type Slot
	} from "$lib/bracket";
	import BracketView from "./BracketView.svelte";
	import type { TemplateItem } from "$lib/types";

	/**
	 * Filling out a bracket, one match at a time: two big cards, tap the winner, and the next
	 * match comes up. Made for phones first. The whole bracket is shown underneath; tapping a
	 * match there goes back to it to change the pick (later picks that depended on it are cleared).
	 */
	let {
		items,
		seed,
		initialPicks = null,
		onchange
	}: {
		items: TemplateItem[];
		seed: Slot[];
		initialPicks?: Picks | null;
		/** Called after every pick (e.g. to keep a draft). */
		onchange?: (picks: Picks) => void;
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	// The editor owns the picks after the first render
	let picks = $state.raw<Picks>(
		untrack(() =>
			initialPicks && initialPicks.length === seed.length - 1
				? matches(seed, initialPicks).map((m) => m.winner)
				: emptyPicks(seed)
		)
	);
	/** The match on screen; null when every match is picked (shows the champion). */
	let currentIndex = $state<number | null>(
		untrack(() => nextOpenMatch(seed, picks)?.index ?? null)
	);

	const all = $derived(matches(seed, picks));
	const current = $derived(
		currentIndex === null ? null : (all[currentIndex] ?? null)
	);
	const total = $derived(playableCount(seed));
	const done = $derived(all.filter((m) => !m.bye && m.winner).length);
	const playable = $derived(all.filter((m) => !m.bye));
	const winner = $derived(champion(picks));

	/** Brief highlight on the chosen card before moving on, so the tap feels confirmed. */
	let chosen = $state<string | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function choose(itemId: string) {
		if (!current || chosen) return;
		chosen = itemId;
		const index = current.index;
		clearTimeout(timer);
		timer = setTimeout(() => {
			picks = pick(seed, picks, index, itemId);
			onchange?.(picks);
			chosen = null;
			currentIndex = nextOpenMatch(seed, picks)?.index ?? null;
		}, 180);
	}

	/** Back to the match before this one (by order of play). */
	function previous() {
		const at =
			currentIndex === null
				? playable.length
				: playable.findIndex((m) => m.index === currentIndex);
		for (let i = Math.min(at, playable.length) - 1; i >= 0; i--) {
			const m = playable[i];
			if (m.a && m.b) {
				currentIndex = m.index;
				return;
			}
		}
	}

	function goTo(index: number) {
		currentIndex = index;
		document
			.getElementById("bracket-match")
			?.scrollIntoView({ behavior: "smooth", block: "center" });
	}

	function onKeydown(e: KeyboardEvent) {
		if (!current?.a || !current.b) return;
		const target = e.target as HTMLElement;
		if (target.closest("input, textarea, select")) return;
		if (e.key === "ArrowLeft" || e.key === "1") choose(current.a);
		if (e.key === "ArrowRight" || e.key === "2") choose(current.b);
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#snippet card(id: string, side: "a" | "b")}
	{@const item = byId.get(id)}
	<button
		type="button"
		class="pick-card"
		class:chosen={chosen === id}
		class:faded={chosen !== null && chosen !== id}
		onclick={() => choose(id)}
		aria-label="Pick {item?.label ?? 'this item'}"
		aria-keyshortcuts={side === "a" ? "ArrowLeft" : "ArrowRight"}
	>
		<span class="pick-img">
			{#if item?.image_path}
				<img
					src={imageUrl(item.full_image_path ?? item.image_path)}
					alt=""
					draggable="false"
				/>
			{:else}
				<span class="pick-text-only">{item?.label ?? "?"}</span>
			{/if}
		</span>
		{#if item?.image_path}
			<span class="pick-label">{item.label}</span>
		{/if}
	</button>
{/snippet}

<div class="bracket-editor">
	<div class="progress-row">
		<p class="muted progress-text">
			{done} of {total} matches picked
		</p>
		<div
			class="progress"
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={total}
			aria-valuenow={done}
			aria-label="Matches picked"
		>
			<span style:width="{total ? (done / total) * 100 : 0}%"></span>
		</div>
	</div>

	<div class="stage card" id="bracket-match">
		{#if current && current.a && current.b}
			<div class="stage-head">
				<button
					type="button"
					class="link-button muted"
					onclick={previous}
					disabled={playable[0]?.index === current.index}>← Back</button
				>
				<p class="round-label">
					<strong>{roundName(seed.length, current.round)}</strong>
					{#if matchesInRound(seed.length, current.round) > 1}
						<span class="muted"
							>· Match {current.number + 1} of {matchesInRound(
								seed.length,
								current.round
							)}</span
						>
					{/if}
				</p>
			</div>
			<p class="ask">Which one wins?</p>
			<div class="versus">
				{@render card(current.a, "a")}
				<span class="vs" aria-hidden="true">vs</span>
				{@render card(current.b, "b")}
			</div>
			<p class="muted hint">Tap the winner. Keyboard: ← or →.</p>
		{:else if winner && byId.get(winner)}
			{@const item = byId.get(winner)!}
			<div class="stage-head">
				<button type="button" class="link-button muted" onclick={previous}
					>← Back</button
				>
			</div>
			<div class="winner">
				<span class="trophy" aria-hidden="true">🏆</span>
				<p class="muted">Your champion</p>
				{#if item.image_path}
					<img src={imageUrl(item.full_image_path ?? item.image_path)} alt="" />
				{/if}
				<h2>{item.label}</h2>
				<p class="muted hint">
					Change any pick by tapping that match in the bracket below.
				</p>
			</div>
		{:else}
			<p class="muted">Pick the earlier matches first.</p>
		{/if}
	</div>

	<details class="overview" open>
		<summary>The whole bracket</summary>
		<BracketView
			{seed}
			{picks}
			{items}
			current={currentIndex}
			onselect={goTo}
		/>
	</details>
</div>

<style>
	.bracket-editor {
		display: grid;
		/* minmax(0, …): the wide bracket below scrolls instead of stretching the page */
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
	}
	.progress-row {
		display: grid;
		gap: 6px;
	}
	.progress-text {
		margin: 0;
		font-size: 0.875rem;
	}
	.progress {
		height: 6px;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.progress span {
		display: block;
		height: 100%;
		background: var(--ink);
		transition: width 0.2s ease;
	}
	.stage {
		display: grid;
		gap: 12px;
		scroll-margin: 80px;
	}
	.stage-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		min-height: 28px;
	}
	.round-label {
		margin: 0;
		font-size: 0.9375rem;
	}
	.ask {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.375rem;
		font-weight: 800;
		text-align: center;
	}
	.versus {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		align-items: center;
		gap: 12px;
		width: 100%;
		/* As big as possible while both portrait cards still fit on the screen:
		   card height ≈ 1.5 × card width, leaving room for the heading above */
		max-width: min(760px, calc((100svh - 300px) * 1.33 + 60px));
		min-width: min(100%, 300px);
		margin: 0 auto;
	}
	.vs {
		font-family: var(--font-display);
		font-weight: 800;
		color: var(--ink-soft);
	}
	.pick-card {
		display: grid;
		gap: 8px;
		padding: 8px;
		border: 2px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
		color: inherit;
		font: inherit;
		cursor: pointer;
		transition:
			border-color 0.12s ease,
			transform 0.12s ease,
			opacity 0.12s ease;
		-webkit-tap-highlight-color: transparent;
	}
	.pick-card:hover {
		border-color: var(--ink-soft);
	}
	.pick-card:active {
		transform: scale(0.98);
	}
	.pick-card.chosen {
		border-color: var(--ink);
		box-shadow: 0 0 0 2px var(--ink);
	}
	.pick-card.faded {
		opacity: 0.4;
	}
	/* Portrait, like a poster or cover (2:3) */
	.pick-img {
		display: grid;
		place-items: center;
		aspect-ratio: 2 / 3;
		border-radius: var(--radius-small);
		background: var(--surface-2);
		overflow: hidden;
	}
	.pick-img img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.pick-text-only {
		padding: 12px;
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 800;
		text-align: center;
		overflow-wrap: anywhere;
	}
	.pick-label {
		font-weight: 700;
		line-height: 1.25;
		text-align: center;
		overflow-wrap: anywhere;
	}
	.hint {
		margin: 0;
		font-size: 0.8125rem;
		text-align: center;
	}
	.winner {
		display: grid;
		justify-items: center;
		gap: 6px;
		text-align: center;
	}
	.winner p,
	.winner h2 {
		margin: 0;
	}
	.winner img {
		width: min(220px, 55vw);
		aspect-ratio: 2 / 3;
		object-fit: cover;
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.trophy {
		font-size: 2.5rem;
		line-height: 1;
	}
	.overview {
		min-width: 0;
	}
	.overview summary {
		cursor: pointer;
		font-weight: 700;
		margin-bottom: 10px;
	}
	/* Phones: smaller gaps so the two cards stay as big as possible */
	@media (max-width: 560px) {
		.versus {
			gap: 6px;
		}
		.vs {
			font-size: 0.8125rem;
		}
		.pick-card {
			padding: 6px;
		}
		.pick-label {
			font-size: 0.9375rem;
		}
		.ask {
			font-size: 1.125rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pick-card,
		.progress span {
			transition: none;
		}
	}
</style>
