<script lang="ts">
	import '../app.postcss';
	import { Header, Footer } from './components';
	import { page } from '$app/state';
</script>

<article class="[ flex flex-col ] [ is-full ] [ h-screen ]">
	{#if page.route.id !== '/show'}
		<Header />
	{/if}
	<main class="[ lg:pli-8 ] [ mx-auto ] [ flex-1 ]">
		<slot />
	</main>
	<Footer />
</article>
