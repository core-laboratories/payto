<script lang="ts">
	import "../css/app.css";
	import { Header, Footer } from './components';
	import { page } from '$app/state';
</script>

<article class="flex flex-col w-full h-screen">
	{#if page.route.id !== '/show'}
		<Header />
	{/if}
	<main class="lg:px-8 mx-auto flex-1">
		<slot />
	</main>
	<Footer />
</article>
