# IBAN PayPass: PayTo and EPC SEPA

PayTo is the first/default format. EPC SEPA selects EPC SEPA Credit Transfer QR data. Payment/integration links never include `format`. PayPass preview and Copy/Open Weblink include `format=epc` only when EPC SEPA is selected; PayTo is the default and omits the parameter. Changing formats replaces the preview immediately. Unsupported native data hides the barcode and disables wallet downloads; validation errors are not displayed beside the format controls.

Reference, purpose and beneficiary information fields remain visible in both formats and are included in PayTo links. EPC beneficiary name and conditionally required BIC have asterisks and inline validation. Missing/invalid names, missing/invalid BICs, invalid RF references and conflicting reference/message values are reported beside the form fields, not in the barcode area. PayTo does not require a beneficiary name or BIC.

The encoder follows [EPC069-12 v3.1](https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation): version 002, UTF-8 charset 1, LF-separated fields, no trailing separators, at most 331 bytes. QR uses error correction M. EPC data can also be rendered as PDF417, Aztec, or Code 128 in previews and wallet passes. These are alternate encodings of the same data; EPC069-12 standardizes QR only, so bank-app acceptance of other symbologies is not guaranteed.

Required: valid SEPA IBAN and beneficiary name (70 characters maximum). BIC is required for non-EEA beneficiaries; include it also when the payer's bank is outside the EEA, which cannot be inferred from a beneficiary-only link. Geographic checks use [EPC409-09 v8.0](https://www.europeanpaymentscouncil.eu/document-library/other/epc-list-sepa-scheme-countries) and do not verify bank participation.

Amount is optional, EUR only, 0.01–999999999.99. An amount without currency means EUR in native mode. Native fields support a four-letter purpose code, an ISO 11649 RF creditor reference (checksum validated) **or** an unstructured message (140 characters), and beneficiary information (70 characters). The structured-reference profile supports RF references only. Unknown payment parameters, including recurring/deadline instructions, are rejected rather than silently omitted. Controls, duplicate parameters and excess UTF-8 byte lengths are rejected without truncation.

EPC describes this format for use alongside readable payment details, such as an invoice; it does not initiate a transfer or verify a beneficiary. Supply those details with the code. The libraries expose `formats: ['payto', 'epc']` and the PayTo URI extensions; EPC encoding remains in the website.

## Form/API

Both JSON and form submissions to `/pass` use the existing design object:

```json
{
	"hostname": "iban",
	"os": "ios",
	"props": {
		"network": "iban",
		"iban": "FR1420041010050500013M02606",
		"params": {
			"receiverName": { "value": "Example beneficiary" },
			"currency": { "value": "EUR" },
			"amount": { "value": "12.30" }
		}
	},
	"design": { "qrFormat": "epc", "barcode": "qr" }
}
```

Use `os: "android"` for Google Wallet. Omit `design`, omit `design.qrFormat`, or set `payto` for a PayTo barcode. Form fields `props` and `design` contain JSON strings. Optional `props.bic` goes before IBAN in the URI. Optional `params.reference`, `params.purpose` and `params.information` use `{ "value": "..." }`, like `params.message`. Invalid native data returns HTTP 400 before signing. Apple barcode message encoding is UTF-8. Both wallet types and the online preview use the same encoder.

## Verification

Tests cover the guideline's example fields using UTF-8, optional amount/BIC, RF checksums, field and byte limits, wrong currencies, invalid IBAN/BIC, mutually exclusive remittance, all four barcode types, JSON/form and both wallet platforms, preview readiness and shared/copied links. The fast API tests mock wallet builders; the [artifact suite](WALLET-TESTING.md) also exercises real builders and verifies signatures using ephemeral test credentials. No passes are registered or published.

The legacy `native` format remains accepted as an alias for `epc`; newly generated PayPass links use `epc`.
