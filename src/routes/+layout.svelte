<script lang="ts">
  import "../app.css";
  import { env } from "$env/dynamic/public";
  import { afterNavigate, replaceState } from "$app/navigation";
  import Toaster from "$lib/components/Toaster.svelte";
  import { REDIRECT_TOASTS, toast } from "$lib/toast.svelte";
  import type { Snippet } from "svelte";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  /**
   * Show a toast when a server redirect adds ?toast=<key>, then remove it from the address bar.
   * afterNavigate runs exactly once per navigation (including the first page load, after the
   * router is ready), so removing the parameter can't trigger it again.
   */
  afterNavigate(({ to }) => {
    const key = to?.url.searchParams.get("toast");
    if (!to || !key) return;
    const t = REDIRECT_TOASTS[key];
    if (t) toast(t.message, t.kind);
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
      Hear Me Out
    </a>

    <nav class="main-nav" aria-label="Main">
      <a href="/templates">Templates</a>
      {#if data.user}
        <a href="/templates/new">New template</a>
        <a href="/me">{data.username ?? "My lists"}</a>
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

<Toaster />

<footer class="site-footer container">
  <p>Every great ranking starts with “hear me out…”</p>
  {#if env.PUBLIC_SOURCE_URL}
    <p>
      <a href={env.PUBLIC_SOURCE_URL} rel="noopener">Source code</a> · Free
      software under the
      <a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noopener"
        >AGPL-3.0</a
      >
    </p>
  {/if}
</footer>
