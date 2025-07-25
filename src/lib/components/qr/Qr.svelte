<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	export let param: string;

	let canvas: HTMLCanvasElement;

	$: {
		if (canvas && param) {
			QRCode.toCanvas(canvas, param, { errorCorrectionLevel: 'M', margin: 0 }, function (error: Error | null | undefined) {
				if (error) console.error(error);
			});
		}
	}

	onMount(() => {
		if (canvas && param) {
			QRCode.toCanvas(canvas, param, { errorCorrectionLevel: 'M', margin: 0 }, function (error: Error | null | undefined) {
				if (error) console.error(error);
			});
		}
	});
</script>

<div class="flex justify-center items-center">
	<canvas
		class="rounded-xs max-w-[324px] h-auto"
		width="324"
		height="324"
		bind:this={canvas}>
	</canvas>
</div>
