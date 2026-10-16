<script lang="ts">
	/**
	 * A grey placeholder with a soft shimmer, shown while something is loading,
	 * so the layout keeps its size instead of jumping when the content arrives.
	 * Give it a height, or an aspect ratio (e.g. "4 / 3") to size it from its width.
	 */
	let {
		width = "100%",
		height = undefined,
		aspectRatio = undefined,
		radius = "var(--radius-small)",
		label = "Loading…"
	}: {
		width?: string;
		height?: string;
		aspectRatio?: string;
		radius?: string;
		/** Read out by screen readers instead of the empty box. */
		label?: string;
	} = $props();
</script>

<span
	class="skeleton"
	role="status"
	aria-label={label}
	style:width
	style:height
	style:aspect-ratio={aspectRatio}
	style:border-radius={radius}
></span>

<style>
	.skeleton {
		display: block;
		position: relative;
		overflow: hidden;
		background: var(--surface-2);
	}
	.skeleton::after {
		content: "";
		position: absolute;
		inset: 0;
		transform: translateX(-100%);
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in srgb, var(--ink) 8%, transparent),
			transparent
		);
		animation: shimmer 1.3s ease-in-out infinite;
	}
	@keyframes shimmer {
		to {
			transform: translateX(100%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.skeleton::after {
			animation: none;
		}
	}
</style>
