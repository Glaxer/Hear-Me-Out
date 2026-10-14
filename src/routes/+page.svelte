<script lang="ts">
	import SocialMeta from '$lib/components/SocialMeta.svelte';
	import TemplateCard from '$lib/components/TemplateCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SocialMeta
	title="Make, share and compare tier lists"
	description="Rank anything, send the link to friends or coworkers, and see everyone’s rankings side by side."
/>

<section class="hero">
	<div>
		<h1>Rank it. Share it.<br />See how everyone else ranked it.</h1>
		<p class="lead muted">
			Make a tier list in a minute, no account needed. Or make a template, send the link to friends
			or coworkers, and compare everyone’s rankings on one page.
		</p>
		<div class="row">
			<a class="btn" href="/quick">Make a quick tier list</a>
			<a class="btn btn-secondary" href="/templates">Browse templates</a>
			<a class="btn btn-secondary" href={data.user ? '/templates/new' : '/signup'}>Create a template</a>
		</div>
	</div>
	<div class="hero-art" aria-hidden="true">
		{#each [['S', '#ff7f7f', 4], ['A', '#ffbf7f', 3], ['B', '#ffdf7f', 2], ['C', '#ffff7f', 1]] as [label, color, n] (label)}
			<div class="hero-row">
				<span class="hero-label" style:background={color}>{label}</span>
				{#each Array(n) as _, i (i)}<span class="hero-item"></span>{/each}
			</div>
		{/each}
	</div>
</section>

<section class="section">
	<div class="section-head">
		<h2>Popular templates</h2>
		<a href="/templates">See all</a>
	</div>
	{#if data.popular.length}
		<div class="card-grid">
			{#each data.popular as template (template.id)}
				<TemplateCard {template} previewItems={template.template_items} />
			{/each}
		</div>
	{:else}
		<p class="empty">No templates yet. Be the first to make one!</p>
	{/if}
</section>

<section class="section">
	<div class="section-head"><h2>Freshly ranked</h2></div>
	{#if data.recentLists.length}
		<ul class="recent">
			{#each data.recentLists as list (list.id)}
				<li>
					<a href="/lists/{list.id}">{list.title}</a>
					<span class="muted">
						· {list.templates?.title} · by {list.profiles?.username ?? 'someone'}
					</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">No tier lists yet.</p>
	{/if}
</section>

<style>
	.hero {
		display: grid;
		grid-template-columns: 1.4fr 1fr;
		gap: 40px;
		align-items: center;
		padding: 24px 0 8px;
	}
	.lead {
		font-size: 1.125rem;
		max-width: 52ch;
		margin: 0 0 24px;
	}
	.hero-art {
		display: grid;
		gap: 6px;
		padding: 16px;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		transform: rotate(-2deg);
	}
	.hero-row {
		display: flex;
		gap: 6px;
	}
	.hero-label {
		width: 44px;
		height: 44px;
		border-radius: 8px;
		display: grid;
		place-items: center;
		font-family: var(--font-display);
		font-weight: 800;
		color: #111;
	}
	.hero-item {
		width: 44px;
		height: 44px;
		border-radius: 8px;
		background: var(--surface-2);
	}
	.recent {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 10px;
	}
	.recent a {
		font-weight: 600;
	}
	@media (max-width: 760px) {
		.hero {
			grid-template-columns: 1fr;
		}
		.hero-art {
			display: none;
		}
	}
</style>
