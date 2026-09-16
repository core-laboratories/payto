import { test, expect, type Page } from '@playwright/test';
async function selectNative(page: Page) {
	await page.getByText('Customization', { exact: true }).click();
	const scheme = (await page.getByText(/^Payment network: /).textContent())!.replace('Payment network: ', '').trim();
	await page.getByRole('radio', { name: scheme, exact: true }).check();
	await page.getByText('Customization', { exact: true }).click();
}

test.beforeEach(({ page }) => {
	page.on('pageerror', (error) => {
		throw error;
	});
});

test('Cambodia defaults, required-only fields, all integrations and PayPass preview', async ({
	page
}) => {
	await page.goto('/?tab=qr');
	const country = page.getByLabel('Country', { exact: true });
	await expect(country).toHaveValue('kh');
	await expect(page.locator('#item_0')).toHaveValue('payto://qr/kh');
	await expect(country.locator('option')).toHaveCount(9);
	await expect(country.locator('option[value=bn]')).toHaveCount(0);
	await expect(page.getByLabel('Organization', { exact: true })).toHaveCount(0);
	await expect(page.getByLabel('Message', { exact: true })).toHaveCount(0);
	const identifier = page.getByLabel('Payment identifier *', { exact: true });
	await expect(identifier).not.toHaveClass(/border-(rose|amber|emerald)-500/);
	await expect(page.getByText('Enter the payment identifier', { exact: true })).toHaveCount(0);
	await identifier.fill('http://invalid.example');
	await expect(identifier).toHaveClass(/border-rose-500/);
	await expect(page.locator('#item_0')).toHaveValue('payto://qr/kh');
	await expect(
		page.getByText('Invalid PayQR identifier: use an issuer identifier, not a URL or QR payload', {
			exact: true
		})
	).toHaveCount(1);
	await identifier.fill('name@bank');
	await expect(identifier).toHaveClass(/border-emerald-500/);
	await expect(page.locator('#item_5')).toHaveValue(
		'<meta property="qr:kh" content="name@bank" />'
	);
	await expect(page.locator('#item_6')).toHaveValue('[{"qr:kh":"name@bank"}]');
	await expect(page.locator('#item_0')).toHaveValue(/payto:\/\/qr\/kh\/name%40bank/);
	await expect(page.locator('#item_1')).toBeVisible();
	await expect(page.locator('#item_6')).toBeVisible();
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await page.locator('label[for=designCheckbox]').click();
	await selectNative(page);
	await expect(page.getByText('Online Pass preview')).toBeVisible();
	await expect(page.getByLabel('QR payload')).toHaveCount(0);
	await page.getByLabel('Payment identifier *', { exact: true }).fill('a@bank');
	await expect(page.locator('#item_0')).toHaveValue('payto://qr/kh/a%40bank?qr-currency=KHR');
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await expect(page.getByText(/needs an issuer\/acquirer specification/)).toHaveCount(0);
	await page.getByRole('button', { name: 'Clear', exact: true }).click();
	await expect(country).toHaveValue('kh');
	await expect(page.getByLabel('Payment identifier *', { exact: true })).toHaveValue('');
});

test('DuitNow national QR is inside PayPass and survives a shared pass link', async ({ page }) => {
	await page.goto('/?tab=qr');
	await page.getByLabel('Country', { exact: true }).selectOption('my');
	await page.getByLabel('Payment identifier *', { exact: true }).fill('MERCHANT01');
	await expect(page.getByLabel('Payment identifier *', { exact: true })).toHaveClass(
		/border-emerald-500/
	);
	await page.getByLabel('Acquirer ID *').fill('588734');
	await page.getByLabel('Receiver name *').fill('Test Shop');
	await page.getByLabel(/Merchant city/).fill('KUALA LUMPUR');
	await page.getByLabel('Merchant category code *').fill('5411');
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await page.locator('label[for=designCheckbox]').click();
	await selectNative(page);
	await expect(page.getByTestId('payment-barcode').first()).toBeVisible();
	const uri = (await page
		.getByRole('link', { name: 'Open Weblink', exact: true })
		.getAttribute('href'))!.replace(/^https?:\/\/[^/]+\/:/, 'payto:');
	await page.goto('/show/?url=' + encodeURIComponent(uri));
	await expect(page.getByTestId('payment-barcode').first()).toBeVisible();
	await expect(page.getByText('National payment QR', { exact: true })).toHaveCount(0);
});

