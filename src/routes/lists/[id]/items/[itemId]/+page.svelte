<script lang="ts">
	import { afterNavigate, goto } from "$app/navigation";
	import { imageUrl } from "$lib/images";
	import { textOn } from "$lib/tiers";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const listHref = $derived(`/lists/${data.list.id}`);
	const itemHref = (id: string) => `/lists/${data.list.id}/items/${id}`;
	const src = $derived(
		imageUrl(data.item.full_image_path ?? data.item.image_path)
	);
	const onlySmall = $derived(
		!!data.item.image_path && !data.item.full_image_path
	);
	const isOwner = $derived(data.user?.id === data.template.owner_id);

	// If we came here from the tier list, "Back" returns to the same spot on that page
	let cameFromList = $state(false);
	afterNavigate(({ from, type }) => {
		if (type === "enter") return;
		if (from?.url.pathname === listHref) cameFromList = true;
	});

	function back(e?: Event) {
		if (cameFromList) {
			e?.preventDefault();
			history.back();
		} else if (!e) {
			goto(listHref);
		}
	}

	/** Prev/next replace the history entry, so Back still goes straight to the list. */
	function show(id: string | null) {
		if (id) goto(itemHref(id), { replaceState: true, noScroll: true });
	}

	function onKeydown(e: KeyboardEvent) {
		if (
			e.target instanceof HTMLInputElement ||
			e.target instanceof HTMLTextAreaElement
		)
			return;
		if (e.key === "Escape") back();
		if (e.key === "ArrowLeft") show(data.prevId);
		if (e.key === "ArrowRight") show(data.nextId);
	}

	// ---- Swipe left/right on the picture (phones) ----
	const SWIPE_MIN = 50; // px sideways before it counts as a swipe
	let swipeStart: { x: number; y: number } | null = null;

	function onSwipeStart(e: PointerEvent) {
		if (e.pointerType === "mouse" || !e.isPrimary) return;
		swipeStart = { x: e.clientX, y: e.clientY };
	}

	function onSwipeEnd(e: PointerEvent) {
		if (!swipeStart) return;
		const dx = e.clientX - swipeStart.x;
		const dy = e.clientY - swipeStart.y;
		swipeStart = null;
		// Mostly sideways and far enough: swipe left = next, swipe right = previous
		if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5)
			show(dx < 0 ? data.nextId : data.prevId);
	}
</script>

<svelte:window onkeydown={onKeydown} />
<svelte:head
	><title>{data.item.label} · {data.list.title} · Hear Me Out</title
	></svelte:head
>

<div class="viewer">
	<div class="topbar">
		<a class="btn btn-secondary btn-small back" href={listHref} onclick={back}>
			<span aria-hidden="true">←</span> Back to {data.list.title}
		</a>
		<span class="muted count"
			>{data.position.index + 1} of {data.position.total}</span
		>
	</div>

	<figure>
		<div
			class="stage"
			role="group"
			aria-label="Picture of {data.item.label}. Swipe left or right to browse."
			onpointerdown={onSwipeStart}
			onpointerup={onSwipeEnd}
			onpointercancel={() => (swipeStart = null)}
		>
			{#if data.prevId}
				<a
					class="nav prev"
					href={itemHref(data.prevId)}
					data-sveltekit-replacestate
					data-sveltekit-noscroll
					aria-label="Previous item">‹</a
				>
			{/if}
			{#if src}
				<img {src} alt={data.item.label} />
			{:else}
				<div class="no-image">{data.item.label}</div>
			{/if}
			{#if data.nextId}
				<a
					class="nav next"
					href={itemHref(data.nextId)}
					data-sveltekit-replacestate
					data-sveltekit-noscroll
					aria-label="Next item">›</a
				>
			{/if}
		</div>
		<figcaption>
			<h1>{data.item.label}</h1>
			<p class="ranking">
				{#if data.tier}
					<span
						class="tier-badge"
						style:background={data.tier.color}
						style:color={textOn(data.tier.color)}>{data.tier.label}</span
					>
					<span class="muted">in {data.list.owner ?? "this"}’s ranking</span>
				{:else}
					<span class="muted">Not ranked in this list</span>
				{/if}
			</p>
			{#if onlySmall && isOwner}
				<p class="muted note">
					Only a small version of this picture exists, because it was uploaded
					before full-size images were saved. Re-add it on the <a
						href="/templates/{data.template.id}/edit">template’s edit page</a
					> for a sharper picture.
				</p>
			{/if}
		</figcaption>
	</figure>
	<p class="muted keys">
		<span class="keys-mouse">Tip: use ← → to browse and Esc to go back.</span>
		<span class="keys-touch"
			>Tip: swipe left or right on the picture to browse.</span
		>
	</p>
</div>

<style>
	.viewer {
		display: grid;
		gap: 16px;
	}
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.back {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.count {
		font-size: 0.875rem;
	}
	figure {
		margin: 0;
		display: grid;
		gap: 16px;
	}
	.stage {
		/* Sideways swipes go to the page; vertical scroll and pinch-zoom still work */
		touch-action: pan-y pinch-zoom;
		position: relative;
		display: grid;
		place-items: center;
		min-height: 240px;
		padding: 12px;
		border-radius: var(--radius);
		background: #111;
	}
	.stage img {
		max-width: 100%;
		max-height: 72vh;
		width: auto;
		height: auto;
		object-fit: contain;
		border-radius: 6px;
	}
	.no-image {
		color: #eee;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 2rem;
		padding: 48px 16px;
		text-align: center;
	}
	.nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 44px;
		height: 44px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: rgba(255, 255, 255, 0.9);
		color: #111;
		font-size: 1.75rem;
		line-height: 1;
		text-decoration: none;
		box-shadow: var(--shadow);
	}
	.nav:hover {
		background: #fff;
	}
	.prev {
		left: 12px;
	}
	.next {
		right: 12px;
	}
	figcaption h1 {
		margin: 0 0 8px;
		font-size: clamp(1.5rem, 4vw, 2.25rem);
	}
	.ranking {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
	}
	.tier-badge {
		min-width: 36px;
		padding: 4px 10px;
		border-radius: 8px;
		font-family: var(--font-display);
		font-weight: 800;
		text-align: center;
	}
	.note {
		margin-top: 12px;
		font-size: 0.875rem;
		max-width: 60ch;
	}
	.keys {
		font-size: 0.8125rem;
		margin: 0;
	}
	.keys-touch {
		display: none;
	}
	/* Touch screens: show the swipe tip instead of the keyboard tip */
	@media (pointer: coarse) {
		.keys-mouse {
			display: none;
		}
		.keys-touch {
			display: inline;
		}
	}
</style>
