<script lang="ts">
	import { copyText } from "$lib/clipboard";
	import { toast } from "$lib/toast.svelte";

	/**
	 * A "Copy link" button. `variant="card"` wraps it with a heading and hint text;
	 * `variant="large"` is a full-size button to sit next to other main buttons.
	 */
	let {
		url,
		label = "Copy link",
		heading = "",
		hint = "",
		variant = "button"
	}: {
		url: string;
		label?: string;
		heading?: string;
		hint?: string;
		variant?: "button" | "large" | "card";
	} = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		if (!(await copyText(url))) {
			toast(
				"Couldn’t copy the link. Copy it from the address bar instead.",
				"error"
			);
			return;
		}
		toast("Link copied. Paste it anywhere to share.");
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 2000);
	}
</script>

{#snippet button(extraClass: string)}
	<button
		class="btn {extraClass} copy"
		class:copied
		type="button"
		onclick={copy}
		aria-live="polite"
	>
		<span aria-hidden="true">{copied ? "✓" : "🔗"}</span>
		{copied ? "Copied!" : label}
	</button>
{/snippet}

{#if variant === "card"}
	<div class="card share-card">
		<div class="text">
			{#if heading}<strong>{heading}</strong>{/if}
			{#if hint}<p class="muted">{hint}</p>{/if}
		</div>
		{@render button("")}
	</div>
{:else if variant === "large"}
	{@render button("btn-secondary")}
{:else}
	{@render button("btn-secondary btn-small")}
{/if}

<style>
	.share-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
		padding: 14px 18px;
	}
	.text {
		display: grid;
		gap: 2px;
		flex: 1 1 260px;
	}
	.text p {
		margin: 0;
		font-size: 0.875rem;
	}
	.copy {
		white-space: nowrap;
		min-width: 120px;
	}
	.copy.copied {
		background: #2e9b57;
		border-color: #2e9b57;
		color: #fff;
	}
</style>
