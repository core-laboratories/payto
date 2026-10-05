<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronDown } from 'lucide-svelte';
	import { FieldGroup, FieldGroupLabel, FieldGroupText, FieldGroupAppendix } from '#lib/components/index.js';
	import { constructor } from '#lib/store/constructor.store.js';
	import { aseanQrCountries } from '#lib/payqr/countries.js';
	import { initialPayQrForm, payQrFieldFeedback } from '#lib/validators/payqr.validator.js';
	import type { PayQrForm } from '#lib/validators/payqr.validator.js';
	import { payQrAdapters } from '#lib/payqr/national/adapters.js';
	import { payQrSchemes } from '$payqr';
	import type { PayQrCountry } from '$payqr';

	let country = $state<PayQrCountry>('kh');
	let form = $state<PayQrForm>(initialPayQrForm('kh'));
	const scheme = $derived(country ? payQrSchemes[country] : undefined);
	function feedback(field: keyof PayQrForm) {
		return payQrFieldFeedback(form, field);
	}
	function fieldClass(field: keyof PayQrForm) {
		const state = feedback(field).state;
		if (state === 'invalid')
			return 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500';
		if (state === 'unverified')
			return 'border-2 border-amber-500 focus:border-amber-500 focus-visible:border-amber-500';
		if (state === 'valid')
			return 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500';
		return '';
	}

	function syncForm() {
		const value = { ...form };
		constructor.update((state) => {
			state.networks.qr.payQrForm = value;
			if (!payQrAdapters[country].supportsGeneration) state.design.qrFormat = 'payto';
			return state;
		});
	}
	onMount(syncForm);
	let resetHandled = false;
	$effect(() => {
		if ($constructor.isCleared && !resetHandled) {
			resetHandled = true;
			country = 'kh';
			form = initialPayQrForm('kh');
		} else if (!$constructor.isCleared) {
			resetHandled = false;
		}
	});
	function changeCountry(event: Event) {
		country = (event.currentTarget as HTMLSelectElement).value as PayQrCountry;
		form = initialPayQrForm(country);
		syncForm();
	}
	const hints: Partial<Record<PayQrCountry, string>> = {
		id: 'Identifier provided by your QRIS acquirer. NMID and merchant PAN routing are not verified.',
		ph: 'Issuer-provided identifier. Bank, mobile and merchant identifier formats are not verified.',
		la: 'Receiver ID supplied by your institution, up to 25 ASCII characters.',
		kh: 'Bakong account ID, up to 32 characters (for example name@bank).',
		my: 'Acquirer-issued QR ID: 1–28 letters or digits. This is not a phone number or bank account.',
		mm: 'Use the 15-digit QR merchant ID supplied by your acquirer; do not truncate an account number.',
		sg: 'Registered mobile proxy (+6581234567) or 10-character UEN.',
		vn: 'Receiving account number: up to 19 letters or digits.',
		th: 'Mobile: 0812345678 or +66812345678. National/tax ID: 13 digits. E-wallet ID: 15 digits.'
	};
</script>

