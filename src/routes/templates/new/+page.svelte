<script lang="ts">
	import TemplateForm from "$lib/components/TemplateForm.svelte";
	import { defaultTiers } from "$lib/tiers";
	import type { ActionData, PageData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>New template · Hear Me Out</title></svelte:head>

<h1>New template</h1>
<p class="muted intro">
	A template is the set of things people rank. After you save it, you’ll make
	your own ranking and get a link to share. You can always add more items later.
</p>

{#if data.user}
	<TemplateForm
		userId={data.user.id}
		initial={{
			title: "",
			description: "",
			category: "Food & Drink",
			visibility: "public",
			tiers: defaultTiers(),
			items: []
		}}
		error={form?.error ?? null}
		submitLabel="Save template & start ranking"
		cancelHref="/templates"
	/>
{/if}

<style>
	.intro {
		max-width: 60ch;
	}
</style>
