<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	export let param: string;

	let canvas: HTMLCanvasElement;

	onMount(async () => {
		const qrText = param;
		QRCode.toCanvas(canvas, qrText, { errorCorrectionLevel: 'H' }, function (error: Error | null | undefined) {
			if (error) console.error(error);
		});
	});
</script>


<div class="flex justify-center items-center">
    <canvas class="rounded-xs" bind:this={canvas}></canvas>
</div>