<div class="flex flex-col gap-6" oninput={syncForm} onchange={syncForm}>
	<div class="flex flex-col gap-2">
		<label for="payqr-country" class="font-bold">Country</label>
		<select
			id="payqr-country"
			class="w-full p-3 bg-gray-900 rounded-md"
			bind:value={country}
			onchange={changeCountry}
		>
			{#each aseanQrCountries as option}<option value={option.value}>{option.label}</option>{/each}
		</select>
		{#if scheme}<p class="text-sm text-gray-400">Payment network: {scheme.name}</p>{/if}
	</div>
	{#if form && scheme && country}
		{#if country === 'ph'}
			<label class="flex flex-col gap-2"
				>Payment mode
				<select
					class="p-3 bg-gray-900 rounded-md"
					aria-label="Payment mode"
					bind:value={form.paymentMode}
				>
					<option value="">Unspecified</option>
					<option value="p2p">Person-to-Person (P2P)</option>
					<option value="p2m">Person-to-Merchant (P2M)</option>
				</select>
			</label>
		{/if}
		{#if scheme.identifierTypes.length > 1}
			<div class="flex flex-col gap-2">
				<label for="payqr-identifier-type" class="font-bold">Identifier type</label>
				<select
					id="payqr-identifier-type"
					class="p-3 bg-gray-900 rounded-md"
					bind:value={form.identifierType}
				>
					{#each scheme.identifierTypes as identifierType}<option value={identifierType}
							>{identifierType}</option
						>{/each}
				</select>
			</div>
		{/if}
		<FieldGroup>
			<FieldGroupLabel>Payment identifier *</FieldGroupLabel>
			<FieldGroupText
				placeholder="Identifier issued by your payment provider"
				bind:value={form.identifier}
				classValue={fieldClass('identifier')}
				aria-invalid={feedback('identifier').state === 'invalid'}
				required
			/>
			{#if feedback('identifier').message}<span
					class={feedback('identifier').state === 'invalid'
						? 'text-sm text-rose-500'
						: 'text-sm text-amber-500'}
					aria-live="polite">{feedback('identifier').message}</span
				>{/if}
			{#if hints[country]}<FieldGroupAppendix>{hints[country]}</FieldGroupAppendix>{/if}
		</FieldGroup>
		{#if country === 'my' || country === 'vn' || country === 'la'}
			<FieldGroup>
				<FieldGroupLabel
					>{country === 'la'
						? 'Receiving institution IIN *'
						: country === 'vn'
							? 'Receiving bank BIN *'
							: 'Acquirer ID *'}</FieldGroupLabel
				>
				<FieldGroupText
					placeholder={country === 'la'
						? 'Six-digit institution IIN'
						: country === 'vn'
							? 'Six-digit receiving bank BIN'
							: 'Six-digit acquirer ID'}
					bind:value={form.acquirerId}
					classValue={fieldClass('acquirerId')}
					aria-invalid={feedback('acquirerId').state === 'invalid'}
					required
				/>
				{#if feedback('acquirerId').message}<span
						class={feedback('acquirerId').state === 'invalid'
							? 'text-sm text-rose-500'
							: 'text-sm text-amber-500'}
						aria-live="polite">{feedback('acquirerId').message}</span
					>{/if}
			</FieldGroup>
		{/if}
		{#if ['my', 'th', 'kh', 'mm', 'sg', 'la'].includes(country)}
			<FieldGroup>
				<FieldGroupLabel>Receiver name *</FieldGroupLabel>
				<FieldGroupText
					placeholder="Receiver name"
					bind:value={form.receiverName}
					classValue={fieldClass('receiverName')}
					aria-invalid={feedback('receiverName').state === 'invalid'}
					required
				/>
				{#if feedback('receiverName').message}<span
						class={feedback('receiverName').state === 'invalid'
							? 'text-sm text-rose-500'
							: 'text-sm text-amber-500'}
						aria-live="polite">{feedback('receiverName').message}</span
					>{/if}
			</FieldGroup>
		{/if}
		{#if ['my', 'kh', 'mm'].includes(country)}
			<FieldGroup>
				<FieldGroupLabel
					>{country === 'kh' ? 'Merchant city (optional)' : 'Merchant city *'}</FieldGroupLabel
				>
				<FieldGroupText
					placeholder={country === 'kh' ? 'Phnom Penh' : 'Merchant city'}
					bind:value={form.merchantCity}
					classValue={fieldClass('merchantCity')}
					aria-invalid={feedback('merchantCity').state === 'invalid'}
					required={country !== 'kh'}
				/>
				{#if country === 'my'}<FieldGroupAppendix
						>Use MY if a merchant city is not applicable.</FieldGroupAppendix
					>{/if}
				{#if feedback('merchantCity').message}<span
						class={feedback('merchantCity').state === 'invalid'
							? 'text-sm text-rose-500'
							: 'text-sm text-amber-500'}
						aria-live="polite">{feedback('merchantCity').message}</span
					>{/if}
			</FieldGroup>
		{/if}
		{#if ['my', 'mm'].includes(country)}
			<FieldGroup>
				<FieldGroupLabel>Merchant category code *</FieldGroupLabel>
				<FieldGroupText
					placeholder="Four-digit MCC"
					bind:value={form.mcc}
					classValue={fieldClass('mcc')}
					aria-invalid={feedback('mcc').state === 'invalid'}
					required
				/>
				{#if feedback('mcc').message}<span
						class={feedback('mcc').state === 'invalid'
							? 'text-sm text-rose-500'
							: 'text-sm text-amber-500'}
						aria-live="polite">{feedback('mcc').message}</span
					>{/if}
			</FieldGroup>
		{/if}
		{#if country === 'kh'}
			<label class="flex flex-col gap-2"
				>Recipient type
				<select
					class="p-3 bg-gray-900 rounded-md"
					aria-label="Recipient type"
					bind:value={form.recipientType}
				>
					<option value="">Individual</option><option value="merchant">Merchant</option>
				</select>
			</label>
			{#if form.recipientType === 'merchant'}
				{#each [{ field: 'merchantId', label: 'Merchant ID *' }, { field: 'acquiringBank', label: 'Acquiring bank *' }] as item}
					<FieldGroup>
						<FieldGroupLabel>{item.label}</FieldGroupLabel>
						<FieldGroupText
							placeholder=""
							bind:value={form[item.field as 'merchantId' | 'acquiringBank']}
							classValue={fieldClass(item.field as keyof PayQrForm)}
							required
						/>
						{#if feedback(item.field as keyof PayQrForm).message}<span class="text-sm text-rose-500"
								>{feedback(item.field as keyof PayQrForm).message}</span
							>{/if}
					</FieldGroup>
				{/each}
			{/if}
		{/if}
		{#if ['kh', 'my', 'sg', 'th', 'vn', 'la', 'mm', 'ph', 'id'].includes(country)}
			<details class="payment-details">
				<summary class="flex items-center justify-between cursor-pointer list-none">
					<span>Payment details</span>
					<span class="disclosure-chevron" aria-hidden="true"><ChevronDown class="w-4 h-4" /></span>
				</summary>
				<div class="flex flex-col gap-4 mt-4">
					{#if country === 'ph' || country === 'id'}
						<p class="text-sm text-gray-400">
							These are PayTo link details; native {scheme.name} mapping is not available.
						</p>
						<FieldGroup
							><FieldGroupLabel>Receiver name</FieldGroupLabel><FieldGroupText
								placeholder=""
								bind:value={form.receiverName}
								classValue={fieldClass('receiverName')}
							/></FieldGroup
						>
					{/if}
					<label class="flex flex-col gap-2"
						>QR type
						<select
							class="p-3 bg-gray-900 rounded-md"
							aria-label="QR type"
							bind:value={form.qrType}
							onchange={() => {
								if (country === 'id' && form.qrType === 'static') form.amount = '';
							}}
						>
							<option value="">{['ph', 'id'].includes(country) ? 'Unspecified' : 'Static'}</option>
							{#if country === 'ph' || country === 'id'}<option value="static">Static</option>{/if}
							<option value="dynamic">Dynamic</option>
						</select>
					</label>
					{#if country !== 'id' || form.qrType !== 'static'}
						<FieldGroup>
							<FieldGroupLabel
								>Amount ({form.currency}){form.qrType === 'dynamic' ? ' *' : ''}</FieldGroupLabel
							>
							<FieldGroupText
								placeholder="Amount"
								bind:value={form.amount}
								classValue={fieldClass('amount')}
								required={form.qrType === 'dynamic'}
							/>
							{#if feedback('amount').message}<span class="text-sm text-rose-500"
									>{feedback('amount').message}</span
								>{/if}
						</FieldGroup>
					{/if}
					{#if ['my', 'sg', 'la', 'mm', 'ph', 'id'].includes(country)}
						<FieldGroup
							><FieldGroupLabel>Reference</FieldGroupLabel><FieldGroupText
								placeholder=""
								bind:value={form.reference}
								classValue={fieldClass('reference')}
							/></FieldGroup
						>
					{/if}
					{#if ['kh', 'vn', 'la', 'mm'].includes(country)}
						<FieldGroup
							><FieldGroupLabel>Bill number</FieldGroupLabel><FieldGroupText
								placeholder=""
								bind:value={form.billNumber}
								classValue={fieldClass('billNumber')}
							/></FieldGroup
						>
						<FieldGroup
							><FieldGroupLabel>Payment purpose</FieldGroupLabel><FieldGroupText
								placeholder=""
								bind:value={form.message}
								classValue={fieldClass('message')}
							/></FieldGroup
						>
					{/if}
					{#if country === 'kh' && (form.amount || form.qrType === 'dynamic')}
						{#each [{ field: 'creationTimestamp', label: 'Created at *' }, { field: 'expirationTimestamp', label: 'Expires at *' }] as item}
							<label class="flex flex-col gap-2"
								>{item.label}<input
									type="datetime-local"
									class={`p-3 bg-gray-900 rounded-md ${fieldClass(item.field as keyof PayQrForm)}`}
									aria-invalid={feedback(item.field as keyof PayQrForm).state === 'invalid'}
									required
									oninput={(event) => {
										const timestamp = new Date(event.currentTarget.value).getTime();
										form[item.field as 'creationTimestamp' | 'expirationTimestamp'] =
											Number.isFinite(timestamp) ? String(timestamp) : '';
										syncForm();
									}}
								/></label
							>
						{/each}
					{/if}
				</div>
			</details>
		{/if}
		{#if country === 'la'}
			<FieldGroup>
				<FieldGroupLabel>Application ID (AID) *</FieldGroupLabel>
				<FieldGroupText
					placeholder="16-character AID supplied by your institution"
					bind:value={form.applicationId}
					classValue={fieldClass('applicationId')}
					aria-invalid={feedback('applicationId').state === 'invalid'}
					required
				/>
				{#if feedback('applicationId').message}<span
						class="text-sm text-rose-500"
						aria-live="polite">{feedback('applicationId').message}</span
					>{/if}
			</FieldGroup>
		{/if}
		{#if country === 'kh'}
			<div class="flex flex-col gap-2">
				<label for="payqr-currency">Currency *</label>
				<select
					id="payqr-currency"
					class="p-3 bg-gray-900 rounded-md"
					bind:value={form.currency}
					required
				>
					<option value="KHR">KHR</option><option value="USD">USD</option>
				</select>
			</div>
		{/if}
		{#if country === 'mm'}
			{#each [{ field: 'schemeId', label: 'Payment scheme ID *', placeholder: 'Reverse domain supplied by your acquirer' }, { field: 'localName', label: 'Receiver name in Myanmar *', placeholder: 'Myanmar receiver name' }] as item}
				<FieldGroup>
					<FieldGroupLabel>{item.label}</FieldGroupLabel>
					<FieldGroupText
						placeholder={item.placeholder}
						bind:value={form[item.field as 'schemeId' | 'localName']}
						classValue={fieldClass(item.field as keyof PayQrForm)}
						aria-invalid={feedback(item.field as keyof PayQrForm).state === 'invalid'}
						required
					/>
					{#if feedback(item.field as keyof PayQrForm).message}<span
							class="text-sm text-rose-500"
							aria-live="polite">{feedback(item.field as keyof PayQrForm).message}</span
						>{/if}
				</FieldGroup>
			{/each}
		{/if}
	{/if}
</div>

<style>
	.payment-details > summary::-webkit-details-marker {
		display: none;
	}
	.payment-details[open] > summary .disclosure-chevron {
		transform: rotate(180deg);
	}
</style>
