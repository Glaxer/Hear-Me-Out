<script lang="ts">
	import { enhance } from '$app/forms';
	import TierControls from '$lib/components/TierControls.svelte';
	import { CATEGORIES, defaultTiers } from '$lib/tiers';
	import { labelFromFilename, uploadItemImage } from '$lib/upload';
	import type { Tier } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	interface Row {
		key: string;
		label: string;
		file: File | null;
		preview: string | null;
	}

	let tiers = $state<Tier[]>(defaultTiers());
	let rows = $state<Row[]>([]);
	let bulkText = $state('');
	let status = $state<string | null>(null);
	let clientError = $state<string | null>(null);
	let submitting = $state(false);

	const MAX_FILE_MB = 10;

	function addRow(label = '', file: File | null = null) {
		rows.push({
			key: crypto.randomUUID(),
			label,
			file,
			preview: file ? URL.createObjectURL(file) : null
		});
	}

	function removeRow(index: number) {
		const [row] = rows.splice(index, 1);
		if (row.preview) URL.revokeObjectURL(row.preview);
	}

	function setRowFile(row: Row, file: File | null) {
		if (row.preview) URL.revokeObjectURL(row.preview);
		row.file = file;
		row.preview = file ? URL.createObjectURL(file) : null;
		if (file && !row.label.trim()) row.label = labelFromFilename(file.name);
	}

	function addImages(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		for (const file of Array.from(input.files ?? [])) {
			if (file.size > MAX_FILE_MB * 1024 * 1024) continue;
			addRow(labelFromFilename(file.name), file);
		}
		input.value = '';
	}

	function addTextItems() {
		for (const line of bulkText.split('\n')) {
			const label = line.trim().slice(0, 80);
			if (label) addRow(label);
		}
		bulkText = '';
	}

	// Start with two empty rows so the form doesn't look empty
	addRow();
	addRow();
</script>

<svelte:head><title>New template · Hear Me Out</title></svelte:head>

<h1>New template</h1>
<p class="muted">
	A template is the set of things people rank. After you save it, you’ll make your own ranking
	and get a link to share.
</p>

<form
	class="form wide"
	method="POST"
	use:enhance={async ({ formData, cancel }) => {
		clientError = null;
		const filled = rows.filter((r) => r.label.trim());
		if (filled.length < 2) {
			clientError = 'Add at least two items to rank.';
			cancel();
			return;
		}

		submitting = true;
		try {
			let done = 0;
			const withImages = filled.filter((r) => r.file).length;
			for (const row of filled) {
				let path = '';
				if (row.file && data.user) {
					status = `Uploading images… ${++done}/${withImages}`;
					path = await uploadItemImage(data.user.id, row.file);
				}
				formData.append('item_label', row.label.trim());
				formData.append('item_image', path);
			}
			status = 'Saving…';
		} catch (err) {
			clientError = `Image upload failed: ${err instanceof Error ? err.message : 'unknown error'}`;
			submitting = false;
			status = null;
			cancel();
			return;
		}

		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
			status = null;
		};
	}}
>
	{#if form?.error || clientError}
		<p class="form-error" role="alert">{clientError ?? form?.error}</p>
	{/if}

	<div class="field">
		<label for="title">Title</label>
		<input id="title" name="title" type="text" required maxlength="100" placeholder="Cafeteria food, week 42" />
	</div>

	<div class="field">
		<label for="description">Description <span class="muted">(optional)</span></label>
		<textarea id="description" name="description" maxlength="500" placeholder="What are we ranking, and why?"></textarea>
	</div>

	<div class="field">
		<label for="category">Category</label>
		<select id="category" name="category" required>
			{#each CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}
		</select>
	</div>

	<fieldset class="field">
		<legend class="field-label">Tiers</legend>
		<small>The starting tiers. People can still rename or add tiers in their own ranking.</small>
		<TierControls bind:tiers />
		<input type="hidden" name="tiers" value={JSON.stringify(tiers)} />
	</fieldset>

	<fieldset class="field">
		<legend class="field-label">Items <span class="muted">({rows.length})</span></legend>

		<div class="add-tools">
			<label class="btn btn-secondary btn-small file-btn">
				+ Add images
				<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onchange={addImages} />
			</label>
			<button class="btn btn-secondary btn-small" type="button" onclick={() => addRow()}>+ Add one item</button>
		</div>

		<details class="bulk">
			<summary>Paste a list of text items</summary>
			<textarea bind:value={bulkText} placeholder={'Lasagne\nFish fingers\nSalad bar'}></textarea>
			<button class="btn btn-secondary btn-small" type="button" onclick={addTextItems} disabled={!bulkText.trim()}>
				Add these
			</button>
		</details>

		<ul class="item-rows">
			{#each rows as row, i (row.key)}
				<li class="item-row">
					<label class="thumb" title="Choose image">
						{#if row.preview}
							<img src={row.preview} alt="" />
						{:else}
							<span aria-hidden="true">＋</span>
						{/if}
						<span class="visually-hidden">Image for item {i + 1}</span>
						<input
							type="file"
							accept="image/png,image/jpeg,image/webp,image/gif"
							onchange={(e) => setRowFile(row, e.currentTarget.files?.[0] ?? null)}
						/>
					</label>
					<input
						type="text"
						bind:value={row.label}
						maxlength="80"
						placeholder="Item name"
						aria-label="Name of item {i + 1}"
					/>
					{#if row.file}
						<button class="icon-button" type="button" onclick={() => setRowFile(row, null)} aria-label="Remove image from item {i + 1}">⌫</button>
					{:else}
						<span></span>
					{/if}
					<button class="icon-button" type="button" onclick={() => removeRow(i)} aria-label="Remove item {i + 1}">✕</button>
				</li>
			{/each}
		</ul>
	</fieldset>

	<div class="row">
		<button class="btn" type="submit" disabled={submitting}>
			{submitting ? (status ?? 'Saving…') : 'Save template & start ranking'}
		</button>
		<a href="/templates" class="muted">Cancel</a>
	</div>
</form>

<style>
	.wide {
		max-width: 720px;
	}
	fieldset {
		border: none;
		padding: 0;
		margin: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 6px;
	}
	.add-tools {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.file-btn {
		position: relative;
		overflow: hidden;
	}
	.file-btn input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
	.bulk {
		display: grid;
		gap: 8px;
	}
	.bulk summary {
		cursor: pointer;
		color: var(--ink-soft);
	}
	.bulk[open] {
		padding: 12px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
	}
	.bulk[open] > * + * {
		margin-top: 8px;
	}
	.item-rows {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
	}
	.item-row {
		display: grid;
		grid-template-columns: 48px 1fr 32px 32px;
		gap: 8px;
		align-items: center;
	}
	.thumb {
		position: relative;
		width: 48px;
		height: 48px;
		border-radius: 8px;
		border: 1px dashed var(--line);
		background: var(--surface-2);
		display: grid;
		place-items: center;
		overflow: hidden;
		cursor: pointer;
		color: var(--ink-soft);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.thumb input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
	.thumb:focus-within {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
</style>
