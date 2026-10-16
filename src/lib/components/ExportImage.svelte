<script lang="ts">
	import {
		imageFileName,
		renderTierListImage,
		type ExportOptions
	} from "$lib/exportImage";
	import { copyText } from "$lib/clipboard";
	import Skeleton from "./Skeleton.svelte";
	import { toast } from "$lib/toast.svelte";

	/**
	 * "Share": one dialog with every way to share a tier list (or a verdict):
	 * copy the link, copy the picture, or download the picture.
	 * Without `shareUrl` (not saved yet, or private) only the picture options are offered,
	 * with `noLinkHint` explaining why.
	 * `optional` adds a checkbox for leaving an extra section (e.g. hot takes) out of the picture.
	 */
	let {
		options,
		shareUrl = null,
		noLinkHint = "",
		optional = null
	}: {
		options: ExportOptions;
		shareUrl?: string | null;
		noLinkHint?: string;
		optional?: { key: "divisive" | "hotTakes"; label: string } | null;
	} = $props();

	let includeExtra = $state(true);
	/** What actually goes into the picture, with or without the optional section. */
	const pictureOptions = $derived<ExportOptions>(
		optional && !includeExtra
			? { ...options, [optional.key]: undefined }
			: options
	);

	let dialog = $state<HTMLDialogElement>();
	let blob = $state<Blob | null>(null);
	let previewUrl = $state<string | null>(null);
	let busy = $state(false);
	let failed = $state(false);

	const fileName = $derived(imageFileName(options.title));
	// Copying images needs ClipboardItem (all current desktop browsers; some older phones lack it)
	let canCopy = $state(false);

	/** Counts renders, so a slow older render can't overwrite a newer one. */
	let renderId = 0;

	async function render() {
		const id = ++renderId;
		busy = true;
		failed = false;
		// Drop the old picture straight away, so it's clear a new one is being made
		// and nothing can copy or download the old one meanwhile
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
		blob = null;
		try {
			const next = await renderTierListImage(pictureOptions);
			if (id !== renderId) return;
			blob = next;
			previewUrl = URL.createObjectURL(next);
		} catch {
			if (id === renderId) failed = true;
		} finally {
			if (id === renderId) busy = false;
		}
	}

	async function open() {
		// Known before the picture is ready, so the buttons don't shift when it arrives
		canCopy =
			typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
		dialog?.showModal();
		if (!blob) await render(); // otherwise already rendered
	}

	/** Ticking or unticking the extra section redraws the preview straight away. */
	function toggleExtra(event: Event) {
		includeExtra = (event.currentTarget as HTMLInputElement).checked;
		render();
	}

	function close() {
		dialog?.close();
	}

	async function copyLink() {
		if (!shareUrl) return;
		if (await copyText(shareUrl)) {
			toast("Link copied. Paste it anywhere to share.");
			close();
		} else {
			toast(
				"Couldn’t copy the link. Copy it from the address bar instead.",
				"error"
			);
		}
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
	Share
</button>

<dialog
	bind:this={dialog}
	class="export-dialog"
	aria-labelledby="export-title"
	onclick={(e) => e.target === dialog && close()}
>
	<div class="inner">
		<div class="head">
			<h2 id="export-title">Share</h2>
			<button
				type="button"
				class="icon-button"
				onclick={close}
				aria-label="Close">✕</button
			>
		</div>

		<div class="preview" aria-busy={busy}>
			{#if failed}
				<p class="form-error" role="alert">
					Sorry, the image couldn’t be created. Please try again.
				</p>
			{:else if previewUrl && !busy}
				<img
					src={previewUrl}
					alt="{options.title}, as it will look as a picture"
				/>
			{:else}
				<!-- The preview area has a fixed height, so swapping to this doesn't make the
				     dialog jump -->
				<div class="loading">
					<Skeleton height="100%" radius="0" label="Creating the image…" />
					<span class="loading-text" aria-hidden="true"
						>Creating the image…</span
					>
				</div>
			{/if}
		</div>

		{#if optional}
			<label class="extra">
				<input type="checkbox" checked={includeExtra} onchange={toggleExtra} />
				{optional.label}
			</label>
		{/if}

		<div class="actions">
			{#if !shareUrl && noLinkHint}
				<p class="muted no-link">{noLinkHint}</p>
			{/if}
			{#if shareUrl}
				<button type="button" class="btn" onclick={copyLink}>Copy link</button>
			{/if}
			{#if canCopy}
				<button
					type="button"
					class="btn"
					class:btn-secondary={!!shareUrl}
					onclick={copy}
					disabled={busy || !blob}>Copy image</button
				>
			{/if}
			<button
				type="button"
				class="btn btn-secondary"
				onclick={download}
				disabled={busy || !blob}>Download image</button
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
	/* Fixed height, so the dialog keeps its size whatever the picture's height
	   (taller pictures scroll, shorter ones sit in the middle) */
	.preview {
		display: flex;
		height: min(60vh, 620px);
		overflow: auto;
		border-radius: var(--radius-small);
		background: var(--surface-2);
	}
	/* Auto margins centre a short picture but still let a tall one scroll from the top */
	.preview > :global(*) {
		width: 100%;
		margin: auto 0;
		flex: none;
	}
	.preview img {
		height: auto;
	}
	.loading {
		position: relative;
		height: 100%;
	}
	.loading-text {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-size: 0.9375rem;
		color: var(--ink-soft);
	}
	.extra {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9375rem;
		cursor: pointer;
		justify-self: start;
	}
	.extra input {
		width: 18px;
		height: 18px;
		padding: 0;
		margin: 0;
		accent-color: var(--accent);
	}
	.no-link {
		margin: 0 auto 0 0;
		font-size: 0.875rem;
		align-self: center;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		flex-wrap: wrap;
	}
</style>
