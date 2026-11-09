import type { Action } from "svelte/action";

/**
 * A large preview of an item's picture, floating next to it, for small tiles that are hard to
 * see (e.g. on the ranking board). Shown after resting the mouse on the tile for a moment, or
 * when the tile gets keyboard focus. Hidden as soon as the tile is clicked, dragged or the page
 * scrolls, so it never gets in the way of ranking. Touch screens don't get it (no hover).
 *
 * Usage: <button use:imagePreview={{ src, label }}>; pass null for items without a picture.
 */
export interface PreviewImage {
	src: string;
	label: string;
}

/* The size of the preview is set in app.css (.hmo-image-preview) */
const GAP = 12;
const MARGIN = 8;
/** How long to rest on a tile before the preview shows, so sweeping across the board is calm. */
const DELAY_MS = 250;

let box: HTMLDivElement | null = null;
let img: HTMLImageElement | null = null;
let caption: HTMLParagraphElement | null = null;

function ensureBox() {
	if (box) return;
	box = Object.assign(document.createElement("div"), {
		className: "hmo-image-preview"
	});
	box.setAttribute("aria-hidden", "true"); // the tile already has the label for screen readers
	img = Object.assign(document.createElement("img"), { alt: "" });
	caption = document.createElement("p");
	box.append(img, caption);
}

function show(anchor: HTMLElement, preview: PreviewImage) {
	ensureBox();
	img!.src = preview.src;
	caption!.textContent = preview.label;
	document.body.append(box!);

	// To the right of the tile, or to the left if there's no room; vertically centred on it
	const a = anchor.getBoundingClientRect();
	const b = box!.getBoundingClientRect();
	let left = a.right + GAP;
	if (left + b.width > window.innerWidth - MARGIN)
		left = a.left - GAP - b.width;
	left = Math.max(MARGIN, left);
	const top = Math.min(
		Math.max(MARGIN, a.top + a.height / 2 - b.height / 2),
		window.innerHeight - b.height - MARGIN
	);
	box!.style.left = `${left}px`;
	box!.style.top = `${top}px`;
}

function hide() {
	box?.remove();
}

export const imagePreview: Action<HTMLElement, PreviewImage | null> = (
	node,
	initial
) => {
	let preview = initial;
	let timer: ReturnType<typeof setTimeout> | undefined;

	function cancel() {
		clearTimeout(timer);
		hide();
	}
	function onEnter(e: PointerEvent) {
		if (!preview || e.pointerType !== "mouse") return;
		clearTimeout(timer);
		timer = setTimeout(() => preview && show(node, preview), DELAY_MS);
	}
	function onFocus() {
		// Keyboard only: a mouse click also focuses the tile, and shouldn't open the preview
		if (preview && node.matches(":focus-visible")) show(node, preview);
	}

	node.addEventListener("pointerenter", onEnter);
	node.addEventListener("focus", onFocus);
	const cancelEvents = [
		"pointerleave",
		"pointerdown",
		"dragstart",
		"blur"
	] as const;
	cancelEvents.forEach((e) => node.addEventListener(e, cancel));
	window.addEventListener("scroll", cancel, { passive: true, capture: true });

	return {
		update(next) {
			preview = next;
			if (!next) cancel();
		},
		destroy() {
			node.removeEventListener("pointerenter", onEnter);
			node.removeEventListener("focus", onFocus);
			cancelEvents.forEach((e) => node.removeEventListener(e, cancel));
			window.removeEventListener("scroll", cancel, { capture: true });
			cancel();
		}
	};
};
