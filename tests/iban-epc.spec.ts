import { test, expect } from '@playwright/test';

test('IBAN defaults PayTo, opts into EPC, preserves copied/shared formats and hides invalid native codes', async ({
	page
}) => {
	page.on('pageerror', (error) => {
		throw error;
	});
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
	await page.goto('/?tab=iban&pass=1');
	await page.getByLabel('IBAN *', { exact: true }).fill('FR1420041010050500013M02606');
	await page.getByText('Customization', { exact: true }).click();
	await expect(page.locator('input[name=qr-format]').first()).toHaveValue('payto');
	await expect(page.getByRole('radio', { name: 'PayTo', exact: true })).toBeChecked();
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	const open = page.getByRole('link', { name: 'Open Weblink', exact: true });
	await expect(open).toHaveAttribute('href', /iban\/FR1420041010050500013M02606/);
	await expect(open).not.toHaveAttribute('href', /[?&]format=/);
	await page.getByLabel('Creditor reference (RF)', { exact: true }).fill('RF18539007547034');
	await page.getByLabel('Purpose code', { exact: true }).fill('GDDS');
	await page.getByLabel('Beneficiary information', { exact: true }).fill('Invoice details');
	const portable = new URL(await page.locator('#item_0').inputValue());
	expect(portable.searchParams.get('reference')).toBe('RF18539007547034');
	expect(portable.searchParams.get('purpose')).toBe('GDDS');
	expect(portable.searchParams.get('information')).toBe('Invoice details');
	await page.getByRole('radio', { name: 'EPC SEPA', exact: true }).check();
	await expect(page.getByLabel('Creditor reference (RF)', { exact: true })).toHaveValue(
		'RF18539007547034'
	);
	await expect(page.getByText(/Invalid beneficiary name/)).toHaveCount(0);
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeDisabled();
	await page.getByLabel('Beneficiary Full Name *', { exact: true }).fill('François Test');
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeEnabled();
	await expect(open).toHaveAttribute('href', /format=epc/);
	await expect(page.locator('#item_0')).not.toHaveValue(/format=/);
	await page.getByLabel('Amount', { exact: true }).fill('12.30');
	await page.getByLabel('Fiat currency', { exact: true }).fill('USD');
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await page.getByLabel('Fiat currency', { exact: true }).fill('EUR');
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await page.getByLabel('BIC', { exact: true }).fill('INVALID');
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await page.getByLabel('BIC', { exact: true }).fill('AGRIFRPP');
	await expect(open).toHaveAttribute('href', /iban\/AGRIFRPP\/FR1420041010050500013M02606/);
	await page.getByRole('button', { name: 'Copy link to clipboard', exact: true }).click();
	expect(await page.evaluate(() => (window as any).__copiedPass)).toBe(
		await open.getAttribute('href')
	);
	const uri = (await open.getAttribute('href'))!.replace(/^https?:\/\/[^/]+\/:/, 'payto:');
	await page.goto('/show/?url=' + encodeURIComponent(uri));
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await page.goto('/show/?url=' + encodeURIComponent('payto://iban/FR1420041010050500013M02606'));
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await page.goto(
		'/show/?url=' + encodeURIComponent('payto://iban/FR1420041010050500013M02606?format=epc')
	);
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
});

test('EPC shows missing BIC and invalid RF beside fields and renders every barcode after correction', async ({
	page
}) => {
	await page.goto('/?tab=iban&pass=1');
	await page.getByLabel('IBAN *', { exact: true }).fill('AL35202111090000000001234567');
	await page.getByText('Customization', { exact: true }).click();
	await page.getByRole('radio', { name: 'EPC SEPA', exact: true }).check();
	await page.getByLabel('Beneficiary Full Name *', { exact: true }).fill('fz');
	await page.getByLabel('Creditor reference (RF)', { exact: true }).fill('dzb');
	await expect(page.getByText('BIC is required for a non-EEA beneficiary.')).toBeVisible();
	await expect(page.getByText(/Enter a valid RF creditor reference/)).toBeVisible();
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await page.getByLabel('BIC *', { exact: true }).fill('SGSBALTX');
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await page.getByLabel('Creditor reference (RF)', { exact: true }).fill('RF18539007547034');
	await expect(page.getByText(/Enter a valid RF creditor reference/)).toHaveCount(0);
	for (const [label, type] of [
		['PDF 417', 'pdf417'],
		['Aztec', 'aztec'],
		['Code 128', 'code128'],
		['QR Code', 'qr']
	]) {
		await page.locator('#barcode-list').click();
		await page.getByText(label, { exact: true }).last().click();
		await expect(page.getByTestId('payment-barcode')).toBeVisible();
		await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeEnabled();
		const href = await page
			.getByRole('link', { name: 'Open Weblink', exact: true })
			.getAttribute('href');
		expect(href).toContain('format=epc');
		if (type !== 'qr') expect(href).toContain('barcode=' + type);
	}
});

