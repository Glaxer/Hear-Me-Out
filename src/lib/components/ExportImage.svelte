<script lang="ts">
	import {
		imageFileName,
		renderTierListImage,
		type ExportOptions
	} from "$lib/exportImage";
	import { toast } from "$lib/toast.svelte";

	/** "Save as image": renders the tier list, shows a preview, then copy or download. */
	let { options }: { options: ExportOptions } = $props();

	let dialog = $state<HTMLDialogElement>();
	let blob = $state<Blob | null>(null);
	let previewUrl = $state<string | null>(null);
	let busy = $state(false);
	let failed = $state(false);

	const fileName = $derived(imageFileName(options.title));
	// Copying images needs ClipboardItem (all current desktop browsers; some older phones lack it)
	let canCopy = $state(false);

	async function open() {
		dialog?.showModal();
		if (blob) return; // already rendered
		busy = true;
		failed = false;
		try {
			blob = await renderTierListImage(options);
			previewUrl = URL.createObjectURL(blob);
			canCopy =
				typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
		} catch {
			failed = true;
		} finally {
			busy = false;
		}
	}

	function close() {
		dialog?.close();
	}

	async function copy() {
		if (!blob) return;
		try {
			await navigator.clipboard.write([
				new ClipboardItem({ "image/png": blob })
			]);
			toast("Image copied. Paste it anywhere with Ctrl+V.");
			close();
		} catch {
			toast("Couldn’t copy the image. Try Download instead.", "error");
		}
	}

	function download() {
		if (!previewUrl) return;
		const a = Object.assign(document.createElement("a"), {
			href: previewUrl,
			download: fileName
		});
		a.click();
		close();
	}

	// The tier list can change (e.g. after editing); render a fresh image next time
	$effect(() => {
		void options;
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			previewUrl = null;
			blob = null;
		};
	});
</script>

<button class="btn btn-secondary btn-small export" type="button" onclick={open}>
	<span aria-hidden="true">🖼</span> Save as image
</button>

<dialog
	bind:this={dialog}
	class="export-dialog"
	aria-labelledby="export-title"
	onclick={(e) => e.target === dialog && close()}
>
	<div class="inner">
		<div class="head">
			<h2 id="export-title">Save as image</h2>
			<button
				type="button"
				class="icon-button"
				onclick={close}
				aria-label="Close">✕</button
			>
		</div>

		<div class="preview">
			{#if busy}
				<p class="muted">Creating the image…</p>
			{:else if failed}
				<p class="form-error" role="alert">
					Sorry, the image couldn’t be created. Please try again.
				</p>
			{:else if previewUrl}
				<img
					src={previewUrl}
					alt="{options.title}, as it will look when saved"
				/>
			{/if}
		</div>

		<div class="actions">
			{#if canCopy}
				<button type="button" class="btn" onclick={copy} disabled={!blob}
					>Copy image</button
				>
			{/if}
			<button
				type="button"
				class="btn btn-secondary"
				onclick={download}
				disabled={!blob}>Download</button
			>
		</div>
	</div>
</dialog>

<style>
	.export {
		white-space: nowrap;
	}
	.export-dialog {
		width: min(760px, calc(100vw - 32px));
		max-height: calc(100vh - 32px);
		padding: 0;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		box-shadow: var(--shadow);
	}
	.export-dialog::backdrop {
		background: rgba(0, 0, 0, 0.55);
	}
	.inner {
		display: grid;
		gap: 14px;
		padding: 18px;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.head h2 {
		margin: 0;
		font-size: 1.25rem;
	}
	.preview {
		display: grid;
		place-items: center;
		min-height: 160px;
		max-height: 60vh;
		overflow: auto;
		border-radius: var(--radius-small);
		background: var(--surface-2);
	}
	.preview img {
		width: 100%;
		height: auto;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		flex-wrap: wrap;
	}
</style>
