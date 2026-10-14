<script lang="ts">
	import TemplateCard from "$lib/components/TemplateCard.svelte";
	import { CATEGORIES } from "$lib/tiers";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	function pageHref(page: number) {
		const params = new URLSearchParams();
		if (data.filters.q) params.set("q", data.filters.q);
		if (data.filters.category) params.set("category", data.filters.category);
		if (data.filters.sort !== "popular") params.set("sort", data.filters.sort);
		if (page > 1) params.set("page", String(page));
		const s = params.toString();
		return s ? `?${s}` : "?";
	}
</script>

<svelte:head><title>Templates · Hear Me Out</title></svelte:head>

<div class="section-head">
	<h1>Templates</h1>
	{#if data.user}<a class="btn" href="/templates/new">New template</a>{/if}
</div>

<form class="filters" method="GET" data-sveltekit-keepfocus>
	<input
		type="search"
		name="q"
		placeholder="Search templates…"
		value={data.filters.q}
		aria-label="Search templates"
	/>
	<select name="category" aria-label="Category" value={data.filters.category}>
		<option value="">All categories</option>
		{#each CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}
	</select>
	<select name="sort" aria-label="Sort by" value={data.filters.sort}>
		<option value="popular">Most ranked</option>
		<option value="new">Newest</option>
	</select>
	<button class="btn" type="submit">Search</button>
</form>

<p class="muted">{data.total} {data.total === 1 ? "template" : "templates"}</p>

{#if data.templates.length}
	<div class="card-grid">
		{#each data.templates as template (template.id)}
			<TemplateCard {template} previewItems={template.template_items} />
		{/each}
	</div>
{:else}
	<p class="empty">
		Nothing found.
		{#if data.user}<a href="/templates/new">Make a template for it?</a>{/if}
	</p>
{/if}

{#if data.pageCount > 1}
	<nav class="pager" aria-label="Pages">
		{#if data.page > 1}<a
				class="btn btn-secondary btn-small"
				href={pageHref(data.page - 1)}>← Previous</a
			>{/if}
		<span class="muted">Page {data.page} of {data.pageCount}</span>
		{#if data.page < data.pageCount}<a
				class="btn btn-secondary btn-small"
				href={pageHref(data.page + 1)}>Next →</a
			>{/if}
	</nav>
{/if}

<style>
	.filters {
		display: grid;
		grid-template-columns: 1fr auto auto auto;
		gap: 8px;
		margin-bottom: 8px;
	}
	.pager {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 16px;
		margin-top: 32px;
	}
	@media (max-width: 640px) {
		.filters {
			grid-template-columns: 1fr 1fr;
		}
		.filters input {
			grid-column: 1 / -1;
		}
	}
</style>
