<script lang="ts">
	import { page } from "$app/state";
</script>

<svelte:head><title>{page.status} · Hear Me Out</title></svelte:head>

<div class="error-page">
	<p class="code">{page.status}</p>
	<h1>{page.error?.message ?? "Something went wrong"}</h1>
	<p><a class="btn" href="/">Back to the start</a></p>
</div>

<style>
	.error-page {
		text-align: center;
		padding: 48px 0;
	}
	.code {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 5rem;
		margin: 0;
		color: var(--tier-s);
	}
</style>
