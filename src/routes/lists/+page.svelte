<script lang="ts">
  import TierListView from "$lib/components/TierListView.svelte";
  import { visibilityChip } from "$lib/visibility";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
</script>

<svelte:head><title>Tier Lists · Hear Me Out</title></svelte:head>

<div class="section-head">
  <h1>My tier lists</h1>
  <a class="btn btn-secondary" href="/templates">Find something to rank</a>
</div>

{#if data.lists.length}
  <div class="list-grid">
    {#each data.lists as list (list.id)}
      {@const chip = visibilityChip(list.visibility)}
      <a class="card list-card" href="/lists/{list.id}">
        <div class="card-head">
          <div>
            <h2>{list.title}</h2>
            <p class="muted meta">
              {list.templates?.title ?? "Template"} · {dateFormat.format(
                new Date(list.updated_at),
              )}
            </p>
          </div>
          {#if chip}<span class="chip">{chip}</span>{/if}
        </div>
        <TierListView
          tiers={list.tiers}
          placements={list.placements}
          items={list.templates?.template_items ?? []}
          compact
        />
      </a>
    {/each}
  </div>
{:else}
  <div class="empty">
    <p>You haven’t made any tier lists yet.</p>
    <a class="btn" href="/templates">Browse templates to rank</a>
  </div>
{/if}

<style>
  .list-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }
  .list-card {
    display: grid;
    gap: 12px;
    align-content: start;
    text-decoration: none;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }
  .list-card:hover {
    transform: translateY(-2px);
    border-color: var(--ink-soft);
  }
  .list-card:hover h2 {
    text-decoration: underline;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .card-head h2 {
    margin: 0;
    font-size: 1.125rem;
  }
  .meta {
    margin: 2px 0 0;
    font-size: 0.875rem;
  }
  .empty .btn {
    margin-top: 8px;
  }
</style>
