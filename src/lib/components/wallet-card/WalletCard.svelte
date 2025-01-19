<script lang="ts">
	import { onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import ExchNumberFormat from 'exchange-rounding';
	import { constructor } from '$lib/store/constructor.store';
	import { getAddress } from '$lib/helpers/get-address.helper';
	import { getCurrency } from '$lib/helpers/get-currency.helper';
	import { getNetwork } from '$lib/helpers/get-network.helper';

	export let type: ITransitionType = 'ican';

	const iconLogoSize: string = 'h-10 w-10';
	const rtl: boolean = false;

	let locVal: string | undefined;

	function formatAdr(str: string | undefined) {
		return str ? `/${str.substring(0, 4).toUpperCase()}…${str.substring(str.length - 4).toUpperCase()}` : '';
	}

	const amount = derived(constructor, $constructor => $constructor.networks[type]?.params?.amount?.value ?? undefined);
	const address = derived(constructor, $constructor => getAddress($constructor.networks[type], type) ?? undefined);
	const colorB = derived(constructor, $constructor => $constructor.design.colorB ?? '#77bc65');
	const colorF = derived(constructor, $constructor => $constructor.design.colorF ?? '#192a14');
	const org = derived(constructor, $constructor => $constructor.design.org);
	const orgImg = writable(''); // Placeholder for image
	const item = derived(constructor, $constructor => $constructor.design.item);
	const barcode = derived(constructor, $constructor => $constructor.design.barcode ?? 'qr');
	const isRecurring = derived(constructor, $constructor => !!$constructor.networks[type]?.isRc);
	const recurring = derived(constructor, $constructor => $constructor.networks[type]?.params?.rc?.value ?? '');
	const paymentNetwork = derived(constructor, $constructor => getNetwork($constructor.networks[type], type, true));
	const other = derived(constructor, $constructor => $constructor.networks[type]?.other ?? undefined);

	onMount(() => {
		if (type === 'void' && ($paymentNetwork === 'geo' || $paymentNetwork === 'plus')) {
			locVal = $paymentNetwork === 'geo'
				? `geo:${$constructor.networks[type]?.params?.loc?.value}`
				: `comgooglemaps://?q=${$constructor.networks[type]?.params?.loc?.value}`;
		}
	});

	const formatter = derived(constructor, $constructor =>
		new ExchNumberFormat(undefined, {
			style: 'currency',
			currency: getCurrency($constructor.networks[type], type),
			currencyDisplay: 'symbol'
		})
	);
	const formattedAmount = derived([formatter, amount], ([$formatter, $amount]) => $formatter.format($amount as number));
	const barcodeValue = derived(
		[paymentNetwork, address, other],
		([$paymentNetwork, $address, $other]) => $paymentNetwork
			? $other
				? `${type.toUpperCase()}:${$other.toUpperCase()}${formatAdr($address)}`
				: `${type.toUpperCase()}:${$paymentNetwork.toUpperCase()}${formatAdr($address)}`
			: `${type.toUpperCase()}${formatAdr($address)}`
	);
</script>

<div>
	<div class="card rounded-lg shadow-md font-medium" style="background-color: {$colorB}; color: {$colorF};">
		{#if rtl}
			<div class="flex items-center p-4">
				<div class="flex-grow flex justify-between items-center">
					<div class="text-left">
							<div class="text-sm uppercase">Payment</div>
							<div class="font-semibold">{$isRecurring ? $recurring + ' / Recurring' : 'One‑time'}</div>
					</div>
					<span class="text-l font-medium" style="color: {$colorF};">
						{#if $org}
							{$org}
						{:else}
							PayTo
						{/if}
					</span>
				</div>
				{#if $orgImg}
					<img src={$orgImg} alt={$org || 'Organization Image'} class="ml-4" style="max-width: 32px; max-height: 32px;" />
				{/if}
			</div>
		{:else}
			<div class="flex items-center p-4">
				{#if $orgImg}
					<img src={$orgImg} alt={$org || 'Organization Image'} class="ml-4" style="max-width: 32px; max-height: 32px;" />
				{/if}
				<div class="flex-grow flex justify-between items-center">
					<span class="text-l font-medium" style="color: {$colorF};">
						{#if $org}
							{$org}
						{:else}
							PayTo
						{/if}
					</span>
					<div class="text-right">
						<div class="text-sm uppercase">Payment</div>
						<div class="font-semibold">{$isRecurring ? 'Recurring / ' + $recurring : 'One‑time'}</div>
					</div>
				</div>
			</div>
		{/if}

		<div class="flex items-center mb-7 pt-12 pb-12 justify-center" style="background-color: {$colorF}; color: {$colorB}; width: 100%;">
			<div class="flex items-center ml-12 mr-12">
				<div class="text-2xl font-medium text-wrap" style="color: {$colorB};">
					{#if $amount && Number($amount)>0}
						{$formattedAmount}
					{:else}
						Custom Amount
					{/if}
				</div>
			</div>
		</div>

		<div class="m-4">
			<div class="flex justify-between items-center mb-2">
				<div class={`${rtl ? 'text-right' : 'text-left'} w-full`}>
					<div class="text-sm">Payment type</div>
					<div class="text-xl font-semibold">
						{(type === 'void' ? 'CASH' : type.toUpperCase()) + ($paymentNetwork ? ': ' + $paymentNetwork.toUpperCase() : '')}
					</div>
				</div>
			</div>
			{#if $item}
				<div class="flex justify-between items-center mb-2">
					<div class={`${rtl ? 'text-right' : 'text-left'} w-full`}>
						<div class="text-sm">Item</div>
						<div class="text-xl font-semibold break-words">
							{$item}
						</div>
					</div>
				</div>
			{/if}
			{#if type === 'void' && ($paymentNetwork === 'geo' || $paymentNetwork === 'plus')}
				<div class="flex justify-between items-center mb-2">
					<div class={`${rtl ? 'text-right' : 'text-left'} w-full`}>
						<div class="text-sm">Navigate</div>
						<div class="text-xl font-semibold break-words">
							<a
								class={`[ transition-all duration-200 ] [ visited:text-gray-200 hover:text-gray-300 ] [ ${locVal ? 'cursor-pointer' : 'cursor-not-allowed' } ]`}
								style="color: {colorF};"
								href={locVal}
								target="_blank"
								rel="noreferrer"
							>Open the navigation</a>
						</div>
					</div>
				</div>
			{/if}
		</div>


		<div class="flex justify-center items-center m-4 mt-5">
			<div class="p-4 rounded-lg inline-flex justify-center items-center" style="background-color: white;">
				<div class="text-center">
					{#if $barcode === 'qr'}
						<img alt={$barcode} class="block mx-auto" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFQAAABUCAYAAAAcaxDBAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAARmSURBVHhe7ZBBbtwwEATz/087PMgGWeqwdkBSQgAXUJfu5ljeP42vJ61i76v9A8bwmFXsfbV/wBges4q9r/YPGMNjVrH31f4Bx2A3dv/tfhXeb47Bbuz+2/0qvN8cg93Y/bf7VXi/OQa7sftv96vwfnMMCHuT7O6pYXv2JgmbMSDsTbK7p4bt2ZskbMaAsDfJ7p4atmdvkrAZA8LeJLt7atievUnCZgwIe5NYv4rdr/YmCZsxIOxNYv0qdr/amyRsxoCwN4n1q9j9am+SsBkDwt4k1q9i96u9ScJmDAh7k1T7VUm1N0nYjAFhb5Jqvyqp9iYJmzEg7E1S7Vcl1d4kYTMGhL1Jqv2qpNqbJGzGYDd2n71ZZfW9wfvNMdiN3WdvVll9b/B+cwx2Y/fZm1VW3xu83xyD3dh99maV1fcG7zdvwVHJ0/0DxvCY5On+AWN4TPJ0/4AxPCZ5uj/u9Xdfgx/0v/P7g27m9wfdzO8Pupn2P4z/ECXWE+6pkd7MJGkzk6RNL2lZHn5LrCfcUyO9mUnSZiZJm17Ssjz8llhPuKdGejOTpM1Mkja9pGV5+C2xnnBPjfRmJkmbmSRteknL8vBbY3VvEusJ91VJ2sAY/mis7k1iPeG+KkkbGMMfjdW9Sawn3FclaQNj+KOxujeJ9YT7qiRtYAz/KUmbmYbtrV+F9ykJm1swlaTNTMP21q/C+5SEzS2YStJmpmF761fhfUrC5hZMJWkz07C99avwPiW3zZV/zO2AaFT3hO9Nkja9JG0Gr93HxCMTjeqe8L1J0qaXpM3gtfuYeGSiUd0TvjdJ2vSStBm8dh8Tj0w0qnvC9yZJm16SNoPX7gcOCPuqpNpTI73pJdYT7m8vOCDsq5JqT430ppdYT7i/veCAsK9Kqj010pteYj3h/vaCA8K+Kqn21Ehveon1hHt/cRh+ELGecG+StCl53XkNfhCxnnBvkrQped15DX4QsZ5wb5K0KXndeQ1+ELGecG+StCkaw2MS6wn3lOzuKWlZHp6SWE+4p2R3T0nL8vCUxHrCPSW7e0paloenJNYT7inZ3VPSsvlglep97mmVdGOmYfuWzQerVO9zT6ukGzMN27dsPlilep97WiXdmGnYvmXzwSrV+9zTKunGTMP2LdNBSWK9Ye/ZmyRteskHvQ5KEusNe8/eJGnTSz7odVCSWG/Ye/YmSZte8kGvg5LEesPeszdJ2vSSD3odlCTV3jTSm16SNr0kbeAYEPYmqfamkd70krTpJWkDx4CwN0m1N430ppekTS9JGzgGhL1Jqr1ppDe9JG16SdrAMSDsTWI9sX21p2R33xwDwt4k1hPbV3tKdvfNMSDsTWI9sX21p2R33xwDwt4k1hPbV3tKdvfNMdiN3beecE/fpn3D2Q+y+9YT7unbtG84+0F233rCPX2b9g1nP8juW0+4p2/TviF/2ClJ2vRWsfcP9OPgtCRteqvY+wf6cXBakja9Vez9A/04OC1Jm94q9v5s//X1FwPHIX+PY/+OAAAAAElFTkSuQmCC" />
					{:else if $barcode === 'pdf417'}
						<img alt={$barcode} class="block mx-auto" src="data:image/png;base64,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" />
					{:else if $barcode === 'aztec'}
						<img alt={$barcode} class="block mx-auto" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEwAAABMCAYAAADHl1ErAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAANBSURBVHhe7ZBRiuQwDAX3/peezYcZPCXZ1WrHIYEUFAG/J5n438FPRWL52fC+szWOTj44klh+NrzvbI2jkw+OJJafDe87W+Po5IMjieVnw/vO1jg65YGSJOs8zL8HBvsmyToP8++Bwb5Jss7D/HtgsG+SrPMo23/8kpYmGtlML9mdE+szD41QEI1sppfszon1mYdGKIhGNtNLdufE+sxDIxREI5vpJbtzYn3mvhFwAWFOq2Q7eo1sZqbxPhg03geDxvtg0AiNbEkvyTq9xHJi/d05CQ0uoCTr9BLLifV35yQ0uICSrNNLLCfW352T0OACSrJOL7GcWH93Trwh8MK7WyXsaOdfExbe3CphRzv/mrDw5lYJO9r514SFN7dK2NHOfwkFkVi+m7Pv5773wQTuex9M4L73wQTuu/zBmK9KVnMjTHChSar5qmQ1N8IEF5qkmq9KVnMjTHChSar5qmQ1N46ZtQXE9llu2PwF+bxQxfZZbtj8Bfm8UMX2WW7Y/AX5vFDF9llu2PwFuRamkrvlJvkg18JUcrfcJB/kWphK7pab5INcC1PJ3XKTfJBrYZoT61tu2DzzVclxpoVpTqxvuWHzzFclx5kWpjmxvuWGzTNflRxnWpjmxPqWGzbPfFVynGlhKqnmq5Ks02tY/zjTwlRSzVclWafXsP5xpoWppJqvSrJOr2H940wLU0k1X5VknV7D+sfZ34JJsk7v1dj9zClJOuFgKsk6vVdj9zOnJOmEg6kk6/Rejd3PnJKkEw6mkqzTezV2P3NKQqedDwkDkGSdJ0veBxPJ+2AieR9MJKc/2Nlkd840spleEjrtfEgYgLvJ7pxpZDO9JHTa+ZAwAHeT3TnTyGZ6Sei08yFhAO4mu3Omkc30ktBp50PCACRZZybZnZNyv32HcCElWWcm2Z2Tcr99h3AhJVlnJtmdk3K/fYdwISVZZybZnZNyv32H2ELmVYnlRnW+3G/fIbaQeVViuVGdL/fbd4gtZF6VWG5U58v99h1iC5lXJZYb1fkv+rWBu8P/MckH+bzwNPg/JvkgnxeeBv/HJB/k88LT4P+YRPP2/YUDppHN9FbJdvSSrNNb5X2wIu+DFXkfrMTPz391uluqKvp9mwAAAABJRU5ErkJggg==" />
					{:else if $barcode === 'code128'}
						<img alt={$barcode} class="block mx-auto" src="data:image/png;base64,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" />
					{/if}
					<div class="text-sm mt-2 text-black">{$barcodeValue}</div>
				</div>
			</div>
		</div>

		<div class={`flex ${rtl ? 'flex-row-reverse justify-between' : 'justify-between'} items-center p-4`}>
			<div class={`${iconLogoSize} h-10 w-10 rounded-lg flex justify-center items-center`} style="background-color: {$colorF}; color: {$colorB}; cursor: not-allowed;">
				POS
			</div>
			<svg viewBox="0 0 36 40" xmlns="http://www.w3.org/2000/svg" style="fill-rule:evenodd; clip-rule:evenodd; stroke-linejoin:round; stroke-miterlimit:2; width:38px; height:40px; fill:{colorF}; cursor: not-allowed;">
				<path d="M29.608,0.832c4.694,9.378 4.407,18.245 4.37,19.181c0.037,0.815 0.324,9.694 -4.37,19.072c-0,0 -1.223,1.407 -3.04,0.563c-1.816,-0.844 -1.188,-3.093 -1.188,-3.093c0,0 3.804,-7.388 3.704,-16.462l0.001,-0.141c0.099,-9.075 -3.705,-16.59 -3.705,-16.59c0,0 -0.628,-2.249 1.188,-3.093c1.817,-0.843 3.04,0.563 3.04,0.563Zm-9.105,4.217c3.829,7.03 3.569,14.028 3.532,14.964c0.037,0.815 0.297,7.531 -3.527,15.129c0,0 -1.222,1.406 -3.039,0.563c-1.817,-0.844 -1.188,-3.093 -1.188,-3.093c0,-0 2.461,-3.522 2.86,-12.519l0.002,-0.141c-0.261,-8.998 -2.867,-12.372 -2.867,-12.372c0,0 -0.629,-2.249 1.188,-3.093c1.816,-0.844 3.039,0.562 3.039,0.562Zm-12.743,9.073c3.202,0 5.802,2.615 5.802,5.837c-0,3.221 -2.6,5.837 -5.802,5.837c-3.202,-0 -5.802,-2.616 -5.802,-5.837c-0,-3.222 2.6,-5.837 5.802,-5.837Z" style="fill-rule:nonzero;"/>
			</svg>
		</div>
	</div>

	<div class="mt-1.5"><span class="[ text-sm text-gray-400 ]">Note: This is a preview of the design.</span></div>

</div>
