<script lang="ts">
	import { MAX_ITEMS, newItem, type EditableItem } from '$lib/items';
	import { toast } from '$lib/toast.svelte';
	import { ImageError, labelFromFilename, shrinkImage } from '$lib/upload';

	/** Add, rename, re-image and remove template items. */
	let { items = $bindable() }: { items: EditableItem[] } = $props();

	let dragging = $state(false);
	let processing = $state<{ done: number; total: number } | null>(null);
	let problems = $state<string[]>([]);
	let textLabel = $state('');
	let bulkText = $state('');
	let fileInput: HTMLInputElement;

	const spaceLeft = $derived(MAX_ITEMS - items.length);

	/** Shrinks each image and adds it as an item named after the file. */
	async function addFiles(files: File[]) {
		if (files.length === 0) return;
		problems = [];

		let accepted = files;
		if (files.length > spaceLeft) {
			accepted = files.slice(0, Math.max(0, spaceLeft));
			problems.push(`Only ${MAX_ITEMS} items fit in a template, so ${files.length - accepted.length} file(s) were skipped.`);
		}

		processing = { done: 0, total: accepted.length };
		let added = 0;
		for (const file of accepted) {
			try {
				const blob = await shrinkImage(file);
				items.push(newItem(labelFromFilename(file.name) || 'Untitled', blob));
				added++;
			} catch (err) {
				const reason = err instanceof ImageError ? err.message : 'something went wrong';
				problems.push(`${file.name}: ${reason}.`);
			}
			processing.done++;
		}
		processing = null;

		if (added > 0) toast(`Added ${added} ${added === 1 ? 'item' : 'items'}.`);
		if (problems.length && added === 0) toast('No images were added. See the details below.', 'error');
	}

	function onPick(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = ''; // allow picking the same files again
		addFiles(files);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		addFiles(Array.from(e.dataTransfer?.files ?? []));
	}

	/** Paste screenshots or copied images straight into the template. */
	function onPaste(e: ClipboardEvent) {
		const target = e.target;
		if (target instanceof Element && target.closest('input[type="text"], textarea')) return; // normal text paste
		const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
		if (files.length) {
			e.preventDefault();
			addFiles(files);
		}
	}

	async function replaceImage(item: EditableItem, e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		try {
			const blob = await shrinkImage(file);
			if (item.blob && item.preview) URL.revokeObjectURL(item.preview);
			item.blob = blob;
			item.imagePath = null;
			item.preview = URL.createObjectURL(blob);
		} catch (err) {
			toast(`${file.name}: ${err instanceof ImageError ? err.message : 'something went wrong'}.`, 'error');
		}
	}

	function removeImage(item: EditableItem) {
		if (item.blob && item.preview) URL.revokeObjectURL(item.preview);
		item.blob = null;
		item.imagePath = null;
		item.preview = null;
	}

	function removeItem(index: number) {
		const [item] = items.splice(index, 1);
		if (item?.blob && item.preview) URL.revokeObjectURL(item.preview);
	}

	function addText() {
		const label = textLabel.trim().slice(0, 80);
		if (!label || spaceLeft <= 0) return;
		items.push(newItem(label));
		textLabel = '';
	}

	function addTextList() {
		const labels = bulkText
			.split('\n')
			.map((l) => l.trim().slice(0, 80))
			.filter(Boolean)
			.slice(0, spaceLeft);
		for (const label of labels) items.push(newItem(label));
		if (labels.length) toast(`Added ${labels.length} ${labels.length === 1 ? 'item' : 'items'}.`);
		bulkText = '';
	}
</script>

<svelte:window onpaste={onPaste} />

