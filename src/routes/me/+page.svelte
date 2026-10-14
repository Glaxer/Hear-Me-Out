<script lang="ts">
  import TemplateCard from "$lib/components/TemplateCard.svelte";
  import { visibilityChip } from "$lib/visibility";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
</script>

<svelte:head
  ><title>{data.username ?? "My page"} · Hear Me Out</title></svelte:head
>

<div class="account card">
  <div class="who">
    <span class="avatar" aria-hidden="true"
      >{(data.username ?? "?").slice(0, 2).toUpperCase()}</span
    >
    <div>
      <h1>{data.username ?? "My page"}</h1>
      {#if data.email}<p class="muted">{data.email}</p>{/if}
    </div>
  </div>
  <div class="account-actions">
    <a class="btn btn-secondary btn-small" href="/me/settings">Settings</a>
    <form method="POST" action="/logout">
      <button class="btn btn-secondary btn-small" type="submit">Log out</button>
    </form>
  </div>
</div>

<section class="section">
  <div class="section-head">
    <h2>My tier lists</h2>
    <a href="/templates">Find something to rank</a>
  </div>
  {#if data.lists.length}
    <ul class="lists">
      {#each data.lists as list (list.id)}
        {@const chip = visibilityChip(list.visibility)}
        <li class="card list-row">
          <div>
            <a class="list-title" href="/lists/{list.id}">{list.title}</a>
            <p class="muted">
              <a href="/templates/{list.template_id}">{list.templates?.title}</a
              >
              · updated
              {dateFormat.format(new Date(list.updated_at))}
            </p>
          </div>
          <div class="row">
            {#if chip}<span class="chip">{chip}</span>{/if}
            <a class="btn btn-secondary btn-small" href="/lists/{list.id}/edit"
              >Edit</a
            >
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">You haven’t ranked anything yet.</p>
  {/if}
</section>

<section class="section">
  <div class="section-head">
    <h2>My templates</h2>
    <a class="btn btn-small" href="/templates/new">New template</a>
  </div>
  {#if data.templates.length}
    <div class="card-grid">
      {#each data.templates as template (template.id)}
        <TemplateCard {template} previewItems={template.template_items} />
      {/each}
    </div>
  {:else}
    <p class="empty">No templates yet.</p>
  {/if}
</section>

<style>
  .account {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .account-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .account-actions form {
    margin: 0;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .who h1 {
    margin: 0;
    font-size: clamp(1.75rem, 4vw, 2.25rem);
  }
  .who p {
    margin: 2px 0 0;
  }
  .avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--tier-s);
    color: #111;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.25rem;
    letter-spacing: 0.02em;
    flex: none;
  }
  .lists {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;
  }
  .list-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px 18px;
  }
  .list-title {
    font-weight: 600;
    font-size: 1.0625rem;
  }
  .list-row p {
    margin: 2px 0 0;
    font-size: 0.875rem;
  }
</style>