test('both wallet download requests preserve the national payment details', async ({ page }) => {
	const requests: Record<string, string>[] = [];
	await page.route('**/pass?noRedirect=1', async (route) => {
		const request = route.request();
		const data = await new Request('http://localhost/pass', {
			method: 'POST',
			headers: request.headers(),
			body: request.postData()!
		}).formData();
		requests.push(Object.fromEntries([...data].map(([key, value]) => [key, String(value)])));
		// Exercise the download request without issuing or registering a real wallet pass.
		await route.fulfill({
			status: 400,
			contentType: 'application/json',
			body: JSON.stringify({ message: 'Test signing boundary' })
		});
	});
	await page.goto('/?tab=qr&pass=1');
	await page.getByLabel('Country', { exact: true }).selectOption('my');
	await selectNative(page);
	await page.getByLabel('Payment identifier *', { exact: true }).fill('MERCHANT01');
	await page.getByLabel('Acquirer ID *').fill('588734');
	await page.getByLabel('Receiver name *').fill('Test Shop');
	await page.getByLabel(/Merchant city/).fill('KUALA LUMPUR');
	await page.getByLabel('Merchant category code *').fill('5411');
	await page.getByRole('button', { name: /Add PayPass to Apple Wallet/ }).click();
	await expect.poll(() => requests.length).toBe(1);
	await page.getByRole('button', { name: /Add PayPass to Google Wallet/ }).click();
	await expect.poll(() => requests.length).toBe(2);
	expect(requests.map((r) => r.os)).toEqual(['ios', 'android']);
	for (const request of requests) {
		expect(request.hostname).toBe('qr');
		expect(JSON.parse(request.props).payQrForm).toMatchObject({
			country: 'my',
			identifier: 'MERCHANT01'
		});
		expect(JSON.parse(request.design).qrFormat).toBe('native');
	}
});

for (const example of [
	{ country: 'la', identifier: '5555555', name: 'Test', iin: '621354', aid: 'A000000677012111' },
	{ country: 'kh', identifier: 'name@bank', name: 'Test Shop', city: 'Phnom Penh' },
	{ country: 'sg', identifier: '+6581234567', name: 'Test' },
	{ country: 'vn', identifier: '0011009950446', bin: '970468' },
	{
		country: 'mm',
		identifier: '123456789012345',
		name: 'Test',
		city: 'Yangon',
		mcc: '5411',
		gui: 'MM.COM.MMQR',
		localName: 'ဆိုင်'
	},
	{ country: 'th', identifier: '0066812345678', name: 'Test' }
]) {
	test(`${example.country}: native preview, required fields and wallet readiness`, async ({
		page
	}) => {
		await page.goto('/?tab=qr&pass=1');
		await page.getByLabel('Country', { exact: true }).selectOption(example.country);
		await selectNative(page);
		const apple = page.getByRole('button', { name: /Add PayPass to Apple Wallet/ });
		const google = page.getByRole('button', { name: /Add PayPass to Google Wallet/ });
		await expect(apple).toBeDisabled();
		await page.getByLabel('Payment identifier *', { exact: true }).fill(example.identifier);
		await expect(apple).toBeDisabled();
		if (example.name) await page.getByLabel('Receiver name *', { exact: true }).fill(example.name);
		if (example.city) await page.getByLabel(/Merchant city/).fill(example.city);
		if (example.iin) await page.getByLabel('Receiving institution IIN *').fill(example.iin);
		if (example.aid) await page.getByLabel('Application ID (AID) *').fill(example.aid);
		if (example.bin) await page.getByLabel('Receiving bank BIN *').fill(example.bin);
		if (example.mcc) await page.getByLabel('Merchant category code *').fill(example.mcc);
		if (example.gui) await page.getByLabel('Payment scheme ID *').fill(example.gui);
		if (example.localName)
			await page.getByLabel('Receiver name in Myanmar *').fill(example.localName);
		await expect(page.getByTestId('payment-barcode').first()).toBeVisible();
		await expect(apple).toBeEnabled();
		await expect(google).toBeEnabled();
		const uri = (await page
			.getByRole('link', { name: 'Open Weblink', exact: true })
			.getAttribute('href'))!.replace(/^https?:\/\/[^/]+\/:/, 'payto:');
		await page.getByLabel('Payment identifier *', { exact: true }).fill('');
		await expect(apple).toBeDisabled();
		await expect(google).toBeDisabled();
		await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
		await page.goto('/show/?url=' + encodeURIComponent(uri));
		await expect(page.getByTestId('payment-barcode').first()).toBeVisible();
	});
}
test('unsupported countries force PayTo and hide the format switch', async ({ page }) => {
	await page.goto('/?tab=qr&pass=1');
	await selectNative(page);
	for (const country of ['id', 'ph']) {
		await page.getByLabel('Country', { exact: true }).selectOption(country);
		await page.getByLabel('Payment identifier *', { exact: true }).fill('ID123');
		await expect(page.getByTestId('payment-barcode')).toBeVisible();
		await expect(page.locator('#item_0')).not.toHaveValue(/format=/);
		await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeEnabled();
		await expect(page.getByRole('button', { name: /Add PayPass to Google Wallet/ })).toBeEnabled();
		await expect(page.locator('input[name=qr-format][value=native]')).toHaveCount(0);
		await expect(page.getByRole('radio', { name: 'PayTo', exact: true })).toHaveCount(0);
	}
	await page.getByLabel('Country', { exact: true }).selectOption('kh');
	await page.getByText('Customization', { exact: true }).click();
	await expect(page.getByRole('radio', { name: 'PayTo', exact: true })).toBeChecked();
});