<div class="items-editor">
	<!-- Images: click to choose, drag files in, or paste -->
	<div
		class="dropzone"
		class:dragging
		class:busy={processing}
		role="button"
		tabindex="0"
		aria-label="Add images. Choose files or drop them here."
		onclick={() => fileInput.click()}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fileInput.click())}
		ondragenter={(e) => (e.preventDefault(), (dragging = true))}
		ondragover={(e) => e.preventDefault()}
		ondragleave={(e) => {
			if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) dragging = false;
		}}
		ondrop={onDrop}
	>
		{#if processing}
			<strong>Adding images… {processing.done}/{processing.total}</strong>
			<div class="progress" aria-hidden="true">
				<span style:width="{(processing.done / processing.total) * 100}%"></span>
			</div>
		{:else}
			<span class="drop-icon" aria-hidden="true">⬆</span>
			<strong>{dragging ? 'Drop to add them' : 'Drop images here, or click to choose'}</strong>
			<span class="muted">Pick as many as you like. Each image becomes an item, named after its file.</span>
		{/if}
		<input
			bind:this={fileInput}
			type="file"
			accept="image/*,.heic,.heif"
			multiple
			hidden
			onchange={onPick}
		/>
	</div>

	{#if problems.length}
		<div class="problems" role="alert">
			<div class="problems-head">
				<strong>Some files couldn’t be added</strong>
				<button type="button" class="link-button" onclick={() => (problems = [])}>Dismiss</button>
			</div>
			<ul>
				{#each problems as p, i (i)}<li>{p}</li>{/each}
			</ul>
		</div>
	{/if}

	<!-- Text-only items -->
	<div class="text-add">
		<input
			type="text"
			bind:value={textLabel}
			maxlength="80"
			placeholder="Or type an item name and press Enter"
			aria-label="New text item"
			onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addText())}
		/>
		<button class="btn btn-secondary btn-small" type="button" onclick={addText} disabled={!textLabel.trim() || spaceLeft <= 0}>
			Add
		</button>
	</div>
	<details class="bulk">
		<summary>Paste a list of text items (one per line)</summary>
		<textarea bind:value={bulkText} placeholder={'Lasagne\nFish fingers\nSalad bar'}></textarea>
		<button class="btn btn-secondary btn-small" type="button" onclick={addTextList} disabled={!bulkText.trim()}>
			Add these
		</button>
	</details>

	<!-- The items -->
	<div class="items-head">
		<span class="field-label">Items</span>
		<span class="muted">{items.length}/{MAX_ITEMS}</span>
	</div>

	{#if items.length}
		<ul class="item-grid">
			{#each items as item, i (item.key)}
				<li class="item-card" class:is-new={!item.id}>
					<label class="thumb" title={item.preview ? 'Replace image' : 'Add an image'}>
						{#if item.preview}
							<img src={item.preview} alt="" />
						{:else}
							<span class="thumb-empty" aria-hidden="true">＋ image</span>
						{/if}
						<span class="visually-hidden">{item.preview ? 'Replace' : 'Add'} image for {item.label || `item ${i + 1}`}</span>
						<input type="file" accept="image/*,.heic,.heif" onchange={(e) => replaceImage(item, e)} />
					</label>
					<input
						class="label-input"
						type="text"
						bind:value={item.label}
						maxlength="80"
						required
						placeholder="Item name"
						aria-label="Name of item {i + 1}"
					/>
					<div class="card-actions">
						{#if item.preview}
							<button type="button" class="link-button muted" onclick={() => removeImage(item)}>Remove image</button>
						{/if}
						<button
							type="button"
							class="icon-button remove"
							onclick={() => removeItem(i)}
							aria-label="Remove {item.label || `item ${i + 1}`}">✕</button
						>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">No items yet. Add some images or type a few names above.</p>
	{/if}
</div>

<style>
	.items-editor {
		display: grid;
		gap: 12px;
	}
	.dropzone {
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 28px 16px;
		border: 2px dashed var(--line);
		border-radius: var(--radius);
		background: var(--surface);
		text-align: center;
		cursor: pointer;
		transition:
			border-color 0.12s ease,
			background 0.12s ease;
	}
	.dropzone:hover,
	.dropzone.dragging {
		border-color: var(--focus);
		background: color-mix(in srgb, var(--focus) 6%, var(--surface));
	}
	.dropzone.busy {
		cursor: progress;
	}
	.drop-icon {
		font-size: 1.5rem;
		line-height: 1;
	}
	.progress {
		width: min(260px, 80%);
		height: 6px;
		border-radius: 3px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.progress span {
		display: block;
		height: 100%;
		background: var(--focus);
		transition: width 0.15s ease;
	}
	.problems {
		padding: 12px 14px;
		border-radius: var(--radius-small);
		background: color-mix(in srgb, var(--danger) 10%, transparent);
		color: var(--ink);
	}
	.problems-head {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}
	.problems ul {
		margin: 6px 0 0;
		padding-left: 18px;
		font-size: 0.875rem;
	}
	.text-add {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;
	}
	.bulk summary {
		cursor: pointer;
		color: var(--ink-soft);
		font-size: 0.9375rem;
	}
	.bulk[open] {
		display: grid;
		gap: 8px;
		padding: 12px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
	}
	.bulk button {
		justify-self: start;
	}
	.items-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-top: 8px;
	}
	.item-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 10px;
	}
	.item-card {
		display: grid;
		gap: 6px;
		padding: 8px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
		background: var(--surface);
		animation: pop-in 0.18s ease-out;
	}
	.thumb {
		position: relative;
		aspect-ratio: 1;
		border-radius: 6px;
		overflow: hidden;
		background: var(--surface-2);
		display: grid;
		place-items: center;
		cursor: pointer;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.thumb-empty {
		color: var(--ink-soft);
		font-size: 0.8125rem;
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
	.label-input {
		padding: 6px 8px;
		font-size: 0.875rem;
	}
	.card-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.8125rem;
		min-height: 32px;
	}
	.remove {
		margin-left: auto;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
	@keyframes pop-in {
		from {
			transform: scale(0.94);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.item-card {
			animation: none;
		}
	}
</style>
