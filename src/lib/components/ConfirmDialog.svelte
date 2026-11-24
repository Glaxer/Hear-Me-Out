<script lang="ts">
	/**
	 * A "Are you sure?" popup in the site's own style, with big buttons. Unlike the browser's
	 * confirm(), it doesn't freeze the page while it's open. Open it with `open()`.
	 */
	let {
		title,
		message = "",
		confirmLabel = "OK",
		cancelLabel = "Cancel",
		danger = false,
		onconfirm
	}: {
		title: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		/** Red confirm button, for things that can't be undone. */
		danger?: boolean;
		onconfirm: () => void;
	} = $props();

	let dialog = $state<HTMLDialogElement>();

	export function open() {
		dialog?.showModal();
	}

	function close() {
		dialog?.close();
	}
</script>

<dialog
	bind:this={dialog}
	class="confirm-dialog"
	aria-labelledby="confirm-title"
	onclick={(e) => e.target === dialog && close()}
>
	<div class="inner">
		<h2 id="confirm-title">{title}</h2>
		{#if message}<p class="muted">{message}</p>{/if}
		<div class="buttons">
			<button type="button" class="btn btn-secondary" onclick={close}
				>{cancelLabel}</button
			>
			<button
				type="button"
				class="btn"
				class:btn-danger={danger}
				onclick={() => {
					close();
					onconfirm();
				}}>{confirmLabel}</button
			>
		</div>
	</div>
</dialog>

<style>
	.confirm-dialog {
		width: min(420px, calc(100vw - 32px));
		padding: 0;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		box-shadow: var(--shadow);
	}
	.confirm-dialog::backdrop {
		background: rgba(0, 0, 0, 0.55);
	}
	.inner {
		display: grid;
		gap: 10px;
		padding: 20px;
	}
	h2,
	p {
		margin: 0;
	}
	h2 {
		font-size: 1.25rem;
	}
	.buttons {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 8px;
		flex-wrap: wrap;
	}
</style>
