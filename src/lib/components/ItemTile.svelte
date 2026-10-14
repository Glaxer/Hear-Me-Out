<script lang="ts">
	import { imageUrl } from "$lib/images";
	import type { TemplateItem } from "$lib/types";

	let { item }: { item: TemplateItem } = $props();
	const src = $derived(imageUrl(item.image_path));
</script>

{#if src}
	<img {src} alt={item.label} loading="lazy" draggable="false" />
	<span class="item-caption">{item.label}</span>
{:else}
	<span>{item.label}</span>
{/if}
