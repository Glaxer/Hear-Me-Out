<script lang="ts">
	import { page } from "$app/state";

	/**
	 * Title, description and logo that chat apps and social sites show for a link.
	 * `siteFirst` puts the site name before the title (used on the front page):
	 * "Hear Me Out · Make, share…" instead of "Make, share… · Hear Me Out".
	 */
	let {
		title,
		description,
		siteFirst = false
	}: { title: string; description: string; siteFirst?: boolean } = $props();

	const fullTitle = $derived(
		siteFirst ? `Hear Me Out · ${title}` : `${title} · Hear Me Out`
	);
	// Shared links show the site name separately, except on the front page, where it leads
	const shareTitle = $derived(siteFirst ? fullTitle : title);
	const url = $derived(`${page.url.origin}${page.url.pathname}`);
	const image = $derived(`${page.url.origin}/og-logo.png`);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<meta property="og:site_name" content="Hear Me Out" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={shareTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="512" />
	<meta property="og:image:height" content="512" />
	<meta property="og:image:alt" content="Hear Me Out logo" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={shareTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>
