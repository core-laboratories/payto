<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	export let param: string;

	let canvas: HTMLCanvasElement;

	$: {
		if (canvas && param) {
			QRCode.toCanvas(canvas, param, { errorCorrectionLevel: 'H' }, function (error: Error | null | undefined) {
				if (error) console.error(error);
			});
		}
	}

	onMount(() => {
		if (canvas && param) {
			QRCode.toCanvas(canvas, param, { errorCorrectionLevel: 'H' }, function (error: Error | null | undefined) {
				if (error) console.error(error);
			});
		}
	});
</script>

<div class="flex justify-center items-center">
	<canvas class="rounded-xs" bind:this={canvas}></canvas>
</div>
