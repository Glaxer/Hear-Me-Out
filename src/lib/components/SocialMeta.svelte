<script lang="ts">
	import { page } from "$app/state";

	/** Title, description and logo that chat apps and social sites show for a link. */
	let { title, description }: { title: string; description: string } = $props();

	const url = $derived(`${page.url.origin}${page.url.pathname}`);
	const image = $derived(`${page.url.origin}/og-logo.png`);
</script>

<svelte:head>
	<title>{title} · Hear Me Out</title>
	<meta name="description" content={description} />
	<meta property="og:site_name" content="Hear Me Out" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="512" />
	<meta property="og:image:height" content="512" />
	<meta property="og:image:alt" content="Hear Me Out logo" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>
