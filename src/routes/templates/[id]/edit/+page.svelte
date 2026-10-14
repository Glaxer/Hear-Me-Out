<script lang="ts">
	import TemplateForm from '$lib/components/TemplateForm.svelte';
	import { fromTemplateItem } from '$lib/items';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Edit: {data.template.title} · Hear Me Out</title></svelte:head>

<p class="muted back"><a href="/templates/{data.template.id}">← {data.template.title}</a></p>
<h1>Edit template</h1>
<p class="muted intro">
	New items show up as unranked in rankings people have already made. Removing an item also
	removes it from those rankings.
</p>

{#if data.user}
	<TemplateForm
		userId={data.user.id}
		initial={{
			title: data.template.title,
			description: data.template.description,
			category: data.template.category,
			visibility: data.template.visibility,
			tiers: data.template.default_tiers,
			items: data.items.map(fromTemplateItem)
		}}
		error={form?.error ?? null}
		submitLabel="Save changes"
		cancelHref="/templates/{data.template.id}"
	/>
{/if}

<style>
	.back {
		margin: 0 0 8px;
	}
	.intro {
		max-width: 60ch;
	}
</style>
