<script lang="ts">
	import { imageUrl } from "$lib/images";
	import {
		champion,
		matches,
		hasByes,
		roundCount,
		roundLabel,
		type Picks,
		type Slot
	} from "$lib/bracket";
	import type { TemplateItem } from "$lib/types";

	/**
	 * The whole bracket: one column per round, ending with the champion. Winners are bold,
	 * losers faded. With `onselect`, matches that can be played are buttons (to change a pick).
	 * Scrolls sideways when it doesn't fit (phones, big brackets).
	 */
	let {
		seed,
		picks,
		items,
		current = null,
		onselect
	}: {
		seed: Slot[];
		picks: Picks;
		items: TemplateItem[];
		/** The match being picked right now, highlighted. */
		current?: number | null;
		onselect?: (index: number) => void;
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const size = $derived(seed.length);
	const all = $derived(matches(seed, picks));
	// Byes aren't shown: items that skip the play-in round appear straight in the next round
	const rounds = $derived(
		Array.from({ length: roundCount(size) }, (_, r) =>
			all.filter((m) => m.round === r && !m.bye)
		)
	);
	const withByes = $derived(hasByes(seed));
	const winner = $derived(champion(picks));
</script>

{#snippet entrant(
	id: string | null,
	won: boolean,
	lost: boolean,
	round: number
)}
	{@const item = id ? byId.get(id) : null}
	<span class="entrant" class:won class:lost>
		{#if item}
			{#if item.image_path}
				<img src={imageUrl(item.image_path)} alt="" loading="lazy" />
			{/if}
			<span class="name">{item.label}</span>
		{:else}
			<span class="name muted"
				>{round === 1 && withByes ? "Play-in winner" : "—"}</span
			>
		{/if}
	</span>
{/snippet}

<div class="bracket-scroll">
	<div class="bracket" style:--rounds={rounds.length + 1}>
		{#each rounds as round, r (r)}
			<section class="round" aria-label={roundLabel(seed, r)}>
				<h3>{roundLabel(seed, r)}</h3>
				<div class="matches">
					{#each round as m (m.index)}
						{@const playable = !!onselect && !m.bye && !!m.a && !!m.b}
						<svelte:element
							this={playable ? "button" : "div"}
							type={playable ? "button" : undefined}
							role={playable ? "button" : undefined}
							class="match"
							class:current={current === m.index}
							class:playable
							onclick={playable ? () => onselect?.(m.index) : undefined}
							aria-label={playable
								? `${roundLabel(seed, r)}: ${byId.get(m.a!)?.label} vs ${byId.get(m.b!)?.label}. Change pick`
								: undefined}
						>
							{@render entrant(
								m.a,
								!!m.winner && m.winner === m.a,
								!!m.winner && m.winner !== m.a,
								r
							)}
							{@render entrant(
								m.b,
								!!m.winner && m.winner === m.b,
								!!m.winner && m.winner !== m.b,
								r
							)}
						</svelte:element>
					{/each}
				</div>
			</section>
		{/each}
		<section class="round champion-round" aria-label="Champion">
			<h3>Champion</h3>
			<div class="matches">
				<div class="champion" class:empty={!winner}>
					{#if winner && byId.get(winner)}
						{@const item = byId.get(winner)!}
						<span class="trophy" aria-hidden="true">🏆</span>
						{#if item.image_path}
							<img src={imageUrl(item.image_path)} alt="" />
						{/if}
						<strong>{item.label}</strong>
					{:else}
						<span class="muted">Not decided yet</span>
					{/if}
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	.bracket-scroll {
		overflow-x: auto;
		padding-bottom: 8px;
		-webkit-overflow-scrolling: touch;
	}
	.bracket {
		display: grid;
		grid-template-columns: repeat(var(--rounds), minmax(168px, 1fr));
		gap: 16px;
		min-width: min-content;
	}
	.round {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.round h3 {
		margin: 0 0 8px;
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--ink-soft);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	/* Spreading matches out lines each one up roughly between the two it came from */
	.matches {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		gap: 8px;
	}
	.match {
		display: grid;
		gap: 2px;
		width: 100%;
		padding: 4px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
		background: var(--surface);
		color: inherit;
		font: inherit;
		text-align: left;
	}
	.match.playable {
		cursor: pointer;
	}
	.match.playable:hover {
		border-color: var(--ink-soft);
	}
	.match.current {
		border-color: var(--focus);
		box-shadow: 0 0 0 1px var(--focus);
	}
	.entrant {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		min-height: 28px;
		padding: 2px 6px 2px 2px;
		border-radius: 4px;
		font-size: 0.8125rem;
		line-height: 1.2;
	}
	.entrant img {
		flex: none;
		width: 24px;
		height: 24px;
		border-radius: 4px;
		object-fit: cover;
		background: var(--surface-2);
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.entrant.won {
		font-weight: 700;
		background: var(--surface-2);
	}
	.entrant.lost {
		opacity: 0.45;
	}
	.champion {
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 12px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
		background: var(--surface);
		text-align: center;
	}
	.champion.empty {
		font-size: 0.875rem;
	}
	.champion img {
		width: 72px;
		height: 72px;
		border-radius: var(--radius-small);
		object-fit: cover;
	}
	.trophy {
		font-size: 1.5rem;
		line-height: 1;
	}
</style>
