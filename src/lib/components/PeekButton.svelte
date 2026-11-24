<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import ConfirmDialog from "./ConfirmDialog.svelte";

	/**
	 * "Peek anyway": shows the hidden verdict (and everyone's rankings) without ranking it
	 * yourself, after a warning. Adds ?peek=1 to the template page.
	 */
	let { what = "your picks" }: { what?: string } = $props();

	let dialog = $state<ReturnType<typeof ConfirmDialog>>();

	function peek() {
		const url = new URL(page.url);
		url.searchParams.set("peek", "1");
		goto(url, { noScroll: true, keepFocus: true, replaceState: true });
	}
</script>

<button
	type="button"
	class="link-button muted peek"
	onclick={() => dialog?.open()}>Peek anyway</button
>

<ConfirmDialog
	bind:this={dialog}
	title="Peek at the verdict?"
	message="Seeing what everyone else picked can sway {what}. It’s more fun to make your own first."
	confirmLabel="Peek"
	cancelLabel="Not yet"
	onconfirm={peek}
/>

<style>
	.peek {
		font-size: 0.875rem;
	}
</style>