test('BIC requirement and validation follow format and beneficiary country', async ({ page }) => {
	await page.goto('/?tab=iban&pass=1');
	await page.getByLabel('IBAN *', { exact: true }).fill('AL35202111090000000001234567');
	await page.getByText('Customization', { exact: true }).click();
	const bic = page.getByPlaceholder('e.g. DABADKKK');
	await expect(bic).not.toHaveAttribute('required');
	await expect(bic).toHaveAttribute('aria-invalid', 'false');
	await expect(page.getByLabel('BIC', { exact: true })).toBeVisible();
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await page.getByRole('radio', { name: 'EPC SEPA', exact: true }).check();
	await expect(page.getByLabel('BIC *', { exact: true })).toBeVisible();
	await expect(bic).toHaveAttribute('required', '');
	await expect(bic).toHaveAttribute('aria-invalid', 'true');
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await page.getByRole('radio', { name: 'PayTo', exact: true }).check();
	await expect(bic).not.toHaveAttribute('required');
	await expect(bic).toHaveAttribute('aria-invalid', 'false');
	await expect(page.getByText('BIC is required for a non-EEA beneficiary.')).toHaveCount(0);
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await page.getByRole('radio', { name: 'EPC SEPA', exact: true }).check();
	await bic.fill('INVALID');
	await expect(bic).toHaveAttribute('aria-invalid', 'true');
	await bic.fill('SGSBALTX');
	await expect(bic).toHaveAttribute('aria-invalid', 'false');
	await bic.fill('');
	await page.getByLabel('IBAN *', { exact: true }).fill('FR1420041010050500013M02606');
	await expect(page.getByLabel('BIC', { exact: true })).toBeVisible();
	await expect(bic).not.toHaveAttribute('required');
	await expect(bic).toHaveAttribute('aria-invalid', 'false');
});

test('EPC identifies missing beneficiary name and restores preview when filled', async ({
	page
}) => {
	await page.goto('/?tab=iban&pass=1');
	await page.getByLabel('IBAN *', { exact: true }).fill('AL35202111090000000001234567');
	await page.getByLabel('BIC', { exact: true }).fill('ALLLLLLL');
	await page.getByText('Customization', { exact: true }).click();
	await page.getByRole('radio', { name: 'EPC SEPA', exact: true }).check();
	const name = page.getByPlaceholder('e.g. John Doe');
	const error = page.getByText('Beneficiary full name is required for EPC SEPA.');
	await expect(name).toHaveAttribute('required', '');
	await expect(name).toHaveAttribute('aria-invalid', 'true');
	await expect(error).toBeVisible();
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await name.fill('Test Beneficiary');
	await expect(error).toHaveCount(0);
	await expect(name).toHaveAttribute('aria-invalid', 'false');
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
	await expect(page.getByRole('button', { name: /Add PayPass to Apple Wallet/ })).toBeEnabled();
	await name.fill(' '.repeat(3));
	await expect(error).toBeVisible();
	await expect(page.getByTestId('payment-barcode')).toHaveCount(0);
	await name.fill('X'.repeat(71));
	await expect(
		page.getByText('Use at most 70 characters without control characters.')
	).toBeVisible();
	await page.getByRole('radio', { name: 'PayTo', exact: true }).check();
	await name.fill('');
	await expect(name).not.toHaveAttribute('required');
	await expect(name).toHaveAttribute('aria-invalid', 'false');
	await expect(error).toHaveCount(0);
	await expect(page.getByTestId('payment-barcode')).toBeVisible();
});
