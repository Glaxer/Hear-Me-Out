<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import ListForm from '$lib/components/ListForm.svelte';
	import { hasPlacements, loadRankDraft, type RankDraft } from '$lib/drafts';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const guestTitle = $derived(`My ${data.template.title} ranking`.slice(0, 100));
	const defaultTitle = $derived(
		data.username ? `${data.username}’s ${data.template.title}`.slice(0, 100) : guestTitle
	);

	// An unsaved ranking from earlier (browser storage only exists in the browser, so read it after load)
	let draft = $state.raw<RankDraft | null>(null);
	let autoSubmit = $state(false);

	onMount(() => {
		const saved = loadRankDraft(data.template.id);
		if (!saved) return;
		// Logged in since the draft was made: swap the "My … ranking" title for the username one
		if (saved.title === guestTitle && data.username) saved.title = defaultTitle;
		draft = saved;
		// Back from logging in after pressing "Save & share": finish saving straight away
		autoSubmit = !!data.user && page.url.searchParams.get('resume') === '1';
	});
</script>

<svelte:head><title>Rank: {data.template.title} · Hear Me Out</title></svelte:head>

<p class="muted back"><a href="/templates/{data.template.id}">← {data.template.title}</a></p>
<div class="title-row">
	<h1>Your ranking</h1>
	{#if data.user?.id === data.template.owner_id}
		<a class="btn btn-secondary btn-small" href="/templates/{data.template.id}/edit">Add or change items</a>
	{/if}
</div>

{#if autoSubmit && !form}
	<p class="form-success" role="status">Welcome back! Saving your ranking…</p>
{:else if draft && hasPlacements(draft.placements) && !form?.error}
	<p class="muted restored">Picked up where you left off.</p>
{/if}

<!-- Re-created once a draft is found, so the editor starts from it -->
{#key draft}
	<ListForm
		items={data.items}
		tiers={draft?.tiers ?? data.template.default_tiers}
		placements={draft?.placements ?? {}}
		title={draft?.title ?? defaultTitle}
		visibility={draft?.visibility ?? 'public'}
		error={form?.error ?? null}
		draftKey={data.template.id}
		guest={!data.user}
		submitLabel={data.user ? 'Save & get link' : 'Save & share'}
		{autoSubmit}
		exportInfo={{
			author: data.username ?? '',
			templateTitle: data.template.title,
			link: `${page.url.host}/templates/${data.template.id}`
		}}
	/>
{/key}

<style>
	.back {
		margin: 0 0 8px;
	}
	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.restored {
		margin: 0 0 12px;
		font-size: 0.875rem;
	}
</style>
