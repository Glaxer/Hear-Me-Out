<script lang="ts">
	import { imageUrl } from "$lib/images";
	import type { Template } from "$lib/types";

	let {
		template,
		previewItems = []
	}: {
		template: Template;
		previewItems?: { label: string; image_path: string | null }[];
	} = $props();
</script>

<a class="card template-card" href="/templates/{template.id}">
	<div class="preview" aria-hidden="true">
		{#each previewItems.slice(0, 4) as item, i (i)}
			{@const src = imageUrl(item.image_path)}
			<div class="preview-cell">
				{#if src}<img {src} alt="" loading="lazy" />{:else}<span
						>{item.label}</span
					>{/if}
			</div>
		{:else}
			<div class="preview-empty">
				{#each template.default_tiers.slice(0, 4) as tier (tier.id)}
					<span style:background={tier.color}></span>
				{/each}
			</div>
		{/each}
	</div>
	<h3>{template.title}</h3>
	<div class="meta">
		<span class="chip">{template.category}</span>
		<span class="muted">
			{template.list_count}
			{template.list_count === 1 ? "list" : "lists"}
		</span>
	</div>
	{#if template.profiles?.username}
		<p class="muted by">by {template.profiles.username}</p>
	{/if}
</a>

<style>
	.template-card {
		display: grid;
		gap: 10px;
		text-decoration: none;
		transition:
			transform 0.12s ease,
			border-color 0.12s ease;
	}
	.template-card:hover {
		transform: translateY(-2px);
		border-color: var(--ink-soft);
	}
	.template-card h3 {
		margin: 0;
	}
	.preview {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		aspect-ratio: 4 / 1;
	}
	.preview-cell {
		position: relative;
		border-radius: 6px;
		overflow: hidden;
		background: var(--surface-2);
		display: grid;
		place-items: center;
		font-size: 0.6875rem;
		font-weight: 600;
		text-align: center;
		padding: 2px;
	}
	.preview-cell img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.preview-empty {
		grid-column: 1 / -1;
		display: grid;
		gap: 3px;
	}
	.preview-empty span {
		border-radius: 3px;
	}
	.preview-empty span:nth-child(2) {
		width: 80%;
	}
	.preview-empty span:nth-child(3) {
		width: 60%;
	}
	.preview-empty span:nth-child(4) {
		width: 40%;
	}
	.meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 0.875rem;
	}
	.by {
		margin: 0;
		font-size: 0.875rem;
	}
</style>
