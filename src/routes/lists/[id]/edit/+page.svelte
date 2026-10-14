<script lang="ts">
	import ListForm from '$lib/components/ListForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Edit: {data.list.title} · Hear Me Out</title></svelte:head>

<p class="muted back"><a href="/lists/{data.list.id}">← Back to tier list</a></p>
<h1>Edit ranking</h1>

<ListForm
	items={data.items}
	tiers={data.list.tiers}
	placements={data.list.placements}
	title={data.list.title}
	visibility={data.list.visibility}
	error={form?.error ?? null}
	submitLabel="Save changes"
/>

<style>
	.back {
		margin: 0 0 8px;
	}
</style>
