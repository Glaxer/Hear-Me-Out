<script lang="ts">
	import { tick } from "svelte";
	import { flip } from "svelte/animate";
	import {
		imagesToItems,
		MAX_ITEMS,
		newItem,
		type EditableItem
	} from "$lib/items";
	import { toast } from "$lib/toast.svelte";
	import { ImageError, processImage } from "$lib/upload";

	/**
	 * Add, rename, re-image, reorder and remove template items. `max`: most items allowed.
	 * Reorder by dragging a card's grip handle (mouse or finger), or by focusing the handle
	 * and using the arrow keys.
	 */
	let {
		items = $bindable(),
		max = MAX_ITEMS
	}: { items: EditableItem[]; max?: number } = $props();

	let dragging = $state(false);
	let processing = $state<{ done: number; total: number } | null>(null);
	let problems = $state<string[]>([]);
	let textLabel = $state("");
	let bulkText = $state("");
	let fileInput = $state<HTMLInputElement>();

	const spaceLeft = $derived(max - items.length);

	/** Shrinks each image and adds it as an item named after the file. */
	async function addFiles(files: File[]) {
		if (files.length === 0) return;
		problems = [];
		const result = await imagesToItems(
			files,
			spaceLeft,
			(item) => items.push(item),
			(done, total) => (processing = { done, total }),
			max
		);
		processing = null;
		problems = result.problems;
		const added = result.added;

		if (added > 0) toast(`Added ${added} ${added === 1 ? "item" : "items"}.`);
		if (problems.length && added === 0)
			toast("No images were added. See the details below.", "error");
	}

	function onPick(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = ""; // allow picking the same files again
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
		if (
			target instanceof Element &&
			target.closest('input[type="text"], textarea')
		)
			return; // normal text paste
		const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
			f.type.startsWith("image/")
		);
		if (files.length) {
			e.preventDefault();
			addFiles(files);
		}
	}

	async function replaceImage(item: EditableItem, e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = "";
		if (!file) return;
		try {
			const image = await processImage(file);
			if (item.blob && item.preview) URL.revokeObjectURL(item.preview);
			item.blob = image.thumb;
			item.fullBlob = image.full;
			item.imagePath = null;
			item.fullImagePath = null;
			item.preview = URL.createObjectURL(image.thumb);
		} catch (err) {
			toast(
				`${file.name}: ${err instanceof ImageError ? err.message : "something went wrong"}.`,
				"error"
			);
		}
	}

	function removeImage(item: EditableItem) {
		if (item.blob && item.preview) URL.revokeObjectURL(item.preview);
		item.blob = null;
		item.fullBlob = null;
		item.imagePath = null;
		item.fullImagePath = null;
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
		textLabel = "";
	}

	function addTextList() {
		const labels = bulkText
			.split("\n")
			.map((l) => l.trim().slice(0, 80))
			.filter(Boolean)
			.slice(0, spaceLeft);
		for (const label of labels) items.push(newItem(label));
		if (labels.length)
			toast(
				`Added ${labels.length} ${labels.length === 1 ? "item" : "items"}.`
			);
		bulkText = "";
	}

	// ---------- Reordering ----------

	let grid = $state<HTMLUListElement>();
	/** The item being dragged by its handle. */
	let draggingKey = $state<string | null>(null);
	/** The card the pointer was last over, so each card only triggers one move. */
	let lastOver: string | null = null;

	function move(from: number, to: number) {
		if (from === to || from < 0 || to < 0 || to >= items.length) return;
		const [item] = items.splice(from, 1);
		items.splice(to, 0, item);
	}

	function onGripDown(e: PointerEvent, key: string) {
		if (e.button !== 0) return;
		e.preventDefault();
		draggingKey = key;
		lastOver = key;
		// Listen on the window: moving the card in the page would end pointer capture on it
		window.addEventListener("pointermove", onGripMove);
		window.addEventListener("pointerup", onGripUp);
		window.addEventListener("pointercancel", onGripUp);
	}

	/** While dragging: the card jumps into the place of whichever card the pointer is over. */
	function onGripMove(e: PointerEvent) {
		if (!draggingKey || !grid) return;
		// Near the top or bottom of the screen: scroll, so long lists can be reordered too
		const edge = 60;
		if (e.clientY < edge) window.scrollBy(0, -14);
		else if (e.clientY > window.innerHeight - edge) window.scrollBy(0, 14);

		// Compare with where cards sit in the layout (offsetLeft/Top), not where they are drawn
		// mid-animation, so the cards sliding aside don't confuse which one is under the pointer
		const box = grid.getBoundingClientRect();
		const x = e.clientX - box.left;
		const y = e.clientY - box.top;
		for (const card of grid.querySelectorAll<HTMLElement>("[data-key]")) {
			const inside =
				x >= card.offsetLeft &&
				x <= card.offsetLeft + card.offsetWidth &&
				y >= card.offsetTop &&
				y <= card.offsetTop + card.offsetHeight;
			if (!inside) continue;
			const key = card.dataset.key!;
			if (key === lastOver) return;
			lastOver = key;
			if (key !== draggingKey)
				move(
					items.findIndex((i) => i.key === draggingKey),
					items.findIndex((i) => i.key === key)
				);
			return;
		}
	}

	function onGripUp() {
		draggingKey = null;
		lastOver = null;
		window.removeEventListener("pointermove", onGripMove);
		window.removeEventListener("pointerup", onGripUp);
		window.removeEventListener("pointercancel", onGripUp);
	}

	/** Keyboard: arrow keys move the item one place; focus follows it. */
	async function onGripKey(e: KeyboardEvent, index: number) {
		const step =
			e.key === "ArrowLeft" || e.key === "ArrowUp"
				? -1
				: e.key === "ArrowRight" || e.key === "ArrowDown"
					? 1
					: 0;
		if (!step) return;
		e.preventDefault();
		const key = items[index].key;
		move(index, index + step);
		await tick();
		grid?.querySelector<HTMLElement>(`[data-key="${key}"] .grip`)?.focus();
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
		onclick={() => fileInput?.click()}
		onkeydown={(e) =>
			(e.key === "Enter" || e.key === " ") &&
			(e.preventDefault(), fileInput?.click())}
		ondragenter={(e) => (e.preventDefault(), (dragging = true))}
		ondragover={(e) => e.preventDefault()}
		ondragleave={(e) => {
			if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node))
				dragging = false;
		}}
		ondrop={onDrop}
	>
		{#if processing}
			<strong>Adding images… {processing.done}/{processing.total}</strong>
			<div class="progress" aria-hidden="true">
				<span style:width="{(processing.done / processing.total) * 100}%"
				></span>
			</div>
		{:else}
			<!-- A stack of pictures: you can add several at once -->
			<svg
				class="drop-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<rect x="7" y="3" width="14" height="14" rx="2" />
				<circle cx="11.5" cy="7.5" r="1.3" />
				<path d="m21 13-3.5-3.5L10 17" />
				<path d="M4 7v11a2 2 0 0 0 2 2h11" />
			</svg>
			<strong
				>{dragging
					? "Drop to add them"
					: "Drop images here, or click to choose"}</strong
			>
			<span class="muted"
				>Pick as many as you like. Each image becomes an item, named after its
				file.</span
			>
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
				<button
					type="button"
					class="link-button"
					onclick={() => (problems = [])}>Dismiss</button
				>
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
			onkeydown={(e) => e.key === "Enter" && (e.preventDefault(), addText())}
		/>
		<button
			class="btn btn-secondary btn-small"
			type="button"
			onclick={addText}
			disabled={!textLabel.trim() || spaceLeft <= 0}
		>
			Add
		</button>
	</div>
	<details class="bulk">
		<summary>Paste a list of text items (one per line)</summary>
		<textarea
			bind:value={bulkText}
			placeholder={"Lasagne\nFish fingers\nSalad bar"}></textarea>
		<button
			class="btn btn-secondary btn-small"
			type="button"
			onclick={addTextList}
			disabled={!bulkText.trim()}
		>
			Add these
		</button>
	</details>

	<!-- The items -->
	<div class="items-head">
		<span class="field-label">Items</span>
		<span class="muted">{items.length}/{max}</span>
	</div>

	{#if items.length}
		<ul class="item-grid" bind:this={grid}>
			{#each items as item, i (item.key)}
				<li
					class="item-card"
					class:is-new={!item.id}
					class:dragging={draggingKey === item.key}
					data-key={item.key}
					animate:flip={{ duration: 180 }}
				>
					{#if items.length > 1}
						<button
							type="button"
							class="grip"
							aria-label="Move {item.label || `item ${i + 1}`} (position {i +
								1} of {items.length}). Drag, or use the arrow keys."
							onpointerdown={(e) => onGripDown(e, item.key)}
							onkeydown={(e) => onGripKey(e, i)}
						>
							<svg viewBox="0 0 12 18" aria-hidden="true">
								{#each [3, 9, 15] as y (y)}
									<circle cx="3" cy={y} r="1.6" />
									<circle cx="9" cy={y} r="1.6" />
								{/each}
							</svg>
							<span class="position">{i + 1}</span>
						</button>
					{/if}
					<label
						class="thumb"
						title={item.preview ? "Replace image" : "Add an image"}
					>
						{#if item.preview}
							<img src={item.preview} alt="" />
						{:else}
							<span class="thumb-empty" aria-hidden="true">＋ image</span>
						{/if}
						<span class="visually-hidden"
							>{item.preview ? "Replace" : "Add"} image for {item.label ||
								`item ${i + 1}`}</span
						>
						<input
							type="file"
							accept="image/*,.heic,.heif"
							onchange={(e) => replaceImage(item, e)}
						/>
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
							<button
								type="button"
								class="link-button muted"
								onclick={() => removeImage(item)}>Remove image</button
							>
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
		<p class="empty">
			No items yet. Add some images or type a few names above.
		</p>
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
		width: 34px;
		height: 34px;
		margin-bottom: 2px;
		transition: transform 0.12s ease;
	}
	/* A little lift while files are held over the box */
	.dropzone.dragging .drop-icon {
		transform: translateY(-3px);
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
		position: relative; /* the cards' offsetLeft/Top are measured from here */
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 10px;
	}
	.item-card {
		position: relative;
		display: grid;
		gap: 6px;
		padding: 8px;
		border: 1px solid var(--line);
		border-radius: var(--radius-small);
		background: var(--surface);
		animation: pop-in 0.18s ease-out;
	}
	/* Grip handle in the top-left corner, over the picture */
	.grip {
		position: absolute;
		top: 12px;
		left: 12px;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 7px 4px 5px;
		border: none;
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface) 88%, transparent);
		color: var(--ink);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1;
		cursor: grab;
		touch-action: none; /* dragging with a finger moves the card, not the page */
		box-shadow: var(--shadow);
	}
	.grip svg {
		width: 9px;
		height: 14px;
		fill: currentColor;
	}
	.grip:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}
	.item-card.dragging {
		z-index: 3;
		border-color: var(--ink);
		box-shadow:
			0 0 0 1px var(--ink),
			var(--shadow);
	}
	.item-card.dragging .grip {
		cursor: grabbing;
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
		.drop-icon {
			transition: none;
		}
	}
</style>