test('PayNow UEN with amount and reference renders and downloads the native QR', async ({
	page
}) => {
	await page.goto('/?tab=qr&pass=1');
	await page.getByLabel('Country', { exact: true }).selectOption('sg');
	await selectNative(page);
	await page.getByLabel('Identifier type', { exact: true }).selectOption('uen');
	await page.getByLabel('Payment identifier *', { exact: true }).fill('123456789A');
	await page.getByLabel('Receiver name *').fill('Test');
	await page.getByText('Payment details', { exact: true }).click();
	await page.getByLabel('QR type', { exact: true }).selectOption('dynamic');
	await page.getByLabel('Amount (SGD) *', { exact: true }).fill('100');
	await page.getByLabel('Reference', { exact: true }).fill('INV123');
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await expect(page.getByText('Payment QR data', { exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeEnabled();
});

test('KHQR merchant exposes required credentials and generates the merchant template', async ({
	page
}) => {
	await page.goto('/?tab=qr&pass=1');
	await page.getByLabel('Country', { exact: true }).selectOption('kh');
	await selectNative(page);
	await page.getByLabel('Recipient type', { exact: true }).selectOption('merchant');
	await page.getByLabel('Payment identifier *', { exact: true }).fill('name@bank');
	await page.getByLabel('Receiver name *').fill('Test Shop');
	await page.getByLabel(/Merchant city/).fill('Phnom Penh');
	await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeDisabled();
	await page.getByLabel('Merchant ID *', { exact: true }).fill('123456');
	await page.getByLabel('Acquiring bank *', { exact: true }).fill('Test Bank');
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await page.getByText('Payment details', { exact: true }).click();
	await page.getByLabel('QR type', { exact: true }).selectOption('dynamic');
	await page.getByLabel('Amount (KHR) *', { exact: true }).fill('100');
	await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeDisabled();
	await page.getByLabel('Created at *', { exact: true }).fill('2030-01-01T12:00');
	await page.getByLabel('Expires at *', { exact: true }).fill('2030-01-01T12:30');
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeEnabled();
});

test('Thai local mobile input produces canonical URI and national proxy', async ({ page }) => {
	await page.goto('/?tab=qr&pass=1');
	await page.getByLabel('Country', { exact: true }).selectOption('th');
	await selectNative(page);
	await page.getByLabel('Payment identifier *', { exact: true }).fill('0812345678');
	await page.getByLabel('Receiver name *').fill('Test');
	await expect(page.locator('#item_0')).toHaveValue(/payto:\/\/qr\/th\/0066812345678/);
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
});

test('Native / PayTo switch, all barcode types, shared link and invalid fields', async ({
	page
}) => {
	await page.goto('/?tab=qr&pass=1');
	await page.getByLabel('Country', { exact: true }).selectOption('id');
	await page.getByLabel('Payment identifier *', { exact: true }).fill('ID123');
	await page.getByText('Customization', { exact: true }).click();
	await expect(page.locator('input[name=qr-format][value=native]')).toHaveCount(0);
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeEnabled();
	const preview = page.getByTestId('payment-barcode');
	await expect(preview).toContainText('QR/ID123');
	await expect(page.getByText(/Scan here to/)).toBeVisible();
	const canvas = preview.locator('canvas');
	await expect(canvas).toBeVisible();
	const size = await canvas.boundingBox();
	expect(size!.width).toBeLessThan(300);
	expect(size!.width).toBe(size!.height);
	await page.emulateMedia({ media: 'print' });
	await expect(preview).toBeHidden();
	await expect(page.locator('canvas:visible')).toHaveCount(1);
	await page.emulateMedia({ media: 'screen' });
	for (const label of ['PDF 417', 'Aztec', 'Code 128', 'QR Code']) {
		await page.locator('#barcode-list').click();
		await page.getByText(label, { exact: true }).last().click();
		await expect(page.getByTestId('payment-barcode')).toBeVisible();
	}
	const uri = (await page
		.getByRole('link', { name: 'Open Weblink', exact: true })
		.getAttribute('href'))!.replace(/^https?:\/\/[^/]+\/:/, 'payto:');
	expect(uri).not.toContain('format=');
	await page.getByLabel('Payment identifier *', { exact: true }).fill('http://bad');
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await expect(page.getByText(/Scan here to/)).toHaveCount(0);
	await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeDisabled();
	await page.goto('/show/?url=' + encodeURIComponent(uri));
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
});

test('KHQR shows a barcode after identifier and receiver name, without entering a city', async ({
	page
}) => {
	await page.goto('/?tab=qr&pass=1');
	await page.getByLabel('Country', { exact: true }).selectOption('kh');
	await selectNative(page);
	await page.getByLabel('Payment identifier *', { exact: true }).fill('lol@cc');
	await expect(page.getByLabel('Currency *', { exact: true })).toHaveValue('KHR');
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await expect(page.getByLabel('Receiver name *', { exact: true })).toHaveAttribute('required', '');
	await expect(page.getByLabel('Merchant city (optional)', { exact: true })).not.toHaveAttribute(
		'required'
	);
	await page.getByLabel('Receiver name *', { exact: true }).fill('Test');
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeEnabled();
});

test('copy and Open Weblink include the selected format; absent format uses PayTo', async ({
	page
}) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: async (text: string) => {
					(window as any).__copiedPass = text;
				}
			}
		});
	});
	await page.goto('/?tab=qr&pass=1');
	await page.getByLabel('Country', { exact: true }).selectOption('vn');
	await page.getByLabel('Payment identifier *', { exact: true }).fill('00123');
	await page.getByLabel('Receiving bank BIN *', { exact: true }).fill('970468');
	const open = page.getByRole('link', { name: 'Open Weblink', exact: true });
	await expect(open).not.toHaveAttribute('href', /[?&]format=/);
	await page.getByRole('button', { name: 'Copy link to clipboard', exact: true }).click();
	expect(await page.evaluate(() => (window as any).__copiedPass)).toBe(
		await open.getAttribute('href')
	);
	await page.getByText('Customization', { exact: true }).click();
	await expect(page.locator('input[name=qr-format]').first()).toHaveValue('payto');
	await expect(page.getByRole('radio', { name: 'PayTo', exact: true })).toBeChecked();
	await page.locator('input[name=qr-format][value=native]').check();
	await expect(open).toHaveAttribute('href', /[?&]format=vietqr(?:&|$)/);
	await page.getByRole('button', { name: 'Copy link to clipboard', exact: true }).click();
	expect(await page.evaluate(() => (window as any).__copiedPass)).toBe(
		await open.getAttribute('href')
	);
	await page.goto('/show/?url=' + encodeURIComponent('payto://qr/bn/ID123'));
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await page.goto('/show/?url=' + encodeURIComponent('payto://qr/bn/ID123?format=tarusqr'));
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
});

