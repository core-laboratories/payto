<script lang="ts">
	import { Header, Footer } from '../components';
</script>

<article class="flex flex-col w-full h-screen">
	<Header />
	<main class="lg:px-8 mx-auto flex-1">
		<slot />
	</main>
	<Footer />
</article>
