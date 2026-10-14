import type { Action } from "svelte/action";

let tip: HTMLDivElement | null = null;

function show(anchor: HTMLElement, text: string) {
	if (!text) return;
	tip ??= Object.assign(document.createElement("div"), {
		className: "hmo-tooltip",
		role: "tooltip"
	});
	tip.textContent = text;
	document.body.append(tip);

	// Place above the element, or below if there's no room
	const a = anchor.getBoundingClientRect();
	const t = tip.getBoundingClientRect();
	const gap = 8;
	let top = a.top - t.height - gap;
	if (top < 8) top = a.bottom + gap;
	const left = Math.min(
		Math.max(8, a.left + a.width / 2 - t.width / 2),
		window.innerWidth - t.width - 8
	);
	tip.style.top = `${top}px`;
	tip.style.left = `${left}px`;
}

function hide() {
	tip?.remove();
}

/**
 * Shows a small floating label with the full text on hover and keyboard focus.
 * Floats above everything, so rounded/clipped containers don't cut it off.
 * Usage: <a use:tooltip={item.label}>
 */
export const tooltip: Action<HTMLElement, string> = (node, text) => {
	let current = text;
	const onShow = () => show(node, current);
	const events = ["pointerenter", "focus"] as const;
	const hideEvents = [
		"pointerleave",
		"blur",
		"pointerdown",
		"dragstart"
	] as const;

	events.forEach((e) => node.addEventListener(e, onShow));
	hideEvents.forEach((e) => node.addEventListener(e, hide));
	window.addEventListener("scroll", hide, { passive: true });

	return {
		update(next) {
			current = next;
		},
		destroy() {
			events.forEach((e) => node.removeEventListener(e, onShow));
			hideEvents.forEach((e) => node.removeEventListener(e, hide));
			window.removeEventListener("scroll", hide);
			hide();
		}
	};
};
