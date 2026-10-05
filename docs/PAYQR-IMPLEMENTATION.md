# PayQR implementation report

> Historical implementation report. Current behavior and library validation limits are documented in [PAYQR.md](PAYQR.md) and [IBAN-EPC.md](IBAN-EPC.md). Test counts below describe earlier checks, not a current coverage guarantee.

The initial scope correction places all national QR functionality in the website. Neither library generates payment QR payloads or images.

- `payto-rl`: URI/data parsing, serialization, normalization, validation and Payto object/JSON integration. Its PayQR entry point exports the URI registry and raw EMV inspector. National adapters and semantic payload parsers remain outside the library.
- `flutter_paytorl`: equivalent URI/data support. Removed the national payload implementation, export and native payload fixtures/tests; retained normalization coverage in the URI contract tests.
- Website: `src/lib/payqr/national/` owns adapters, CRC/TLV helpers and strict TH/VN payload parsing. Native test vectors now live in `src/lib/payqr/fixtures/`. The preview and wallet downloads continue using the shared website resolver.

Verified generation profiles remain KH, LA, MY, MM, SG, TH and VN. BN, ID and PH remain unsupported pending verified specifications. See [PAYQR.md](PAYQR.md) for profile requirements, sources and limitations. This ownership change does not add payment-network certification or bank connectivity.

Validation: TypeScript library build and 128 tests passed; Flutter 118 tests and full analysis passed; website 154 unit tests, production build and 16 Playwright tests passed. Svelte check passed with the existing temporary TypeScript 6 API compatibility loader (no dependency downgrade); stock checking still has the installed TypeScript 7 compatibility limitation. Existing repository-wide formatting and ESLint configuration issues are separate from this change. No commit, publication or deployment was performed.

The PayPass barcode area now hides completely on invalid/unavailable payloads, with the original size, identifier caption and scan/tap instruction retained for valid codes, without extra payload details. PayTo (default) and named national-format modes, QR/PDF417/Aztec/Code128, shared presentation settings and JSON/form API selection are covered. Wallet signing/building is mocked in API tests; no live passes are issued.

Required fields were audited across all countries; see the required-field audit table in PAYQR.md. Conditional dynamic amounts now have matching required labels/attributes. Tests remove every required static input across all seven supported native profiles.

Shared PayPass URLs use scheme-specific format values such as format=khqr; IBAN uses format=epc. PayTo is the default in the constructor and on shared links, and omits the format parameter. Clipboard and Open Weblink parity are covered by browser tests.
