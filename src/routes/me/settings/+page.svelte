<script lang="ts">
  import { enhance } from "$app/forms";
  import { MIN_PASSWORD_LENGTH } from "$lib/validation";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let busy = $state<string | null>(null);
  let confirmText = $state("");

  /** Shows a spinner label on the form being submitted and keeps typed values after an error. */
  function submitting(section: string) {
    return () => {
      busy = section;
      return async ({
        update,
      }: {
        update: (opts?: { reset?: boolean }) => Promise<void>;
      }) => {
        await update({ reset: section === "password" });
        busy = null;
      };
    };
  }

  const message = (section: string) =>
    form?.section === section ? form : null;
  const deleteReady = $derived(
    !!data.username &&
      confirmText.trim().toLowerCase() === data.username.toLowerCase(),
  );
</script>

<svelte:head><title>Settings · Hear Me Out</title></svelte:head>

<p class="muted back"><a href="/me">← My page</a></p>
<h1>Settings</h1>

<section class="card setting">
  <h2>Username</h2>
  <p class="muted">Shown on your tier lists and templates.</p>
  <form
    method="POST"
    action="?/username"
    class="form"
    use:enhance={submitting("username")}
  >
    {#if message("username")?.error}<p class="form-error" role="alert">
        {message("username")?.error}
      </p>{/if}
    {#if message("username")?.success}<p class="form-success" role="status">
        {message("username")?.success}
      </p>{/if}
    <div class="field">
      <label for="username">Username</label>
      <input
        id="username"
        name="username"
        type="text"
        required
        minlength="3"
        maxlength="30"
        pattern="[a-zA-Z0-9_]+"
        autocomplete="username"
        value={message("username")?.username ?? data.username ?? ""}
      />
      <small>Letters, numbers and underscores.</small>
    </div>
    <button class="btn" type="submit" disabled={busy === "username"}>
      {busy === "username" ? "Saving…" : "Save username"}
    </button>
  </form>
</section>

<section class="card setting">
  <h2>Password</h2>
  {#if data.email}<p class="muted">
      You log in as <strong>{data.email}</strong>.
    </p>{/if}
  <form
    method="POST"
    action="?/password"
    class="form"
    use:enhance={submitting("password")}
  >
    {#if message("password")?.error}<p class="form-error" role="alert">
        {message("password")?.error}
      </p>{/if}
    {#if message("password")?.success}<p class="form-success" role="status">
        {message("password")?.success}
      </p>{/if}
    <!-- Helps password managers save the new password for the right account -->
    <input
      type="text"
      name="email"
      autocomplete="username"
      value={data.email ?? ""}
      hidden
      readonly
    />
    <div class="field">
      <label for="password">New password</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        minlength={MIN_PASSWORD_LENGTH}
        autocomplete="new-password"
      />
      <small>At least {MIN_PASSWORD_LENGTH} characters.</small>
    </div>
    <div class="field">
      <label for="confirm">Repeat new password</label>
      <input
        id="confirm"
        name="confirm"
        type="password"
        required
        minlength={MIN_PASSWORD_LENGTH}
        autocomplete="new-password"
      />
    </div>
    <button class="btn" type="submit" disabled={busy === "password"}>
      {busy === "password" ? "Saving…" : "Change password"}
    </button>
  </form>
</section>

<section class="card setting danger">
  <h2>Delete account</h2>
  <p>This permanently deletes:</p>
  <ul>
    <li>your account and username,</li>
    <li>all your tier lists,</li>
    <li>
      all your templates and their pictures, <strong
        >including the rankings other people made of them</strong
      >.
    </li>
  </ul>
  <p class="muted">This can’t be undone.</p>
  <form
    method="POST"
    action="?/delete"
    class="form"
    use:enhance={({ cancel }) => {
      if (
        !confirm(
          "Delete your account and everything in it? This can’t be undone.",
        )
      ) {
        cancel();
        return;
      }
      return submitting("delete")();
    }}
  >
    {#if message("delete")?.error}<p class="form-error" role="alert">
        {message("delete")?.error}
      </p>{/if}
    <div class="field">
      <label for="delete-confirm"
        >Type <strong>{data.username}</strong> to confirm</label
      >
      <input
        id="delete-confirm"
        name="confirm"
        type="text"
        autocomplete="off"
        bind:value={confirmText}
      />
    </div>
    <button
      class="btn btn-danger-solid"
      type="submit"
      disabled={!deleteReady || busy === "delete"}
    >
      {busy === "delete" ? "Deleting…" : "Delete my account"}
    </button>
  </form>
</section>

<style>
  .back {
    margin: 0 0 8px;
  }
  .setting {
    max-width: 640px;
    margin-top: 20px;
  }
  .setting h2 {
    margin: 0 0 4px;
    font-size: 1.25rem;
  }
  .setting > p {
    margin: 0 0 12px;
  }
  .setting .form {
    margin-top: 8px;
  }
  .setting .btn {
    justify-self: start;
  }
  .danger {
    border-color: color-mix(in srgb, var(--danger) 45%, var(--line));
  }
  .danger h2 {
    color: var(--danger);
  }
  .danger ul {
    margin: 0 0 8px;
    padding-left: 20px;
  }
  .btn-danger-solid {
    background: var(--danger);
    border-color: var(--danger);
    color: #fff;
  }
</style>
