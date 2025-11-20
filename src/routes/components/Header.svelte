<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { deviceSherlock } from 'device-sherlock';

	const words = ['ICAN', 'IBAN', 'ACH', 'UPI', 'PIX', 'CASH', '$€¥₹₽', 'Money'];
	let currentText = '';
	let isAnimating = false;
	let isAddingLetters = true;

	async function sleep(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async function animateText() {
		if (isAnimating) return;
		isAnimating = true;

		// Wait initial 2 seconds
		await sleep(2000);

		for (const word of words) {
			isAddingLetters = true;
			// Add letters one by one
			for (let i = 0; i <= word.length; i++) {
				currentText = word.substring(0, i);
				await sleep(100);
			}

			// Keep full word for a moment
			await sleep(800);

			isAddingLetters = false;
			// Remove letters one by one
			for (let i = word.length; i >= 0; i--) {
				currentText = word.substring(0, i);
				await sleep(100);
			}

			// Pause between words
			await sleep(400);
		}

		// Reset to initial state
		currentText = '';
		isAnimating = false;
	}

	onMount(() => {
		if (deviceSherlock.isDesktopOrTablet) {
			animateText();
		}
	});
</script>

<header class="py-8 grid place-content-center">
	<div class="flex flex-col items-stretch container select-none lg:items-center">
		<a href="/" class="logo no-underline">
			<h1 class="flex flex-col items-start mb-3 text-5xl tracking-wide lg:text-6xl lg:flex-row pt-logo">
				<span class="flex items-center">
					<span class="text-core">Pay</span>
					<span class="text-seagreen">To:</span>
					{#if currentText}
						<span class="text-zinc-400/60 ms-2 text-4xl lg:text-5xl flex items-center">
							{#each currentText.split('') as letter, i (i)}
								<span
									class="inline-block relative"
									in:fly={{
										x: isAddingLetters ? 20 : -20,
										duration: 150
									}}
									out:fly={{
										x: isAddingLetters ? -20 : 20,
										duration: 150
									}}
								>
									{letter}
								</span>
							{/each}
						</span>
					{/if}
				</span>
			</h1>
		</a>
		<span class="text-core arimo-400 text-lg italic">Payments Without Borders</span>
	</div>
</header>
