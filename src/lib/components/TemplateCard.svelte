<script lang="ts">
	import { enhance } from "$app/forms";
	import { showError } from "$lib/formErrors.svelte";
	import { imageUrl } from "$lib/images";
	import { toast } from "$lib/toast.svelte";
	import type { Template } from "$lib/types";

	let {
		template,
		previewItems = [],
		favorite = false,
		canFavorite = false
	}: {
		template: Template;
		previewItems?: { label: string; image_path: string | null }[];
		/** In the viewer's favorites: the star is filled in. */
		favorite?: boolean;
		/** Logged in: the star is a button that adds or removes the favorite. */
		canFavorite?: boolean;
	} = $props();

	// Writable: flips straight away when pressed, and follows the page data afterwards
	let isFavorite = $derived(favorite);
	let saving = $state(false);
</script>

<!-- The star sits on top of the card, outside the link: a button can't go inside a link -->
<div class="card-wrap">
	{#if canFavorite}
		<form
			method="POST"
			action="/templates/{template.id}?/favorite"
			use:enhance={() => {
				const was = isFavorite;
				isFavorite = !was;
				saving = true;
				return async ({ result, update }) => {
					saving = false;
					if (result.type === "success") {
						toast(
							was
								? `“${template.title}” is no longer in your favorites.`
								: `“${template.title}” is in your favorites now.`,
							"success",
							5000,
							was ? "Removed from favorites" : "Added to favorites"
						);
						// Refresh the page's lists (e.g. the favorites section on My page)
						await update();
					} else {
						isFavorite = was;
						showError("Couldn’t update your favorites. Please try again.");
					}
				};
			}}
		>
			<button
				class="favorite"
				class:on={isFavorite}
				type="submit"
				disabled={saving}
				aria-pressed={isFavorite}
				aria-label={isFavorite
					? `Remove “${template.title}” from favorites`
					: `Add “${template.title}” to favorites`}
				title={isFavorite ? "Remove from favorites" : "Add to favorites"}
				>{isFavorite ? "★" : "☆"}</button
			>
		</form>
	{:else if favorite}
		<span
			class="favorite on"
			role="img"
			aria-label="In your favorites"
			title="In your favorites">★</span
		>
	{/if}
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
			{#if template.format === "bracket"}<span class="chip">Bracket</span>{/if}
			<span class="muted">
				{template.list_count}
				{template.list_count === 1 ? "list" : "lists"}
			</span>
		</div>
		{#if template.profiles?.username}
			<p class="muted by">by {template.profiles.username}</p>
		{/if}
	</a>
</div>

<style>
	.card-wrap {
		position: relative;
		display: grid;
	}
	.card-wrap form {
		margin: 0;
	}
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
	/* Small star on the corner of the pictures */
	/* Round star on the corner of the pictures */
	.favorite {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 2;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: rgb(0 0 0 / 0.6);
		color: rgb(255 255 255 / 0.85);
		font: inherit;
		font-size: 1.0625rem;
		line-height: 1;
	}
	button.favorite {
		cursor: pointer;
		transition:
			transform 0.12s ease,
			background 0.12s ease;
	}
	button.favorite:hover {
		background: rgb(0 0 0 / 0.8);
		transform: scale(1.08);
	}
	button.favorite:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.favorite.on {
		color: #f5c84c;
	}
	/* The card lifts on hover: lift the star with it */
	.card-wrap:has(.template-card:hover) .favorite {
		translate: 0 -2px;
	}
</style>
