<script lang="ts">
	import { textOn } from '$lib/tiers';
	import type { Tier } from '$lib/types';

	/**
	 * The coloured label at the start of a tier row.
	 * Long names get a smaller font instead of being split mid-word.
	 */
	let { tier, compact = false }: { tier: Tier; compact?: boolean } = $props();

	const longestWord = $derived(Math.max(...tier.label.split(/\s+/).map((w) => w.length)));
	const size = $derived(
		longestWord <= 3 ? 'size-xl' : longestWord <= 5 ? 'size-l' : longestWord <= 8 ? 'size-m' : 'size-s'
	);
</script>

<div
	class="tier-label {size}"
	class:compact
	style:background={tier.color}
	style:color={textOn(tier.color)}
	title={tier.label}
	lang="en"
>
	<span>{tier.label}</span>
</div>

<style>
	.tier-label {
		display: grid;
		place-items: center;
		padding: 8px 6px;
		font-family: var(--font-display);
		font-weight: 800;
		line-height: 1.1;
		text-align: center;
		/* Never break inside a word unless it truly can't fit; then hyphenate */
		word-break: normal;
		overflow-wrap: normal;
		hyphens: manual;
		min-width: 0;
	}
	.tier-label span {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
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
		hyphens: auto;
		overflow-wrap: break-word;
	}
	/* Small previews: one line, shortened with "…" (the full name is in the tooltip) */
	.compact {
		padding: 2px 4px;
		font-size: 0.6875rem;
		hyphens: none;
		overflow-wrap: normal;
	}
	.compact span {
		display: block;
		white-space: nowrap;
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
		.size-m {
			font-size: 0.8125rem;
		}
		.size-s {
			font-size: 0.6875rem;
		}
	}
</style>
