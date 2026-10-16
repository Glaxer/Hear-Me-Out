<script lang="ts">
	import ItemTile from "./ItemTile.svelte";
	import { textOn } from "$lib/tiers";
	import type { TemplateItem, Tier } from "$lib/types";
	import type { HotTake } from "$lib/verdict";

	let {
		status,
		takes,
		items,
		whose,
		isOwner,
		rankHref
	}: {
		status: "locked" | "not-enough" | "ready";
		takes: HotTake[] | null;
		items: TemplateItem[];
		/** Owner's username, for "Anna's hottest takes". */
		whose: string;
		isOwner: boolean;
		rankHref: string;
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const title = $derived(
		isOwner ? "Your hottest takes" : `${whose}’s hottest takes`
	);
	const subject = $derived(isOwner ? "You" : whose);
</script>

{#snippet badge(tier: Tier)}
	<span
		class="badge"
		title={tier.label}
		style:background={tier.color}
		style:color={textOn(tier.color)}>{tier.label}</span
	>
{/snippet}

{#if status === "locked"}
	<div class="card hot locked-takes">
		<h2>🔥 {title}</h2>
		<p class="muted">
			Make your own ranking of this template to see where {whose} disagrees with everyone
			else.
		</p>
		<a class="btn btn-small" href={rankHref}>Rank it</a>
	</div>
{:else if status === "ready" && takes}
	<div class="card hot">
		<h2>🔥 {title}</h2>
		{#if takes.length === 0}
			<p class="muted">
				No hot takes here. This ranking pretty much agrees with everyone else.
			</p>
		{:else}
			<p class="muted">
				Where {isOwner ? "you disagree" : `${whose} disagrees`} most with everyone
				else.
			</p>
			<ul class="takes">
				{#each takes as take (take.itemId)}
					{@const item = byId.get(take.itemId)}
					{@const higher = take.diff > 0}
					{@const votes = `${take.otherVotes} ${take.otherVotes === 1 ? "vote" : "votes"}`}
					{#if item}
						<li class="take">
							<!-- Top: this ranking's tier · middle: the item · bottom: everyone else's -->
							<span class="tier-line">
								<span class="who">{isOwner ? "You" : whose}</span>
								{@render badge(take.mine)}
							</span>
							<span class="middle">
								<span class="item-tile"><ItemTile {item} /></span>
								<span
									class="direction"
									title="Rated {higher
										? 'higher'
										: 'lower'} than the other {votes}"
									aria-label="Rated {higher
										? 'higher'
										: 'lower'} than the other {votes}"
									role="img"
									class:down={!higher}
									><!-- A wide block arrow; pointing down is the same shape turned over -->
									<svg viewBox="0 0 32 40" aria-hidden="true">
										<path
											d="M16 2 L30 18 L22 18 L22 38 L10 38 L10 18 L2 18 Z"
											stroke-linejoin="round"
										/>
									</svg></span
								>
							</span>
							<span class="tier-line">
								<span class="who">Others</span>
								{@render badge(take.others)}
							</span>
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
		padding: 14px 16px;
	}
	.hot h2 {
		margin: 0 0 2px;
		font-size: 1.125rem;
	}
	.hot > p {
		margin: 0 0 12px;
		font-size: 0.875rem;
	}
	.locked-takes > p {
		margin-bottom: 12px;
	}
	/* Up to three takes side by side, each a small column */
	.takes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		/* The row gap is shared with the takes' own rows (label, picture, label) */
		gap: 8px 12px;
		/* Cancels the last take's bottom margin */
		margin-bottom: -12px;
	}
	/* Each take spans three shared rows (top label, picture, bottom label), so the pictures
	   line up across the takes even when one label wraps onto more lines than another */
	.take {
		display: grid;
		grid-row: span 3;
		grid-template-rows: subgrid;
		justify-items: center;
		/* Extra space below each take, for when they wrap onto more lines (phones) */
		margin-bottom: 12px;
		text-align: center;
	}
	.take > .tier-line:first-child {
		align-self: end;
	}
	.take > .tier-line:last-child {
		align-self: start;
	}
	/* The badge is centred on the picture; "You" / "Others" hangs to its left and
	   isn't counted when centring (like the arrow on the right) */
	.tier-line {
		position: relative;
		display: flex;
		justify-content: center;
		/* As wide as the badge, so "You" / "Others" hangs right next to it */
		width: fit-content;
		max-width: min(100%, 180px);
	}
	.who {
		position: absolute;
		right: calc(100% + 6px);
		top: 50%;
		transform: translateY(-50%);
		white-space: nowrap;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}
	.middle {
		position: relative;
		display: grid;
		place-items: center;
	}
	.item-tile {
		width: 80px;
		height: 80px;
	}
	/* Beside the picture without pushing it off centre */
	.direction {
		position: absolute;
		left: calc(100% + 10px);
		top: 50%;
		transform: translateY(-50%);
		display: block;
		width: 26px;
		height: 32px;
		color: var(--ink-soft);
		cursor: help;
	}
	.direction.down svg {
		transform: rotate(180deg);
	}
	.direction svg {
		display: block;
		width: 100%;
		height: 100%;
		fill: currentColor;
		stroke: currentColor;
		stroke-width: 2;
	}
	/* Narrower screens: "You" / "Others" goes above the badge instead, since there's no
	   room beside it */
	@media (max-width: 760px) {
		.tier-line {
			flex-direction: column;
			align-items: center;
			gap: 2px;
		}
		.who {
			position: static;
			transform: none;
		}
	}
	@media (max-width: 560px) {
		.takes {
			grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
		}
	}
	/* Long tier names (up to 80 characters) wrap onto at most 3 lines, then end with "…";
	   the full name shows on hover */
	.badge {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
		min-width: 24px;
		max-width: 100%;
		padding: 2px 7px;
		border-radius: 6px;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 0.8125rem;
		line-height: 1.25;
		text-align: center;
	}
</style>
