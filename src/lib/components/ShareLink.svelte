<script lang="ts">
	import { toast } from '$lib/toast.svelte';

	/** A read-only link with a Share/Copy button. */
	let { url, title, label = 'Share link', hint = '' }: { url: string; title: string; label?: string; hint?: string } = $props();

	const id = `share-${Math.random().toString(36).slice(2, 8)}`;

	async function share() {
		if (navigator.share) {
			try {
				await navigator.share({ title, url });
				return;
			} catch {
				// Share sheet closed: fall back to copying
			}
		}
		await navigator.clipboard.writeText(url);
		toast('Link copied.');
	}
</script>

<div class="share card">
	<label for={id} class="field-label">{label}</label>
	{#if hint}<p class="muted hint">{hint}</p>{/if}
	<div class="share-row">
		<input {id} type="text" readonly value={url} onfocus={(e) => e.currentTarget.select()} />
		<button class="btn" type="button" onclick={share}>Share</button>
	</div>
</div>

<style>
	.share {
		display: grid;
		gap: 8px;
	}
	.hint {
		margin: -4px 0 0;
		font-size: 0.875rem;
	}
	.share-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;
	}
</style>
