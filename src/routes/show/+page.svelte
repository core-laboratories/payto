<script lang="ts">
	import { Page, Row, WalletCard } from '$lib/components';
	export let urlParam: string | null;
</script>

<Page>
	<Row>
		<div class="max-w-full md:max-w-lg">
			<WalletCard url={urlParam} />
		</div>
	</Row>
</Page>
