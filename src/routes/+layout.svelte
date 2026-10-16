<script lang="ts">
	// The site's fonts, served from our own domain (no requests to Google).
	// Bricolage with its "optical size" axis, so big headings get the tighter display cut.
	import "@fontsource-variable/bricolage-grotesque/opsz.css";
	import "@fontsource-variable/inter";
	import "../app.css";
	import { env } from "$env/dynamic/public";
	import { afterNavigate, replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import Toaster from "$lib/components/Toaster.svelte";
	import { tooltip } from "$lib/tooltip";
	import { REDIRECT_TOASTS, toast } from "$lib/toast.svelte";
	import type { Snippet } from "svelte";
	import type { LayoutData } from "./$types";

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	/** Marks the menu item for the section you're in. */
	const current = (match: (path: string) => boolean) =>
		match(page.url.pathname) ? ("page" as const) : undefined;

	/**
	 * Show a toast when a server redirect adds ?toast=<key>, then remove it from the address bar.
	 * afterNavigate runs exactly once per navigation (including the first page load, after the
	 * router is ready), so removing the parameter can't trigger it again.
	 */
	afterNavigate(({ to }) => {
		const key = to?.url.searchParams.get("toast");
		if (!to || !key) return;
		const t = REDIRECT_TOASTS[key];
		if (t) toast(t.message, t.kind, t.durationMs);
		const clean = new URL(to.url);
		clean.searchParams.delete("toast");
		// The router finishes setting up right after this callback; wait one tick before touching history
		setTimeout(() => {
			try {
				replaceState(clean, {});
			} catch {
				// Not critical: the parameter just stays in the address bar
			}
		});
	});
</script>

<header class="site-header">
	<div class="container header-inner">
		<a class="logo" href="/" aria-label="Hear Me Out home">
			<span class="logo-mark" aria-hidden="true">
				<span style="background: var(--tier-s)"></span>
				<span style="background: var(--tier-a)"></span>
				<span style="background: var(--tier-b)"></span>
			</span>
			<span class="logo-text">Hear Me Out</span>
		</a>

		<nav class="main-nav" aria-label="Main">
			<a
				href="/templates"
				aria-current={current((p) => p.startsWith("/templates"))}>Templates</a
			>
			{#if data.user}
				<a href="/lists" aria-current={current((p) => p === "/lists")}
					>Tier Lists</a
				>
				<a
					href="/me"
					class="avatar"
					aria-current={current((p) => p === "/me")}
					aria-label="{data.username ?? 'My page'}: my page"
					use:tooltip={data.username ?? "My page"}
				>
					{(data.username ?? "?").slice(0, 2).toUpperCase()}
				</a>
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

<Toaster />

<footer class="site-footer container">
	<p>Every great ranking starts with “hear me out…”</p>
	<p>
		<a href="/privacy">Privacy</a>
		{#if env.PUBLIC_SOURCE_URL}
			· <a href={env.PUBLIC_SOURCE_URL} rel="noopener">Source code</a> · Free
			software under the
			<a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noopener">
				AGPL-3.0
			</a>
		{/if}
	</p>
</footer>