test('QR Ph payment data and explicit portable preview', async ({ page }) => {
	await page.goto('/?tab=qr&pass=1');
	await page.getByLabel('Country', { exact: true }).selectOption('ph');
	await page.getByLabel('Payment identifier *', { exact: true }).fill('Demo@Issuer');
	await page.getByLabel('Payment mode', { exact: true }).selectOption('p2m');
	await page.getByText('Payment details', { exact: true }).click();
	await page.getByLabel('QR type', { exact: true }).selectOption('dynamic');
	await page.getByLabel('Amount (PHP) *', { exact: true }).fill('15.25');
	await page.getByLabel('Reference', { exact: true }).fill('Bill 1');
	await expect(page.locator('#item_0')).toHaveValue(/amount=PHP%3A15.25/);
	await expect(page.locator('#item_0')).toHaveValue(/payment-mode=p2m/);
	await page.getByText('Customization', { exact: true }).click();
	await expect(page.locator('input[name=qr-format]')).toHaveCount(0);
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeEnabled();
	await page.getByLabel('Amount (PHP) *', { exact: true }).fill('1.234');
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
});

test('Indonesia uses IDR rules and explicit PayTo preview', async ({ page }) => {
	await page.goto('/?tab=qr&pass=1');
	await page.getByLabel('Country', { exact: true }).selectOption('id');
	await page.getByLabel('Payment identifier *', { exact: true }).fill('Demo');
	await page.getByText('Payment details', { exact: true }).click();
	await page.getByLabel('QR type', { exact: true }).selectOption('dynamic');
	const amount = page.getByLabel('Amount (IDR) *', { exact: true });
	await amount.fill('10000000.01');
	await expect(amount).toHaveClass(/border-rose-500/);
	await amount.fill('10000000.00');
	await expect(page.locator('#item_0')).toHaveValue(/amount=IDR%3A10000000.00/);
	await page.getByText('Customization', { exact: true }).click();
	await expect(page.locator('input[name=qr-format]')).toHaveCount(0);
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await page.getByLabel('QR type', { exact: true }).selectOption('static');
	await expect(page.getByPlaceholder('Amount', { exact: true })).toHaveCount(0);
	await expect(page.locator('#item_0')).not.toHaveValue(/amount=/);
	await expect(page.locator('#item_0')).toHaveValue(/qr-type=static/);
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
});
