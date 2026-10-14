<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let submitting = $state(false);

  // Keep ?next=… so the form sends them back to what they were doing
  const action = $derived(page.url.search);
</script>

<svelte:head><title>Pick a username · Hear Me Out</title></svelte:head>

<div class="auth">
  <h1>Welcome to Hear Me Out!</h1>
  <p class="muted">
    One last thing: pick the username people will see on your tier lists. You
    can change it later in settings.
  </p>

  <form
    class="form"
    method="POST"
    {action}
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        await update({ reset: false });
        submitting = false;
      };
    }}
  >
    {#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

    <div class="field">
      <label for="username">Username</label>
      <input
        id="username"
        name="username"
        type="text"
        autocomplete="nickname"
        required
        minlength="3"
        maxlength="30"
        pattern="[a-zA-Z0-9_]+"
        value={form?.username ?? data.suggestion}
      />
      <small>Letters, numbers and underscores.</small>
    </div>

    <button class="btn" type="submit" disabled={submitting}>
      {submitting ? "Saving…" : "Continue"}
    </button>
  </form>
</div>

<style>
  .auth {
    max-width: 420px;
    margin: 0 auto;
  }
</style>
