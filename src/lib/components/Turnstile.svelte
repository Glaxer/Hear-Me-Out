<script module lang="ts">
  import { env } from "$env/dynamic/public";

  /** True when a Turnstile site key is configured; forms should then wait for a token. */
  export const captchaEnabled = !!env.PUBLIC_TURNSTILE_SITE_KEY;

  const SCRIPT_URL =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  let scriptPromise: Promise<void> | null = null;

  /** Loads Cloudflare's script once, however many forms use it. */
  function loadScript(): Promise<void> {
    scriptPromise ??= new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Could not load Turnstile"));
      };
      document.head.append(script);
    });
    return scriptPromise;
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";

  /**
   * Cloudflare Turnstile "are you human?" check. Puts the token in a hidden `captcha_token` field,
   * which the server passes on to Supabase. Supabase verifies it (the secret key lives there).
   */
  let { token = $bindable(null) }: { token?: string | null } = $props();

  // The Turnstile script has no TypeScript types; keep its use small and contained
  type TurnstileApi = {
    render: (el: HTMLElement, options: Record<string, unknown>) => string;
    reset: (id: string) => void;
    remove: (id: string) => void;
  };
  const api = () =>
    (window as unknown as { turnstile?: TurnstileApi }).turnstile;

  let container = $state<HTMLDivElement>();
  let widgetId: string | null = null;
  let failed = $state(false);

  onMount(() => {
    if (!captchaEnabled) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !api() || !container) return;
        widgetId = api()!.render(container, {
          sitekey: env.PUBLIC_TURNSTILE_SITE_KEY,
          theme: "auto",
          callback: (t: string) => {
            token = t;
            failed = false;
          },
          "expired-callback": () => (token = null),
          "error-callback": () => {
            token = null;
            failed = true;
          },
        });
      })
      .catch(() => (failed = true));

    return () => {
      cancelled = true;
      if (widgetId) api()?.remove(widgetId);
    };
  });

  /** A token works only once: call this after a failed submit to get a fresh one. */
  export function reset() {
    token = null;
    if (widgetId) api()?.reset(widgetId);
  }
</script>

{#if captchaEnabled}
  <div class="turnstile" bind:this={container}></div>
  <input type="hidden" name="captcha_token" value={token ?? ""} />
  {#if failed}
    <p class="form-error" role="alert">
      The “verify you’re human” check couldn’t load. Try reloading the page or
      turning off ad blockers for this site.
    </p>
  {/if}
{/if}

<style>
  .turnstile {
    min-height: 65px;
  }
</style>
