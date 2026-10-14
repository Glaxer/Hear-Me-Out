<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import ShareLink from '$lib/components/ShareLink.svelte';
	import TierListView from '$lib/components/TierListView.svelte';
	import { visibilityChip } from '$lib/visibility';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const isOwner = $derived(data.user?.id === data.list.owner_id);
	const justSaved = $derived(page.url.searchParams.has('saved'));
	const chip = $derived(visibilityChip(data.list.visibility));
</script>

<svelte:head>
	<title>{data.list.title} · Hear Me Out</title>
	<meta property="og:title" content={data.list.title} />
	<meta property="og:description" content="A tier list of {data.template.title}. Make your own and compare!" />
</svelte:head>

{#if justSaved}
	<p class="form-success">
		{#if data.list.visibility === 'public'}
			Saved! Share the link below. Your ranking also shows on the template page.
		{:else if data.list.visibility === 'unlisted'}
			Saved! Only people you send the link to can see this ranking.
		{:else}
			Saved as private. Only you can see it. Edit it to share it.
		{/if}
	</p>
{/if}

<div class="head">
	<div>
		<p class="muted crumbs">
			<a href="/templates/{data.template.id}">{data.template.title}</a> · by
			{data.list.profiles?.username ?? 'someone'}
			{#if chip}<span class="chip">{chip}</span>{/if}
		</p>
		<h1>{data.list.title}</h1>
	</div>
	<div class="row">
		{#if isOwner}
			<a class="btn btn-secondary btn-small" href="/lists/{data.list.id}/edit">Edit</a>
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm('Delete this tier list?')) cancel();
				}}
			>
				<button class="btn btn-danger btn-small" type="submit">Delete</button>
			</form>
		{/if}
	</div>
</div>

{#if data.list.visibility !== 'private'}
	<div class="share-wrap">
		<ShareLink url="{page.url.origin}/lists/{data.list.id}" title={data.list.title} />
	</div>
{/if}

<p class="muted tip">Click an item to see its picture in full size.</p>
<TierListView
	tiers={data.list.tiers}
	placements={data.list.placements}
	items={data.items}
	showUnranked
	itemHref={(itemId) => `/lists/${data.list.id}/items/${itemId}`}
/>

<div class="cta card">
	<div>
		<h2>Disagree?</h2>
		<p class="muted">Make your own ranking of {data.template.title} and compare.</p>
	</div>
	<div class="row">
		<a class="btn" href="/templates/{data.template.id}/rank">Make my ranking</a>
		<a class="btn btn-secondary" href="/templates/{data.template.id}">See all rankings</a>
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
	.share-wrap {
		margin-bottom: 20px;
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
