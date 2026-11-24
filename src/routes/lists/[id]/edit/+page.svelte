<script lang="ts">
	import BracketForm from "$lib/components/BracketForm.svelte";
	import ListForm from "$lib/components/ListForm.svelte";
	import BlindView from "$lib/components/BlindView.svelte";
	import { enhance } from "$app/forms";
	import { toastFailure } from "$lib/formErrors.svelte";
	import { formatNoun } from "$lib/formats";
	import { LIST_VISIBILITY } from "$lib/visibility";
	import type { PageData } from "./$types";

	// Errors from saving are shown as toasts by the form itself
	let { data }: { data: PageData } = $props();
	let saving = $state(false);
</script>

<svelte:head><title>Edit: {data.list.title} · Hear Me Out</title></svelte:head>

<p class="muted back">
	<a href="/lists/{data.list.id}"
		>← Back to {formatNoun(data.template.format)}</a
	>
</p>
{#if data.template.format === "bracket" && data.template.bracket_seed}
	<h1>Edit bracket</h1>
	<BracketForm
		items={data.items}
		seed={data.template.bracket_seed}
		picks={data.list.picks ?? null}
		title={data.list.title}
		visibility={data.list.visibility}
		submitLabel="Save changes"
	/>
{:else if data.template.format === "blind"}
	<h1>Edit blind ranking</h1>
	<p class="muted">
		The ranking itself is locked, that’s the point of going in blind. You can
		change the title and who can see it.
	</p>
	<form
		class="meta"
		method="POST"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				toastFailure(result);
				await update({ reset: false });
				saving = false;
			};
		}}
	>
		<div class="field">
			<label for="blind-title">Title</label>
			<input
				id="blind-title"
				name="title"
				type="text"
				required
				maxlength="100"
				value={data.list.title}
			/>
		</div>
		<div class="field">
			<label for="blind-visibility">Who can see it?</label>
			<select
				id="blind-visibility"
				name="visibility"
				value={data.list.visibility}
			>
				{#each LIST_VISIBILITY as v (v.value)}<option value={v.value}
						>{v.label}</option
					>{/each}
			</select>
		</div>
		<div class="meta-save">
			<button class="btn" type="submit" disabled={saving}
				>{saving ? "Saving…" : "Save changes"}</button
			>
		</div>
	</form>
	<BlindView slots={data.list.picks ?? []} items={data.items} />
{:else}
	<h1>Edit ranking</h1>
	<ListForm
		items={data.items}
		tiers={data.list.tiers}
		placements={data.list.placements}
		title={data.list.title}
		visibility={data.list.visibility}
		submitLabel="Save changes"
	/>
{/if}

<style>
	.back {
		margin: 0 0 8px;
	}
	.meta {
		display: grid;
		grid-template-columns: 2fr 1fr auto;
		align-items: end;
		gap: 12px;
		margin: 16px 0 24px;
	}
	.meta .field {
		margin: 0;
	}
	@media (max-width: 640px) {
		.meta {
			grid-template-columns: 1fr;
		}
	}
</style>
