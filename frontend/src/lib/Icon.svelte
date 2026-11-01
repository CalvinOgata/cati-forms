<script lang="ts" module>
	// 24×24 stroke icons.
	const paths = {
		plus: 'M12 5v14M5 12h14',
		x: 'M18 6 6 18M6 6l12 12',
		up: 'M12 19V5M5 12l7-7 7 7',
		down: 'M12 5v14M19 12l-7 7-7-7',
		copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
		trash: 'M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6',
		external: 'M15 3h6v6M10 14 21 3M21 14v7H3V3h7'
	};

	export type IconName = keyof typeof paths;
</script>

<script lang="ts">
	let { name, size = 18 }: { name: IconName; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={paths[name]} />
</svg>
