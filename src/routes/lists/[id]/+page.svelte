<script lang="ts">
	import { enhance } from "$app/forms";
	import { page } from "$app/state";
	import ExportImage from "$lib/components/ExportImage.svelte";
	import HotTakes from "$lib/components/HotTakes.svelte";
	import SocialMeta from "$lib/components/SocialMeta.svelte";
	import TierListView from "$lib/components/TierListView.svelte";
	import { visibilityChip } from "$lib/visibility";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const isOwner = $derived(data.user?.id === data.list.owner_id);
	const justSaved = $derived(page.url.searchParams.has("saved"));
	const chip = $derived(visibilityChip(data.list.visibility));
	const author = $derived(data.list.profiles?.username ?? "Someone");
	const rankedCount = $derived(
		new Set(Object.values(data.list.placements).flat()).size
	);
	const exportOptions = $derived({
		title: data.list.title,
		author,
		templateTitle: data.template.title,
		tiers: data.list.tiers,
		placements: data.list.placements,
		items: data.items,
		link: `${page.url.host}/lists/${data.list.id}`,
		hotTakes: data.hotTakes?.length
			? {
					heading: `${author}’s hottest takes`,
					rows: data.hotTakes.flatMap((take) => {
						const item = data.items.find((i) => i.id === take.itemId);
						const votes = `${take.otherVotes} ${take.otherVotes === 1 ? "vote" : "votes"}`;
						return item
							? [
									{
										item,
										mine: take.mine,
										others: take.others,
										note: `Rated ${take.diff > 0 ? "higher" : "lower"} than the other ${votes}`
									}
								]
							: [];
					})
				}
			: undefined
	});
</script>

<SocialMeta
	title={data.list.title}
	description="{author} ranked {rankedCount} {rankedCount === 1
		? 'item'
		: 'items'} from “{data.template
		.title}”. Do you agree? Make your own ranking and compare."
/>

{#if justSaved}
	<p class="form-success">
		{#if data.list.visibility === "public"}
			Saved! Use “Share” to send it to others. Your ranking also shows on the
			template page.
		{:else if data.list.visibility === "unlisted"}
			Saved! Only people you send the link to can see this ranking. Use “Share”
			to send it to them.
		{:else}
			Saved as private. Only you can see it. Edit it to share it.
		{/if}
	</p>
{/if}

<div class="head">
	<div>
		<p class="muted crumbs">
			<a href="/templates/{data.template.id}">{data.template.title}</a> · by
			{data.list.profiles?.username ?? "someone"}
			{#if chip}<span class="chip">{chip}</span>{/if}
		</p>
		<h1>{data.list.title}</h1>
	</div>
	<div class="row">
		<ExportImage
			options={exportOptions}
			optional={data.hotTakes?.length
				? { key: "hotTakes", label: "Include hot takes" }
				: null}
			shareUrl={data.list.visibility === "private"
				? null
				: `${page.url.origin}/lists/${data.list.id}`}
			noLinkHint={isOwner
				? "This list is private. Edit it to share a link."
				: ""}
		/>
		{#if isOwner}
			<a class="btn btn-secondary btn-small" href="/lists/{data.list.id}/edit"
				>Edit</a
			>
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm("Delete this tier list?")) cancel();
				}}
			>
				<button class="btn btn-danger btn-small" type="submit">Delete</button>
			</form>
		{/if}
	</div>
</div>

<p class="muted tip">Click an item to see its picture in full size.</p>
<TierListView
	tiers={data.list.tiers}
	placements={data.list.placements}
	items={data.items}
	showUnranked
	itemHref={(itemId) => `/lists/${data.list.id}/items/${itemId}`}
/>

<HotTakes
	status={data.hotTakesState}
	takes={data.hotTakes}
	items={data.items}
	whose={data.list.profiles?.username ?? "this person"}
	isOwner={data.isOwner}
	rankHref="/templates/{data.template.id}/rank"
/>

<div class="cta card">
	<div>
		<h2>Disagree?</h2>
		<p class="muted">
			Make your own ranking of {data.template.title} and compare.
		</p>
	</div>
	<div class="row">
		<a class="btn" href="/templates/{data.template.id}/rank">Make my ranking</a>
		<a class="btn btn-secondary" href="/templates/{data.template.id}"
			>See all rankings</a
		>
	</div>
</div>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 16px;
		flex-wrap: wrap;
		margin: 16px 0;
	}
	.head form {
		margin: 0;
	}
	.crumbs {
		margin: 0 0 6px;
	}
	.tip {
		margin: 0 0 8px;
		font-size: 0.875rem;
	}
	.cta {
		margin-top: 32px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	.cta h2,
	.cta p {
		margin: 0;
	}
</style>
