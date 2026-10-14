<script lang="ts">
	import TemplateCard from '$lib/components/TemplateCard.svelte';
	import { visibilityChip } from '$lib/visibility';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<svelte:head><title>My stuff · Hear Me Out</title></svelte:head>

<h1>Hi, {data.username ?? 'there'}</h1>

<section class="section">
	<div class="section-head">
		<h2>My tier lists</h2>
		<a href="/templates">Find something to rank</a>
	</div>
	{#if data.lists.length}
		<ul class="lists">
			{#each data.lists as list (list.id)}
				<li class="card list-row">
					<div>
						<a class="list-title" href="/lists/{list.id}">{list.title}</a>
						<p class="muted">
							<a href="/templates/{list.template_id}">{list.templates?.title}</a> · updated
							{dateFormat.format(new Date(list.updated_at))}
						</p>
					</div>
					<div class="row">
						{#if visibilityChip(list.visibility)}<span class="chip">{visibilityChip(list.visibility)}</span>{/if}
						<a class="btn btn-secondary btn-small" href="/lists/{list.id}/edit">Edit</a>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">You haven’t ranked anything yet.</p>
	{/if}
</section>

<section class="section">
	<div class="section-head">
		<h2>My templates</h2>
		<a class="btn btn-small" href="/templates/new">New template</a>
	</div>
	{#if data.templates.length}
		<div class="card-grid">
			{#each data.templates as template (template.id)}
				<TemplateCard {template} previewItems={template.template_items} />
			{/each}
		</div>
	{:else}
		<p class="empty">No templates yet.</p>
	{/if}
</section>

<style>
	.lists {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 10px;
	}
	.list-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		padding: 14px 18px;
	}
	.list-title {
		font-weight: 600;
		font-size: 1.0625rem;
	}
	.list-row p {
		margin: 2px 0 0;
		font-size: 0.875rem;
	}
</style>
