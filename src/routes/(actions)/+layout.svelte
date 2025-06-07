<script lang="ts">
	import { Footer } from '../components';
</script>

<article class="flex flex-col w-full h-screen">
	<main class="lg:px-8 mx-auto flex-1">
		<slot />
	</main>
	<Footer />
</article>
