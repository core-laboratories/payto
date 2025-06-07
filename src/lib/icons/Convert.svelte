<script lang="ts">
	export let classValue: string = '';
	export let rest: Record<string, any> = {};
</script>

<svg
	class={classValue}
	viewBox="0 0 24 24"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	{...rest}
>
	<path
		d="M14.923,20.663L20.423,15.639L0.392,15.639L0.392,10.627L20.423,10.627L14.923,5.649"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
