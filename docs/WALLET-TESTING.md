# PayPass wallet generation tests

Run the wallet suites from the website repository:

```sh
npm run test:wallet
```

Requirements: installed project dependencies, Node.js compatible with the project,
and `openssl` on PATH with the `cms` command. These suites also run under
`npm run test:unit -- --run`. Browser integration tests run separately with
`npm test`, which builds the production app before starting Playwright.

## Real artifact tests

`src/lib/paypass/generation.test.ts` calls the real `/pass` POST handler and the
real Apple/Google wallet builders. It creates an ephemeral RSA key and test
certificate in memory, packages a test P12, and supplies isolated test signing
configuration. It does not read production wallet credentials. Image requests
return a local PNG fixture; other outbound fetches fail. Statistics are disabled.
Temporary manifest/signature files are removed after the suite.

Coverage includes:

- Apple `.pkpass` responses: MIME type, download filename, ZIP contents,
  `pass.json`, barcode format/message/UTF-8 encoding, images and localization.
- Every manifest entry's SHA-1 hash and complete archive-file coverage.
  OpenSSL independently verifies the detached CMS signature; modified manifests
  fail verification. Certificate trust checking is intentionally disabled because
  the test signer is not an Apple-issued pass certificate.
- Google Save to Wallet JWTs: RS256 signatures independently verified using the
  Node crypto API, tamper rejection, issuer/audience/type, timestamp, object/class
  consistency, identifier constraints and exact barcode data.
- Exact native payload fixtures across KH, LA, MY, MM, SG, TH and VN, including
  supported merchant/proxy and static/dynamic variants, plus EPC SEPA.
- JSON, URL-encoded forms and multipart forms; Apple and Google; PayTo, named
  native formats and omitted-format defaults; QR, PDF417, Aztec and Code 128.
- Whole-design omission, PayTo-only BN/PH/ID defaults, and signed Google redirects
  for ordinary HTML form submissions.
- Alternate barcodes for every supported national profile, checking that signed
  barcode messages retain the exact payload, including Myanmar text. This checks
  artifact data preservation, not a physical scanner's character interpretation.
- Missing/invalid EPC fields, currency/reference conflicts, mismatched schemes,
  missing national routing fields, expired KHQR, unsupported native profiles and
  unknown barcode types. Invalid requests return no wallet artifact.
- Unicode EPC data, presentation/payment-data separation, shared-link format,
  repeated-request unique IDs, missing signing configuration and asset-fetch failure.

`src/lib/payqr/pass-api.test.ts` retains faster tests with mocked wallet builders
for request-to-builder wiring. Payload validators, required-field tests and
Playwright tests provide complementary coverage. They are not substitutes for
the real artifact checks above.

## What this does not certify

No test registers a pass with Google, installs one on an Apple/Android device,
or uses an Apple-trusted signing chain. Offline signature/structure checks do
not prove wallet service acceptance, bank-app acceptance or national payment
network certification. Live acceptance requires valid issuer accounts and
credentials plus device testing. EPC069-12 standardizes QR; alternate symbologies
carry the data but are not certified EPC QR codes.
