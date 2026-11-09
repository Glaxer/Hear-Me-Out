<script lang="ts">
	import TemplateForm from "$lib/components/TemplateForm.svelte";
	import { imageUrl } from "$lib/images";
	import type { EditableItem } from "$lib/items";
	import { defaultTiers } from "$lib/tiers";
	import type { PageData } from "./$types";

	// Errors from saving are shown as toasts by the form itself
	let { data }: { data: PageData } = $props();

	const source = $derived(data.source?.template ?? null);

	/** Duplicating: the source's items as new items, still pointing at its pictures (copied on save). */
	const sourceItems = (): EditableItem[] =>
		(data.source?.items ?? []).map((item) => ({
			key: crypto.randomUUID(),
			id: null,
			label: item.label,
			imagePath: item.image_path,
			fullImagePath: item.full_image_path ?? null,
			blob: null,
			fullBlob: null,
			preview: imageUrl(item.image_path)
		}));

	const initial = $derived(
		source
			? {
					title: `${source.title} (copy)`.slice(0, 100),
					description: source.description ?? "",
					category: source.category,
					visibility: source.visibility,
					format: source.format ?? "tier_list",
					bracketOrder: source.bracket_order ?? "shuffled",
					tiers: source.default_tiers,
					items: sourceItems()
				}
			: {
					title: "",
					description: "",
					category: "Food & Drink",
					visibility: "public" as const,
					format: "tier_list" as const,
					bracketOrder: "shuffled" as const,
					tiers: defaultTiers(),
					items: []
				}
	);
</script>

<svelte:head
	><title>{source ? "Duplicate template" : "New template"} · Hear Me Out</title
	></svelte:head
>

{#if source}
	<p class="muted back">
		<a href="/templates/{source.id}">← {source.title}</a>
	</p>
	<h1>Duplicate template</h1>
	<p class="muted intro">
		A copy of “{source.title}” by {source.profiles?.username ?? "someone"}.
		Change anything you like. Nothing is saved until you press the button at the
		bottom, and the original isn’t affected.
	</p>
{:else}
	<h1>New template</h1>
	<p class="muted intro">
		A template is the set of things people rank, as a tier list or a tournament
		bracket. After you save it, you’ll make your own ranking and get a link to
		share. You can always add more items later.
	</p>
{/if}

{#if data.user}
	{#key source?.id}
		<TemplateForm
			userId={data.user.id}
			{initial}
			submitLabel="Save template & start ranking"
			cancelHref={source ? `/templates/${source.id}` : "/templates"}
		/>
	{/key}
{/if}

<style>
	.back {
		margin: 0 0 8px;
	}
	.intro {
		max-width: 60ch;
	}
</style>
