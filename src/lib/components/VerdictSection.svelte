<script lang="ts">
	import { tick } from "svelte";
	import { page } from "$app/state";
	import ExportImage from "./ExportImage.svelte";
	import ItemTile from "./ItemTile.svelte";
	import StackedVotes from "./StackedVotes.svelte";
	import TierListView from "./TierListView.svelte";
	import VoteBars from "./VoteBars.svelte";
	import { imageUrl } from "$lib/images";
	import { textOn } from "$lib/tiers";
	import type { ExportOptions } from "$lib/exportImage";
	import type { TemplateItem } from "$lib/types";
	import type { Verdict } from "$lib/verdict";

	let {
		status,
		verdict,
		items,
		rankingCount,
		minRankings,
		templateId,
		templateTitle,
		loggedIn
	}: {
		status: "locked" | "waiting" | "ready";
		verdict: Verdict | null;
		items: TemplateItem[];
		rankingCount: number;
		minRankings: number;
		templateId: string;
		/** Used as the title of "Save as image". */
		templateTitle: string;
		loggedIn: boolean;
	} = $props();

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	// Anyone can rank; saving it (needed to see the verdict) asks people to log in
	const rankHref = $derived(`/templates/${templateId}/rank`);
	const needed = $derived(Math.max(0, minRankings - rankingCount));
	const people = (n: number) => `${n} ${n === 1 ? "ranking" : "rankings"}`;

	let selectedId = $state<string | null>(null);
	let detailEl = $state<HTMLElement>();
	const selected = $derived(
		selectedId && verdict?.stats[selectedId]
			? { item: byId.get(selectedId), stats: verdict.stats[selectedId] }
			: null
	);

	function tierOf(index: number) {
		return verdict!.tiers[index];
	}

	function tooltipFor(id: string) {
		const s = verdict?.stats[id];
		const label = byId.get(id)?.label ?? "";
		if (!s) return label;
		return `${label}: average ${tierOf(s.tierIndex).label} · ${s.votes} ${s.votes === 1 ? "vote" : "votes"}`;
	}

	/** e.g. "3 said S · 2 said D": the two extremes people picked. */
	function splitSummary(id: string) {
		const d = verdict!.stats[id].distribution;
		const top = d.findIndex((c) => c > 0);
		const bottom = d.length - 1 - [...d].reverse().findIndex((c) => c > 0);
		return `${d[top]} said ${tierOf(top).label} · ${d[bottom]} said ${tierOf(bottom).label}`;
	}

	/** "Save as image": the verdict board plus the most divisive items. */
	const exportOptions = $derived<ExportOptions | null>(
		verdict
			? {
					title: `${templateTitle}: the verdict`,
					author: "",
					templateTitle,
					byline: `Based on ${people(verdict.listCount)}`,
					tiers: verdict.tiers,
					placements: verdict.placements,
					items,
					link: `${page.url.host}/templates/${templateId}`,
					divisive: verdict.divisive.flatMap((id) => {
						const item = byId.get(id);
						return item
							? [
									{
										item,
										distribution: verdict.stats[id].distribution,
										summary: splitSummary(id)
									}
								]
							: [];
					})
				}
			: null
	);

	async function select(id: string) {
		selectedId = selectedId === id ? null : id;
		await tick();
		if (selectedId)
			detailEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
	}
</script>

