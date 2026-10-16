<script lang="ts">
	import { textOn } from "$lib/tiers";
	import type { Tier } from "$lib/types";

	/**
	 * The coloured label at the start of a tier row.
	 * The full name is always shown: if it doesn't fit, the text shrinks until it does
	 * (words are only split as a last resort, at the smallest size).
	 * Small previews (compact) show at most 3 lines and end long names with "…"; the full
	 * name is in the tooltip.
	 */
	let { tier, compact = false }: { tier: Tier; compact?: boolean } = $props();

	/** Smallest font size (px) we shrink to before allowing words to break. */
	const MIN_SIZE = $derived(compact ? 8 : 9);

	// Starting size, by the longest word (short labels like "S" stay big)
	const longestWord = $derived(
		Math.max(...tier.label.split(/\s+/).map((w) => w.length))
	);
	const size = $derived(
		longestWord <= 3
			? "size-xl"
			: longestWord <= 5
				? "size-l"
				: longestWord <= 8
					? "size-m"
					: "size-s"
	);

	let box = $state<HTMLDivElement>();
	let text = $state<HTMLSpanElement>();

	/** Shrinks the text in small steps until every word fits the width and the lines fit the height. */
	function fit() {
		if (!box || !text) return;
		// Changed directly (not through Svelte state) so each measurement sees the current styles
		text.style.fontSize = "";
		text.classList.remove("break-words");
		let px = parseFloat(getComputedStyle(text).fontSize);
		// A word wider than the text's own box, or more lines than the label is tall
		// (or, in small previews, more than the 3 lines shown)
		const overflows = () =>
			text!.scrollWidth > text!.clientWidth + 1 ||
			box!.scrollHeight > box!.clientHeight + 1 ||
			(compact && text!.scrollHeight > text!.clientHeight + 1);

		while (overflows() && px > MIN_SIZE) {
			px -= 0.5;
			text.style.fontSize = `${px}px`;
		}
		// Still too long at the smallest size: let the browser split words (with a hyphen where it can)
		if (overflows()) text.classList.add("break-words");
	}

	// Re-fit when the label text changes or the label's size changes (e.g. rotating a phone)
	$effect(() => {
		void tier.label;
		void compact;
		if (!box) return;
		fit();
		const observer = new ResizeObserver(() => fit());
		observer.observe(box);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={box}
	class="tier-label {size}"
	class:compact
	style:background={tier.color}
	style:color={textOn(tier.color)}
	title={tier.label}
	lang="en"
>
	<span bind:this={text}>{tier.label}</span>
</div>

<style>
	.tier-label {
		display: grid;
		place-items: center;
		padding: 6px;
		font-family: var(--font-display);
		font-weight: 800;
		line-height: 1.1;
		text-align: center;
		min-width: 0;
		overflow: hidden;
	}
	.tier-label span {
		display: block;
		/* Grid children grow to fit their longest word by default; this keeps the box at the
		   label's width, so fit() can see when a word doesn't fit */
		min-width: 0;
		max-width: 100%;
		/* Wrap only between words; fit() shrinks the text so long words fit */
		word-break: normal;
		overflow-wrap: normal;
		hyphens: manual;
	}
	.tier-label span:global(.break-words) {
		overflow-wrap: anywhere;
		hyphens: auto;
	}
	.size-xl {
		font-size: 1.375rem;
	}
	.size-l {
		font-size: 1.125rem;
	}
	.size-m {
		font-size: 0.9375rem;
	}
	.size-s {
		font-size: 0.8125rem;
	}
	/* Small previews start smaller */
	.compact {
		padding: 2px 3px;
		font-size: 0.6875rem;
		line-height: 1.05;
	}
	/* …and show at most 3 lines, so a long name doesn't stretch the preview */
	.compact span {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}
	.compact.size-xl,
	.compact.size-l {
		font-size: 0.875rem;
	}
	@media (max-width: 560px) {
		.size-xl {
			font-size: 1.125rem;
		}
		.size-l {
			font-size: 0.9375rem;
		}
		.size-m,
		.size-s {
			font-size: 0.8125rem;
		}
		.compact.size-m,
		.compact.size-s {
			font-size: 0.6875rem;
		}
	}
</style>
