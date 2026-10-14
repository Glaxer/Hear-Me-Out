<script lang="ts">
	import { dismissToast, toasts } from '$lib/toast.svelte';
</script>

<div class="toaster" aria-live="polite" aria-atomic="false">
	{#each toasts as t (t.id)}
		<div class="toast toast-{t.kind}" role={t.kind === 'error' ? 'alert' : 'status'}>
			<span class="icon" aria-hidden="true">{t.kind === 'error' ? '!' : t.kind === 'info' ? 'i' : '✓'}</span>
			<p>{t.message}</p>
			<button type="button" class="close" onclick={() => dismissToast(t.id)} aria-label="Dismiss">✕</button>
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
		gap: 8px;
		width: min(380px, calc(100vw - 32px));
	}
	.toast {
		display: grid;
		grid-template-columns: 28px 1fr 28px;
		align-items: center;
		gap: 10px;
		padding: 12px 12px 12px 14px;
		border-radius: var(--radius);
		background: var(--ink);
		color: var(--bg);
		box-shadow: var(--shadow);
		animation: slide-in 0.2s ease-out;
	}
	.toast p {
		margin: 0;
		font-weight: 500;
	}
	.icon {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-weight: 800;
		color: #111;
		background: #7fff7f;
	}
	.toast-info .icon {
		background: #7fbfff;
	}
	.toast-error .icon {
		background: #ff7f7f;
	}
	.close {
		background: none;
		border: none;
		color: inherit;
		opacity: 0.7;
		cursor: pointer;
		font: inherit;
		width: 28px;
		height: 28px;
	}
	.close:hover {
		opacity: 1;
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
