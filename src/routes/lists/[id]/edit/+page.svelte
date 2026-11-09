<script lang="ts">
	import ListForm from "$lib/components/ListForm.svelte";
	import type { PageData } from "./$types";

	// Errors from saving are shown as toasts by the form itself
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Edit: {data.list.title} · Hear Me Out</title></svelte:head>

<p class="muted back">
	<a href="/lists/{data.list.id}">← Back to tier list</a>
</p>
<h1>Edit ranking</h1>

<ListForm
	items={data.items}
	tiers={data.list.tiers}
	placements={data.list.placements}
	title={data.list.title}
	visibility={data.list.visibility}
	submitLabel="Save changes"
/>

<style>
	.back {
		margin: 0 0 8px;
	}
</style>
