<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import TierListView from '$lib/components/TierListView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const isOwner = $derived(data.user?.id === data.list.owner_id);
	const justSaved = $derived(page.url.searchParams.has('saved'));
	const shareUrl = $derived(`${page.url.origin}/lists/${data.list.id}`);
	let copied = $state(false);

	async function share() {
		if (navigator.share) {
			try {
				await navigator.share({ title: data.list.title, url: shareUrl });
				return;
			} catch {
				// Share sheet was closed: fall back to copying
			}
		}
		await navigator.clipboard.writeText(shareUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>{data.list.title} · Hear Me Out</title>
	<meta property="og:title" content={data.list.title} />
	<meta property="og:description" content="A tier list of {data.template.title}. Make your own and compare!" />
</svelte:head>

{#if justSaved}
	<p class="form-success">
		{#if data.list.is_public}
			Saved! Share the link below — anyone with it can see your ranking.
		{:else}
			Saved as private — only you can see it. Edit it and choose “Public” to share it.
		{/if}
	</p>
{/if}

<div class="head">
	<div>
		<p class="muted crumbs">
			<a href="/templates/{data.template.id}">{data.template.title}</a> · by
			{data.list.profiles?.username ?? 'someone'}
			{#if !data.list.is_public}<span class="chip">Private</span>{/if}
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

<div class="share card">
	<label for="share-url" class="field-label">Share link</label>
	<div class="share-row">
		<input id="share-url" type="text" readonly value={shareUrl} onfocus={(e) => e.currentTarget.select()} />
		<button class="btn" type="button" onclick={share}>{copied ? 'Copied!' : 'Share'}</button>
	</div>
</div>

<TierListView tiers={data.list.tiers} placements={data.list.placements} items={data.items} showUnranked />

<div class="cta card">
	<div>
		<h2>Disagree?</h2>
		<p class="muted">Make your own ranking of {data.template.title} and see everyone’s side by side.</p>
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
	.share {
		display: grid;
		gap: 8px;
		margin-bottom: 20px;
	}
	.share-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;
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
