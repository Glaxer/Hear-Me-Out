<script lang="ts">
	import TemplateForm from "$lib/components/TemplateForm.svelte";
	import { defaultTiers } from "$lib/tiers";
	import type { PageData } from "./$types";

	// Errors from saving are shown as toasts by the form itself
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>New template · Hear Me Out</title></svelte:head>

<h1>New template</h1>
<p class="muted intro">
	A template is the set of things people rank, as a tier list or a tournament
	bracket. After you save it, you’ll make your own ranking and get a link to
	share. You can always add more items later.
</p>

{#if data.user}
	<TemplateForm
		userId={data.user.id}
		initial={{
			title: "",
			description: "",
			category: "Food & Drink",
			visibility: "public",
			format: "tier_list",
			bracketOrder: "shuffled",
			tiers: defaultTiers(),
			items: []
		}}
		submitLabel="Save template & start ranking"
		cancelHref="/templates"
	/>
{/if}

<style>
	.intro {
		max-width: 60ch;
	}
</style>
