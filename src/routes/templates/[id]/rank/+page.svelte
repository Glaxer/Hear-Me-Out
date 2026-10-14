<script lang="ts">
	import ListForm from '$lib/components/ListForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Rank: {data.template.title} · Hear Me Out</title></svelte:head>

<p class="muted back"><a href="/templates/{data.template.id}">← {data.template.title}</a></p>
<div class="title-row">
	<h1>Your ranking</h1>
	{#if data.user?.id === data.template.owner_id}
		<a class="btn btn-secondary btn-small" href="/templates/{data.template.id}/edit">Add or change items</a>
	{/if}
</div>

<ListForm
	items={data.items}
	tiers={data.template.default_tiers}
	title={(data.username
		? `${data.username}’s ${data.template.title}`
		: `My ${data.template.title} ranking`
	).slice(0, 100)}
	error={form?.error ?? null}
/>

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
</style>