<section class="verdict section" aria-labelledby="verdict-heading">
	<div class="section-head">
		<h2 id="verdict-heading">The verdict</h2>
		{#if status === "ready" && verdict}
			<div class="head-right">
				<span class="muted">Based on {people(verdict.listCount)}</span>
				{#if exportOptions}<ExportImage options={exportOptions} />{/if}
			</div>
		{/if}
	</div>

	{#if status === "locked"}
		<div class="card locked">
			<div class="ghost" aria-hidden="true">
				{#each ["#ff7f7f", "#ffbf7f", "#ffdf7f", "#ffff7f"] as c, i (c)}
					<div class="ghost-row">
						<span style:background={c}></span>
						{#each Array(4 - i) as _, j (j)}<i></i>{/each}
					</div>
				{/each}
			</div>
			<div class="locked-text">
				<p class="lock-icon" aria-hidden="true">🔒</p>
				<h3>What does everyone else think?</h3>
				<p class="muted">
					{#if rankingCount === 0}
						Nobody has ranked this yet. Be the first!
					{:else}
						{people(rankingCount)} so far. Make your own ranking to see the verdict.
						It stays hidden until then, so it can’t sway your picks.
					{/if}
				</p>
				<a class="btn" href={rankHref}>Rank it to see the verdict</a>
			</div>
		</div>
	{:else if status === "waiting"}
		<div class="card waiting">
			<h3>Thanks for ranking!</h3>
			<p class="muted">
				The verdict appears once {minRankings} people have ranked this. {people(
					rankingCount
				)} so far,
				{needed} more needed. Share the link above to get more opinions.
			</p>
			<div
				class="progress"
				role="progressbar"
				aria-valuemin="0"
				aria-valuemax={minRankings}
				aria-valuenow={rankingCount}
			>
				<span style:width="{(rankingCount / minRankings) * 100}%"></span>
			</div>
		</div>
	{:else if verdict}
		<p class="muted hint">
			Every item placed by its average across all rankings. Click one to see how
			people voted.
		</p>
		<TierListView
			tiers={verdict.tiers}
			placements={verdict.placements}
			{items}
			showUnranked={false}
			itemTooltip={tooltipFor}
			onItemSelect={select}
			{selectedId}
		/>

		{#if selected?.item}
			{@const avgTier = tierOf(selected.stats.tierIndex)}
			<div class="card detail" bind:this={detailEl}>
				<div class="detail-media">
					{#if imageUrl(selected.item.full_image_path ?? selected.item.image_path)}
						<img
							src={imageUrl(
								selected.item.full_image_path ?? selected.item.image_path
							)}
							alt={selected.item.label}
						/>
					{:else}
						<div class="item-tile big"><ItemTile item={selected.item} /></div>
					{/if}
				</div>
				<div class="detail-body">
					<div class="detail-head">
						<h3>{selected.item.label}</h3>
						<button
							type="button"
							class="icon-button"
							onclick={() => (selectedId = null)}
							aria-label="Close">✕</button
						>
					</div>
					<p class="avg">
						<span
							class="badge"
							style:background={avgTier.color}
							style:color={textOn(avgTier.color)}>{avgTier.label}</span
						>
						on average, from {selected.stats.votes}
						{selected.stats.votes === 1 ? "vote" : "votes"}
					</p>
					<VoteBars
						tiers={verdict.tiers}
						distribution={selected.stats.distribution}
					/>
				</div>
			</div>
		{/if}

		{#if verdict.divisive.length}
			<div class="card divisive">
				<h3>🔥 Most divisive</h3>
				<p class="muted">The items people disagree about most.</p>
				<ul>
					{#each verdict.divisive as id (id)}
						{@const item = byId.get(id)}
						{#if item}
							<li>
								<button
									type="button"
									class="divisive-row"
									onclick={() => select(id)}
								>
									<span class="item-tile small"><ItemTile {item} /></span>
									<span class="divisive-text">
										<strong>{item.label}</strong>
										<span class="muted">{splitSummary(id)}</span>
										<StackedVotes
											tiers={verdict.tiers}
											distribution={verdict.stats[id].distribution}
										/>
									</span>
								</button>
							</li>
						{/if}
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</section>

<style>
	.head-right {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.hint {
		margin: 0 0 8px;
		font-size: 0.875rem;
	}
	h3 {
		margin: 0 0 6px;
	}

	/* Locked */
	.locked {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 240px;
		overflow: hidden;
		padding: 28px 18px;
	}
	.ghost {
		position: absolute;
		inset: 18px;
		display: grid;
		gap: 6px;
		align-content: start;
		filter: blur(6px);
		opacity: 0.45;
	}
	.ghost-row {
		display: flex;
		gap: 6px;
	}
	.ghost-row span {
		width: 72px;
		height: 44px;
		border-radius: 6px;
	}
	.ghost-row i {
		width: 44px;
		height: 44px;
		border-radius: 6px;
		background: var(--ink-soft);
	}
	.locked-text {
		position: relative;
		text-align: center;
		max-width: 420px;
		display: grid;
		justify-items: center;
		gap: 4px;
		padding: 18px;
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--surface) 85%, transparent);
	}
	.locked-text p {
		margin: 0 0 10px;
	}
	.lock-icon {
		font-size: 1.75rem;
	}

	/* Waiting */
	.waiting p {
		margin: 0 0 12px;
		max-width: 60ch;
	}
	.progress {
		height: 10px;
		border-radius: 5px;
		background: var(--surface-2);
		overflow: hidden;
		max-width: 320px;
	}
	.progress span {
		display: block;
		height: 100%;
		background: #7fff7f;
	}

	/* Item detail */
	.detail {
		display: grid;
		grid-template-columns: minmax(0, 260px) 1fr;
		gap: 20px;
		margin-top: 16px;
		align-items: start;
	}
	.detail-media img {
		width: 100%;
		max-height: 260px;
		object-fit: cover;
		border-radius: var(--radius-small);
	}
	.item-tile.big {
		width: 160px;
		height: 160px;
		font-size: 1rem;
	}
	.detail-head {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}
	.avg {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 14px;
	}
	.badge {
		min-width: 32px;
		padding: 2px 10px;
		border-radius: 6px;
		font-family: var(--font-display);
		font-weight: 800;
		text-align: center;
	}

	/* Most divisive */
	.divisive {
		margin-top: 16px;
	}
	.divisive > p {
		margin: 0 0 10px;
	}
	.divisive ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.divisive-row {
		width: 100%;
		display: grid;
		grid-template-columns: 56px 1fr;
		gap: 12px;
		align-items: center;
		padding: 6px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.divisive-row:hover {
		border-color: var(--ink-soft);
	}
	.item-tile.small {
		width: 56px;
		height: 56px;
		font-size: 0.625rem;
	}
	.item-tile.small :global(.item-caption) {
		display: none;
	}
	.divisive-text {
		display: grid;
		gap: 4px;
	}

	@media (max-width: 640px) {
		.detail {
			grid-template-columns: 1fr;
		}
	}
</style>
