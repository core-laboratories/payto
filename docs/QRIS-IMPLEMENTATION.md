# Indonesian QRIS implementation report — 2026-09-16

## Plan and scope

Inspect existing generic QR URI architecture in all three repositories; research BI/ASPI/participants; retain the opaque URI destination until routing semantics can be verified; implement verified domestic URI rules and bounded raw EMV inspection; add shared fixtures and UI/API coverage; run regression/quality checks. The brief's section 58 stop condition applies to native encoding. This is not complete network-valid QRIS generation.

## Findings and implementation

1. **Sources:** [BI QRIS](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/kanal-layanan/QRIS/default.aspx), [ASPI QRIS](https://aspi-indonesia.or.id/standar-dan-layanan/qris/), [ASPI annual report p. 46](https://aspi-indonesia.or.id/files/2024/12/AR%20ASPI%202023-FA_all_rev.pdf), [ASPI merchant validation bulletin](https://aspi-indonesia.or.id/?jet_download=2136d7541e1099c72a363f7c890e5cb21effb2d6), [Midtrans POS example](https://docs.midtrans.com/docs/gopay-qris-pos-integration), [Midtrans MPM API](https://docs.midtrans.com/reference/mpm-api-qris), [EMVCo](https://www.emvco.com/emv-technologies/qr-codes/). Some ASPI download endpoints returned HTML/errors; indexed bulletin text establishes distinct MID/MPAN/name validation, not tag mappings.
2. **Version:** no national QRIS specification version claimed. Raw ASCII inspection uses existing EMV MPM TLV/CRC conventions. Current public BI domestic cap verified on this date.
3. **Full technical specification:** not obtained. ASPI documents requests for QRIS specifications and test scenarios through SiLA. Participant API examples are not the complete national wire specification.
4. **Primary identifier:** existing opaque acquirer-issued URI identifier.
5. **Reason:** insufficient evidence to equate a portable path with NMID, Merchant PAN, or participant routing. Preserve existing links without an invented migration.
6. **Identifier type:** `issuer`; existing safe portable envelope only. Amber UI feedback states national identifier syntax is unverified.
7. **Merchant PAN:** not modeled or mapped from undocumented subfields.
8. **NMID:** not modeled or conflated with merchant PAN/MID. Raw template values preserved without assigning these labels.
9. **Acquirer/institution:** no new routing fields or guessed codes.
10. **Static:** explicit `qr-type=static` rejects amount; UI clears/hides amount on selecting static. Native static encoding unavailable.
11. **Dynamic:** explicit `qr-type=dynamic` requires amount in the existing portable profile. No transaction ID fabrication or static-to-dynamic transformation.
12. **Currency:** IDR only for the domestic URI profile; raw example retains numeric currency `360` without automatically asserting scheme identity.
13. **Amount:** positive decimal strings, no exponent/sign/leading zeros, at most two fraction digits and existing 13-character value length; maximum 10,000,000 IDR via BigInt minor-unit comparison in both languages. No provider-specific minimum imposed. Portable fractional precision is not an assertion of provider acceptance.
14. **MCC:** no new national MCC rule or form field; raw generic tag retained by inspector.
15. **Merchant name:** optional existing `receiver-name` URI field, generic limits; no invented national limit. Raw generic tag retained.
16. **Merchant city:** no new native city requirement or form field; raw generic tag retained.
17. **Additional data:** generic raw tag 62 subfields preserved. No invented QRIS-specific semantics, fee fields, postal-code rules or NMID mapping.
18. **Reference:** existing optional PayTo reference retained; no assertion of a verified QRIS reference tag.
19. **CRC:** inspector checks terminal uppercase CRC, polynomial 0x1021, initial 0xFFFF, no reflection/final XOR, header included. Published participant fixture CRC A623 verified unchanged.
20. **TLV:** bounded ASCII-only inspection, 4096-character limit, nonzero lengths, complete headers/values, duplicate rejection; known root template ranges parsed one level without recursive interpretation of proprietary fields. Unknown fields preserved. Existing website national utilities remain unchanged to avoid altering other profiles. No QRIS encoder added.
21. **Decoder:** raw `inspectEmvMpm` available in both libraries; returns fields/templates only. No semantic QRIS decoder, scheme detection, PayTo conversion or enrollment validation. ID/360 alone never yields a QRIS target.
22. **Encoder:** unsupported due to missing authoritative national routing and generation requirements. Website native mode stays unavailable, explicit PayTo mode works.
23. **Official vectors:** Midtrans dynamic QRIS POS example, stored identically in both test/fixtures/qris-emv.json files. It is participant documentation, not a national conformance vector. Malformed test fixtures use independent Python binascii CRC for structural rejection tests. No official static conformance vector established.
24. **URI:** canonical `payto://qr/id/{identifier}`, lowercase country, scheme `qris`, sorted escaped parameters; existing JSON/getter/setter/other-country dispatch preserved.
25. **Zod:** existing dedicated indonesiaPayQrSchema validates new static/amount constraints through shared library validation; allows verified static/dynamic selection and domestic amount/currency fields. No speculative native schemas.
26. **Website files:** validators/payqr.validator.ts; PayQrConstructor.svelte; payqr/qris.test.ts and pass-api.test.ts; tests/payqr.spec.ts; PAYQR.md and this report.
27. **TypeScript files:** src/payqr/registry.ts, index.ts, shared/emv.ts; test/emv.test.ts; fixtures/payqr.json and qris-emv.json; README. Generated dist refreshed by build.
28. **Dart files:** lib/flutter_paytorl.dart; lib/src/payqr.dart and emv_mpm.dart; test/emv_mpm_test.dart; matching fixtures; README.
29. **TS tests:** portable static/dynamic/cap/precision/currency cases through shared URI contract; official raw envelope and malformed CRC/TLV/template/security cases.
30. **Dart tests:** same JSON fixtures, matching raw-envelope and URI assertions; existing JSON/setter tests retained.
31. **Regression results:** 180 website unit tests, 18 Playwright browser tests, 174 TypeScript library tests, and 164 Flutter tests passed. API tests cover JSON/form, Apple/Google, portable payload preservation and native rejection before signing (wallet builders mocked). Previous Philippine and other-country tests retained.
32. **Lint:** changed website files formatted and checked; new TypeScript module/tests formatted using tabs; Dart formatter passed. Repository-wide website lint still fails on 106 pre-existing formatting files and ESLint 10 lacks an eslint.config.* flat config. TypeScript library has no configured formatter/lint scripts. Whitespace diff checks passed across all repositories.
33. **Typecheck/analyze:** TypeScript library build/typecheck and Flutter analyze pass. Normal website check remains blocked by the existing TypeScript 7/svelte-check compatibility gate. With the existing temporary /tmp/payqr-ts6-loader.cjs loader, website check reports zero errors and warnings; dependency versions were not changed.
34. **Build:** TypeScript library build and website production build passed. Playwright builds the website before starting its preview server.
35. **Unsupported:** native encoding, semantic national decoding, arbitrary Unicode EMV inspection, CPM, Tuntas, TAP, cross-border protocol/FX, provider networking, enrollment, payments/status/settlement, mandates. No image dependencies in libraries.
36. **Cross-border:** [BI documents partner-app conversion and settlement currencies](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/kanal-layanan/QRIS/QRIS-Antarnegara/default.aspx); this does not establish a local foreign routing encoder. Domestic scope only.
37. **Provider-issued values:** MID, MPAN, NMID and provider routing must originate from the relevant participant/repository, not user invention. The form labels its opaque identifier as acquirer-provided.
38. **Unresolved:** authoritative MAI/template mappings, primary destination semantics, current specification version, permitted additional fields, full static/dynamic transaction rules and conformance vectors. Obtain the applicable ASPI/acquirer specification before expanding native support.

No dependency additions, commits, pushes, publishing or deployment.
