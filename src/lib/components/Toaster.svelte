<script lang="ts">
	import { dismissToast, toasts, type ToastKind } from "$lib/toast.svelte";

	/** Stroke paths for each icon, drawn white inside the coloured circle (24×24 grid). */
	const ICONS: Record<ToastKind, string> = {
		success: "M6 12.5l4 4 8-9",
		info: "M12 10.5v7M12 6.5v.01",
		warning: "M12 5.5v8M12 18v.01",
		error: "M7.5 7.5l9 9M16.5 7.5l-9 9"
	};
</script>

<!--
	Toasts sit in a fixed corner, so they're seen wherever the page is scrolled to.
	Each has a coloured band with an icon on its edge (colour and icon by severity),
	a bold title and the message. Colours of the card follow the site's light/dark theme.
-->
<div class="toaster" aria-live="polite" aria-atomic="false">
	{#each toasts as t (t.id)}
		<div
			class="toast toast-{t.kind}"
			role={t.kind === "error" || t.kind === "warning" ? "alert" : "status"}
		>
			<div class="band" aria-hidden="true">
				<span class="icon">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d={ICONS[t.kind]} />
					</svg>
				</span>
			</div>
			<div class="text">
				<p class="title">{t.title}</p>
				<p class="message">{t.message}</p>
			</div>
			<button
				type="button"
				class="close"
				onclick={() => dismissToast(t.id)}
				aria-label="Dismiss">✕</button
			>
		</div>
	{/each}
</div>

<style>
	.toaster {
		position: fixed;
		right: 16px;
		top: 76px;
		z-index: 100;
		display: grid;
		gap: 10px;
		width: min(420px, calc(100vw - 32px));
	}
	.toast {
		/* Severity colour; set per kind below */
		--tone: #5b7cf6;
		display: grid;
		grid-template-columns: 56px 1fr auto;
		align-items: stretch;
		overflow: hidden;
		border-radius: var(--radius-small);
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--ink);
		box-shadow: var(--shadow);
		animation: slide-in 0.2s ease-out;
	}
	.toast-success {
		--tone: #3fae6a;
	}
	.toast-info {
		--tone: #5b7cf6;
	}
	.toast-warning {
		--tone: #e8a33d;
	}
	.toast-error {
		--tone: #e5534b;
	}

	/* The coloured band, with the icon circle sitting half over its right edge */
	.band {
		position: relative;
		background: var(--tone);
	}
	.icon {
		position: absolute;
		top: 50%;
		right: 0;
		translate: 50% -50%;
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--tone);
		/* A ring in the card's colour separates the circle from the band */
		box-shadow: 0 0 0 4px var(--surface);
		color: #fff;
	}
	.icon svg {
		width: 20px;
		height: 20px;
	}

	.text {
		padding: 12px 4px 12px 30px;
		min-width: 0;
	}
	.title {
		margin: 0;
		font-weight: 700;
		line-height: 1.3;
	}
	.message {
		margin: 2px 0 0;
		color: var(--ink-soft);
		font-size: 0.9375rem;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}
	.close {
		align-self: start;
		width: 32px;
		height: 32px;
		margin: 6px 6px 0 0;
		border: none;
		border-radius: 50%;
		background: none;
		color: var(--ink-soft);
		font: inherit;
		cursor: pointer;
	}
	.close:hover {
		background: var(--surface-2);
		color: var(--ink);
	}

	@keyframes slide-in {
		from {
			transform: translateY(-12px);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.toast {
			animation: none;
		}
	}
</style>
