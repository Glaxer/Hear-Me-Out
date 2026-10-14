<script lang="ts">
	import { enhance } from "$app/forms";
	import { page } from "$app/state";
	import ItemTile from "$lib/components/ItemTile.svelte";
	import ShareLink from "$lib/components/ShareLink.svelte";
	import SocialMeta from "$lib/components/SocialMeta.svelte";
	import VerdictSection from "$lib/components/VerdictSection.svelte";
	import { visibilityChip } from "$lib/visibility";
	import TierListView from "$lib/components/TierListView.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const isOwner = $derived(data.user?.id === data.template.owner_id);
	const mine = $derived(data.lists.filter((l) => l.owner_id === data.user?.id));
	const others = $derived(
		data.lists.filter(
			(l) => l.owner_id !== data.user?.id && l.visibility === "public"
		)
	);
	const unlisted = $derived(data.template.visibility === "unlisted");
	let showItems = $state(false);
</script>

<SocialMeta
	title={data.template.title}
	description={data.template.description ||
		`Rank ${data.items.length} items, then see how your picks compare with everyone else’s.`}
/>

<div class="head">
	<div>
		<p class="row crumbs">
			<span class="chip">{data.template.category}</span>
			{#if unlisted}<span class="chip">Link only</span>{/if}
			<span class="muted"
				>by {data.template.profiles?.username ?? "someone"}</span
			>
		</p>
		<h1>{data.template.title}</h1>
		{#if data.template.description}<p class="desc">
				{data.template.description}
			</p>{/if}
	</div>
	<div class="actions">
		<a class="btn" href="/templates/{data.template.id}/rank">
			{mine.length ? "Make another ranking" : "Rank this"}
		</a>
		{#if isOwner}
			<a
				class="btn btn-secondary btn-small"
				href="/templates/{data.template.id}/edit">Edit template</a
			>
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (
						!confirm("Delete this template and every tier list made from it?")
					)
						cancel();
				}}
			>
				<button class="btn btn-danger btn-small" type="submit"
					>Delete template</button
				>
			</form>
		{/if}
	</div>
</div>

<ShareLink
	variant="card"
	url="{page.url.origin}/templates/{data.template.id}"
	heading="Invite people to rank this"
	hint={unlisted
		? "This template is hidden from browse and search. Only people with this link can find it."
		: "Anyone with this link can make their own ranking."}
/>

<VerdictSection
	status={data.verdictState}
	verdict={data.verdict}
	items={data.items}
	rankingCount={data.rankingCount}
	minRankings={data.minRankings}
	templateId={data.template.id}
	loggedIn={!!data.user}
/>

<button
	class="link-button muted show-items"
	type="button"
	aria-expanded={showItems}
	onclick={() => (showItems = !showItems)}
>
	{showItems ? "Hide" : "Show"} the {data.items.length} items in this template
</button>
{#if showItems}
	<div class="items">
		{#each data.items as item (item.id)}
			<div class="item-tile"><ItemTile {item} /></div>
		{/each}
	</div>
{/if}

{#if mine.length}
	<section class="section">
		<div class="section-head"><h2>Your rankings</h2></div>
		<div class="list-grid">
			{#each mine as list (list.id)}
				<a class="card list-card" href="/lists/{list.id}">
					<div class="list-card-head">
						<strong>{list.title}</strong>
						{#if visibilityChip(list.visibility)}<span class="chip"
								>{visibilityChip(list.visibility)}</span
							>{/if}
					</div>
					<TierListView
						tiers={list.tiers}
						placements={list.placements}
						items={data.items}
						compact
					/>
				</a>
			{/each}
		</div>
	</section>
{/if}

<section class="section">
	<div class="section-head">
		<h2>Everyone’s rankings <span class="muted">({others.length})</span></h2>
	</div>
	{#if others.length}
		<div class="list-grid">
			{#each others as list (list.id)}
				<a class="card list-card" href="/lists/{list.id}">
					<div class="list-card-head">
						<strong>{list.title}</strong>
						<span class="muted">{list.profiles?.username ?? "someone"}</span>
					</div>
					<TierListView
						tiers={list.tiers}
						placements={list.placements}
						items={data.items}
						compact
					/>
				</a>
			{/each}
		</div>
	{:else}
		<p class="empty">
			No one else has ranked this yet. Share the link to this page to get
			opinions!
		</p>
	{/if}
</section>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 24px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}
	.crumbs {
		margin: 0 0 8px;
		font-size: 0.875rem;
	}
	.desc {
		max-width: 60ch;
		margin: 0;
	}
	.actions {
		display: grid;
		gap: 8px;
		justify-items: end;
	}
	.actions form {
		margin: 0;
	}
	.show-items {
		margin-top: 20px;
	}
	.items {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 12px;
	}
	.list-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 16px;
	}
	.list-card {
		display: grid;
		gap: 10px;
		text-decoration: none;
		align-content: start;
		transition: border-color 0.12s ease;
	}
	.list-card:hover {
		border-color: var(--ink-soft);
	}
	.list-card-head {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		align-items: baseline;
	}
	@media (max-width: 640px) {
		/* Phones: buttons side by side, wrapping as needed, instead of a ragged column */
		.actions {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			width: 100%;
		}
	}
</style>
