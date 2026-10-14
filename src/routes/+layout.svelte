<script lang="ts">
	import '../app.css';
	import { env } from '$env/dynamic/public';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<header class="site-header">
	<div class="container header-inner">
		<a class="logo" href="/" aria-label="Hear Me Out home">
			<span class="logo-mark" aria-hidden="true">
				<span style="background: var(--tier-s)"></span>
				<span style="background: var(--tier-a)"></span>
				<span style="background: var(--tier-b)"></span>
			</span>
			Hear Me Out
		</a>

		<nav class="main-nav" aria-label="Main">
			<a href="/templates">Templates</a>
			{#if data.user}
				<a href="/templates/new">New template</a>
				<a href="/me">{data.username ?? 'My lists'}</a>
				<form method="POST" action="/logout">
					<button class="link-button" type="submit">Log out</button>
				</form>
			{:else}
				<a href="/login">Log in</a>
				<a class="btn btn-small" href="/signup">Sign up</a>
			{/if}
		</nav>
	</div>
</header>

<main class="container page">
	{@render children()}
</main>

<footer class="site-footer container">
	<p>Every great ranking starts with “hear me out…”</p>
	{#if env.PUBLIC_SOURCE_URL}
		<p>
			<a href={env.PUBLIC_SOURCE_URL} rel="noopener">Source code</a> · Free software under the
			<a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noopener">AGPL-3.0</a>
		</p>
	{/if}
</footer>
