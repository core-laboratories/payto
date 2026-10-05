# PayQR: national and interoperable QR destinations

`qr` is a global PayTo authority. It is not an ASEAN-specific network or type. The website currently groups nine countries under **Pay QR**; that is a presentation choice.

`payto-rl` and `flutter_paytorl` only encode/decode PayTo URI and structured data, including validation and normalization. National payload generation/parsing and barcode rendering belong to the website. Both libraries also expose a raw EMV envelope inspector, which is not a national decoder.

## Constructor and PayPass

Cambodia is selected initially and after clearing. Brunei is removed from the constructor; existing portable Brunei links remain readable. The constructor shows only the payment identifier, identifier type where needed, the fields required by the selected national profile (see the encoder table below). Supported optional payment fields are available under a collapsed Payment details section; other API-only fields are listed below. All standard integrations (link, Markdown, HTML, payment/donation buttons and FinTag) remain available.

Barcodes appear in PayPass only when all fields required for the selected format are valid and the selected barcode can encode the data. The entire white area is hidden otherwise; no payload text or error is printed in it; valid barcodes retain the original identifier caption and scan/tap instruction. Payment QR format is selectable beside Barcode Type: **PayTo** (first option and constructor default) encodes the canonical `payto://qr/…` URI; the **country format name** (for example, KHQR or VietQR) selects the national adapter. Countries without native generation, including Philippines and Indonesia, use PayTo automatically and hide the switch. Changing to one of these countries resets an earlier Native selection to PayTo. QR Code, PDF 417, Aztec and Code 128 work in previews and wallet requests. Native mode never silently falls back to PayTo.

Before a valid identifier is entered, integrations retain a country-only draft link such as `payto://qr/kh`. This is a recognizable constructor draft, not a complete payment target; strict library parsing and QR generation still require an identifier. FinTag uses country-qualified properties: `[{"qr:kh":"id"}]` and `<meta property="qr:kh" content="id" />`. Identifier borders are neutral when empty, red for invalid syntax, amber when only the generic issuer envelope is verified, and green when the documented format validates. A field displays at most one validation message.

## Portable URI contract

```text
payto://qr/{country}/{identifier}
```

The country is a lowercase ISO 3166-1 alpha-2 code and selects the default scheme. Do not add a scheme path segment, `scheme` query parameter, or an alternate national-scheme authority. Country and authority input are case-insensitive; serialization produces lowercase. Identifiers retain their exact case, leading zeros and Unicode; they are never trimmed, numerically converted or Unicode-normalized.

```text
payto://qr/la/ABC123
payto://qr/kh/john_smith%40devb?amount=USD%3A12.50
payto://qr/sg/%2B6581234567
payto://qr/th/0066812345678?amount=THB%3A12.50&receiver-name=Test
```

These are syntax examples, not verified destinations.

The supported URI profile has exactly two nonempty path components, no credentials, port or fragment. Reject extra segments, URLs as identifiers, control/whitespace characters, malformed percent encoding/UTF-8, duplicate query keys and dot segments before URL normalization. Unknown countries (including `br`, `hk` and `in` until registered) are rejected. The global design permits adding those countries without changing this contract.

Identifiers without a verified national format use a deliberately limited **issuer** envelope: 1–128 Unicode letters/digits or `_.@+-`. This is a portable opaque identifier, **not national account validation**. It may exclude legitimate issuer formats not yet researched. The UI discloses this distinction. Do not treat an accepted issuer identifier as a payable account.

Query values are percent-encoded; keys are sorted for deterministic serialization. Default `identifier-type` is omitted; nondefault types use `identifier-type`. Common properties are `amount=ISO4217:decimal`, `receiver-name`, `reference`, `message`, and the existing library's `org`. `currency` is not a separate query property. Amounts use strings, not floating-point conversion: positive, no exponent/sign/grouping, no leading zeros except `0.x`, at most two decimal digits and 13 value characters. KHR and VND use whole units in this profile. These are conservative supported-profile constraints, not a claim that every scheme shares every monetary limit. Empty currency metadata means unverified; amounts are rejected, not unrestricted. Unknown extension queries are preserved, subject to key syntax, a 512 UTF-16-unit value bound and no controls. Adapters reject extensions they cannot encode.

LaoQR uses `application-id` for the institution-supplied 16-character AID and `acquirer-id` for its six-digit IIN. The receiver ID alone cannot produce a routable LaoQR. The constructor applies the encoder’s ASCII receiver-ID restriction; the portable URI envelope continues accepting Unicode identifiers.

National-specific optional query fields currently validated include `acquirer-id`, `merchant-city`, `mcc`, and `qr-type`. KHQR uses `qr-currency=KHR|USD` for a reusable static QR with no amount (default KHR); if an amount is supplied, its currency must agree. MMQR uses the acquirer-supplied `scheme-id` reverse domain (maximum 32 ASCII characters) and `local-name` (1–25 Myanmar characters). VietQR uses `acquirer-id` for the six-digit receiving bank BIN. A dynamic request in the supported profile requires an amount. This rule does not assert that every national dynamic scheme requires an amount.

## Country map and implemented validation

Every row supports URI parse/serialize, object/JSON representation and Zod form validation. **Common** means optional receiver name, organization, reference and message. Unsupported national fields are not exposed by the website.

| Code | Country     | Canonical scheme | Display name           | Identifier profile implemented                                                                      | Additional URI/API fields                                                                   | Enabled currencies |
| ---- | ----------- | ---------------- | ---------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------ |
| bn   | Brunei      | tarusqr          | tarusQR                | Opaque issuer envelope; national syntax unverified                                                  | Common                                                                                      | None verified      |
| kh   | Cambodia    | khqr             | KHQR                   | Bakong `name@bank`, ASCII letters/digits/underscore/hyphen, dot in name, max 32; restricted profile | Common; city, qr-currency, amount/currency                                                  | KHR, USD           |
| id   | Indonesia   | qris             | QRIS                   | Opaque issuer envelope; no claim to validate NMID or acquirer account                               | Common; amount/currency                                                                     | IDR                |
| la   | Laos        | laoqr            | LaoQR                  | Issuer envelope; national encoder restricts receiver ID to 1–25 printable ASCII characters          | Receiver name, institution IIN via acquirer-id, application-id; amount/currency in URI only | LAK                |
| my   | Malaysia    | duitnow          | DuitNow QR             | Acquirer-issued QR ID, 1–28 ASCII alphanumerics                                                     | Common; six-digit acquirer ID, city, four-digit MCC, amount/currency                        | MYR                |
| mm   | Myanmar     | mmqr             | MMQR / MyanmarPay      | Exactly 15 numeric QR merchant-ID digits, supplied by acquirer; no truncation                       | Common; city, MCC, scheme-id, local-name, amount/currency                                   | MMK                |
| ph   | Philippines | qrph             | QR Ph                  | Opaque issuer envelope; national syntax unverified                                                  | Common, payment-mode, qr-type                                                               | PHP                |
| sg   | Singapore   | paynow           | SGQR / PayNow          | Mobile: `+65` followed by 8 digits starting 8 or 9; UEN: 10 uppercase alphanumeric characters       | Common; amount/currency                                                                     | SGD                |
| th   | Thailand    | promptpay        | Thai QR / PromptPay QR | Mobile `0066` + 9 digits; national/tax ID 13 digits; e-wallet 15 digits                             | Common; identifier type, optional city/MCC, amount/currency, static/dynamic                 | THB                |
| vn   | Vietnam     | vietqr           | VietQR                 | Account: 1–19 ASCII letters/digits (restricted ANS subset), preserve leading zeros                  | Six-digit receiving bank BIN; amount/currency                                               | VND                |

Thai mobile input normalizes local/international forms to the canonical BOT representation; other identifier forms remain explicit. National/tax ID validation checks documented QR field syntax, not checksum, identity or registration. PayNow supports the inspected 10-character UEN subset; NRIC/FIN and VPA profiles are not implemented. Merchant-name limits of 25 and city limits of 15 are enforced for KH/LA/MY/MM/SG/TH when supplied. The national encoder profiles accept printable ASCII names/cities; Unicode remains supported in generic PayTo message/reference fields.

The website exports `payQrBaseSchema`, ten country schemas, and `payQrFormSchema`, a country-discriminated Zod union. Each country schema applies shared refinements independently. Scheme/country mismatch, inappropriate country-specific fields, unsupported currencies, identifier/type mismatch, decimal/length violations, and dynamic-without-amount are rejected. Missing national-only fields do not prevent creating a portable URI, but prevent a national preview.

## URI, payload, image and connectivity are different

1. A **PayTo URI** represents a destination and optional request.
2. A **national payload** is the scheme adapter's exact payment data string.
3. A **QR image** encodes the national payment payload selected by the country adapter. The online preview and downloaded passes use the same payload; unavailable adapters produce no QR.
4. **Network/acquirer connectivity** concerns registration, routing, authentication, transaction execution and settlement. None is provided here.

Generating a syntactically valid QR does **not** make this application a participant in, or authorize it to acquire transactions from, any national payment network. No issuer/acquirer account lookup or certification is performed. There are no remote payment requests, account logs or decoded-data execution.

## Implemented national encoders (website only)

The seven verified profiles generate both static and dynamic payloads. A dynamic request requires a positive amount in our supported subset. LaoQR amount requires explicit dynamic initiation. Static amounts are accepted for MY/MM/SG/TH/VN; KHQR follows the NBC SDK and derives dynamic initiation from amount presence. Network execution and expiry enforcement by the receiving bank remain outside payload generation.

| Country/profile          | Required fields                                                                                                                                                                                            | Optional encoded fields                                                                                                              | Identifier types; currency          | Account tags                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| KH individual / merchant | Bakong ID, receiver name; city defaults to Phnom Penh when omitted. Merchant additionally needs merchant ID and acquiring bank. Dynamic additionally needs creation and expiry timestamps in milliseconds. | Currency, amount, MCC, bill number, store/terminal labels, mobile number, purpose; individual account information and acquiring bank | bakong; KHR or USD                  | 29 individual / 30 merchant: 00 Bakong ID, 01 account info or merchant ID, 02 acquiring bank; 99 timestamps |
| LA credit transfer       | Receiver ID (1–25 printable ASCII), institution-supplied 16-character application ID, six-digit IIN, receiver name                                                                                         | Amount, bill number, reference, purpose                                                                                              | issuer; LAK                         | 38: 00 AID, 01 IIN, 02 payment type 001, 03 receiver                                                        |
| MY domestic merchant     | Acquirer-issued QR ID, six-digit acquirer ID, name, city, four-digit MCC                                                                                                                                   | Amount, reference, store/terminal labels, merchant mobile, five-digit postal code                                                    | merchant; MYR                       | 26: 00 A0000006150001, 01 acquirer, 02 QR ID, 04 mobile                                                     |
| MM merchant              | 15-digit merchant ID, issuer-supplied reverse-domain scheme ID, English name/city, MCC, Myanmar name                                                                                                       | Amount, bill number, reference, store/terminal labels, purpose                                                                       | merchant; MMK                       | 26: 00 issuer GUI, 01 merchant ID, 02 default terminal 000000; 64 language template                         |
| SG standalone PayNow     | Registered Singapore mobile or 10-character UEN, receiver name                                                                                                                                             | Amount, reference, editability, expiry date YYYYMMDD                                                                                 | mobile or uen; SGD                  | 26: 00 SG.PAYNOW, 01 proxy type 0/2, 02 proxy, 03 editability, 04 reference, 05 expiry                      |
| TH domestic PromptPay    | Registered mobile, national/tax ID or e-wallet ID; receiver name                                                                                                                                           | Amount, MCC, city                                                                                                                    | mobile / national-id / ewallet; THB | 29: 00 A000000677010111, proxy at 01/02/03                                                                  |
| VN account transfer      | Receiving bank BIN (six digits), account (1–19 alphanumerics)                                                                                                                                              | Amount, bill number, purpose                                                                                                         | account; VND                        | 38: 00 A000000727, 01 nested bank/account, 02 QRIBFTTA                                                      |

Names/cities use printable ASCII in these restricted profiles; MMQR additionally requires Myanmar text in its language template. The encoders preserve leading zeros and reject unsupported parameters instead of silently dropping payment instructions. The URI envelope continues preserving Unicode common metadata even when a national encoder cannot represent it.

The website initially shows required fields only. Supported optional amount/reference fields are under **Payment details**. KHQR offers Individual/Merchant selection. Thai mobile input accepts `0812345678`, `+66812345678` and canonical `0066812345678`; serialization uses the canonical form. Cambodia is the initial country, and the payment type remains **Pay QR**.

DuitNow excludes P2P, cash-out and JomPAY profiles. Acquirer/BIN validation checks syntax, not live membership; assignments must come from the institution. PayNow implements the inspected specification's 10-character UEN subset and Singapore mobile proxies, not all UEN variants, VPA, NRIC/FIN or a repository-issued multi-scheme SGQR. The LaoQR AID and MMQR GUI examples are never assumed for the user.

### API and parsing

National payload APIs live exclusively in the website under `src/lib/payqr/national/`. Neither `payto-rl` nor `flutter_paytorl` generates QR payloads or images. The website module exports `generateNationalQr`, `tryGenerateNationalQr`, country adapters and their generation capabilities. Unsupported BN/ID/PH results contain no payload.

`parseNationalQr`, `parsePromptPayQr` and `parseVietQr` implement strict inverses of the generated TH/VN profiles. CRC, AID/service, country and initiation method must match. Re-encoding must equal the input, so additional unknown data and noncanonical ordering are rejected rather than discarded. Other national payload parsers remain unimplemented. `parsePayload` is exposed only on the TH/VN adapters.

Shared utilities include ASCII `encodeTLV` / `parseTLV`, character-counted EMV String parsing, amount validation, merchant/additional templates and CRC validation. Country adapters own all tag allocations. CRC is CRC-16/CCITT-FALSE (poly 1021, init FFFF, no reflection/final XOR), calculated over UTF-8 bytes including `6304` but excluding the checksum. Duplicate tags and malformed lengths are rejected. MMQR enforces a 512-byte bound.

The website’s deterministic KHQR encoder requires explicit creation/expiration timestamps, with expiration after creation. It can reproduce historic test vectors; the website separately rejects expired KHQR passes. It does not manufacture a timestamp on every render. Encoded expiry is not a guarantee of payment-network acceptance.

### Rendering and wallet passes

The website renders barcodes using [bwip-js](https://github.com/metafloor/bwip-js). The same selected payload and barcode type are validated before wallet generation. PayPass links include the scheme-specific `format` value only for the selected national format; PayTo omits the parameter. Payment/integration links contain no format selection. Presentation options are removed from the encoded payment data. Apple encoding is UTF-8.

`payQrGenerationSchema` independently checks required national form fields before invoking the encoder; `payQrFormSchema` remains the portable/draft URI schema. Missing or invalid required fields prevent wallet downloads and QR preview. No live wallet signing or banking transaction is exercised by the tests.

### Shared conformance fixtures

`src/lib/payqr/fixtures/payqr-payloads.json` belongs to the website and is consumed by its encoder and wallet integration tests. Library fixtures cover URI data only. It contains 24 fixtures: PayNet v1.5 example 1, NAPAS v1.0 section 6.1.3, four outputs compared against official NBC SDK 1.0.20 (individual/merchant × static/dynamic), and 18 explicitly labeled synthetic regression fixtures. Synthetic fixtures are not bank-assigned credentials or official network certification vectors. Additional tests cover independent CRC check value `123456789 → 29B1`, corruption, invalid values, excessive nested lengths, normalization, strict parsing, typed unsupported results, shared links and wallet readiness.

## Research and unsupported encoders

Research was performed on 2026-09-16. “Unverified” means not established from the inspected authoritative material; it does not mean a feature does not exist. No undocumented field has been borrowed from another EMV scheme.

| Scheme              | Authoritative findings and limitations                                                                                                                                                                                                                                                                                                                                                                                                           | National generation status                                                                                                                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tarusQR             | [Official operator overview](https://www.tarus.com.bn/tarusqr) establishes the standard and participating-app model, but not identifier grammar, fields, currencies, static/dynamic structure, amounts, references or checksum rules.                                                                                                                                                                                                            | Unsupported: sufficient technical profile not verified.                                                                                                                                                                                                                                                                                           |
| KHQR                | [NBC SDK guide v2.9](https://bakong.nbc.gov.kh/download/KHQR%20SDK.pdf), pp. 13–15 and examples, gives individual/merchant input profiles: Bakong ID 32, required name 25; merchant ID/acquiring bank 32 for merchants; optional account info 32, city 15, bill/store/terminal/purpose 25. Examples include EMV and timestamp/expiry fields; KHR/USD are supported. Static/dynamic support exists in the SDK.                                    | Individual and merchant static/dynamic encoders match official NBC SDK 1.0.20 outputs. Static has no timestamp; dynamic requires explicit creation/expiry timestamps.                                                                                                                                                                             |
| QRIS                | [Bank Indonesia overview](https://www.bi.go.id/en/fungsi-utama/sistem-pembayaran/ritel/kanal-layanan/QRIS/default.aspx) distinguishes static/dynamic MPM and CPM, acquirer/PSP onboarding and rupiah settlement. Full merchant-account TLV allocation, NMID/account constraints, checksum/reference details were not verified.                                                                                                                   | Unsupported: no verified technical merchant profile.                                                                                                                                                                                                                                                                                              |
| LaoQR               | [Bank of the Lao PDR Decision 96/BoL, 4 February 2025](https://www.laoofficialgazette.gov.la/kcfinder/upload/files/96.pdf), Annex 8 (PDF pp. 19–21): static/dynamic credit transfer, tag 38 with AID (16), IIN (6), payment type 001 and receiver ID (max 25), LAK/418, country LA, receiver name (max 25), CRC.                                                                                                                                 | Static/dynamic credit-transfer encoder implemented. AID and IIN must be supplied by the institution; example assignments are not silently assumed. Bill payment and donation recipient profiles remain unsupported; credit-transfer bill/reference/purpose fields are encoded.                                                                    |
| DuitNow             | [PayNet data objects v1.5](https://docs.developer.paynet.my/docs/duitNow-QR/integration/QR-generation-specification/merchant-presented-mode/qr-data-object) and [format conventions](https://docs.developer.paynet.my/docs/duitNow-QR/integration/QR-generation-specification/merchant-presented-mode/overview) document static/dynamic, QR ID 28, account template 99, acquirer, MCC, MYR, name/city, amount 13, additional data and CRC.       | Domestic merchant static/dynamic encoding, amounts and documented additional fields implemented; no JomPAY, P2P or cash-out profile.                                                                                                                                                                                                              |
| MMQR                | [MyanmarPay specification, May 2023](https://myanmarpay.gov.mm/frontend/assets/files/MyanmarQRSpecification.pdf) documents EMV, static/dynamic, merchant ID 15, terminal ID ≤25, MMK/104, amount ≤13, name/city, additional reference/purpose and CRC. Section 3 includes Myanmar Unicode merchant information; the scheme GUI is context-specific and illustrated as an example.                                                                | Static/dynamic merchant encoder implemented with amount and additional fields. The GUI must be supplied by the acquirer; the example MM.COM.MMQR is never silently assigned. Includes mandatory Myanmar-language template and documented no-terminal default.                                                                                     |
| QR Ph               | [BSP P2P FAQ](https://www.bsp.gov.ph/Media_and_Research/Primers%20Faqs/QR_Ph_P2P_FAQs.pdf) confirms EMV basis. It is not a full P2M/P2P TLV/identifier/currency/amount/reference specification.                                                                                                                                                                                                                                                  | Unsupported: national wire profile not verified.                                                                                                                                                                                                                                                                                                  |
| SGQR / PayNow       | [ABS PayNow](https://www.abs.org.sg/e-payments/pay-now) describes registered proxies; [IMDA SGQR factsheet](https://www.imda.gov.sg/-/media/imda/files/about/media-releases/2018/annex-a--singapore-quick-response-code-sgqr.pdf) confirms EMV basis. [IMDA numbering](https://www.imda.gov.sg/regulations-and-licensing-listing/numbering) supports mobile syntax. SGQR is a multi-scheme container, not synonymous with every PayNow transfer. | Standalone mobile/10-character UEN PayNow static/dynamic encoder implemented using [SGQR Taskforce v1.7, Annex A.2.15 (archived original)](https://raw.githubusercontent.com/choonkiatlee/sgqr/master/documentation/SGQR%C2%A0Specifications%C2%A0v1.7.pdf). No SGQR repository identity is invented; multi-scheme SGQR labels are not generated. |
| Thai QR / PromptPay | [BOT English standard](https://www.bot.or.th/content/dam/bot/fipcs/documents/FPG/2562/EngPDF/25620084.pdf), attachment 1, distinguishes tag 29 transfer, tag 30 bill payment and tag 31 innovation. It defines proxy lengths, reserved bank-account proxy, THB, optional MCC/city, and EMV references.                                                                                                                                           | Domestic tag 29 subset implemented; other profiles unsupported.                                                                                                                                                                                                                                                                                   |
| VietQR              | [NAPAS v1.0 technical specification, September 2021 (archived original)](https://raw.githubusercontent.com/openhoangnc/vietqr/main/QR_Format_T%26C_v1.0_VN_092021.pdf), sections 5.2.3 and 6: account-information tag 38, AID A000000727, six-digit bank BIN, account up to 19 ANS characters, service QRIBFTTA, VND/704, CRC.                                                                                                                   | Static/dynamic account-transfer encoder implemented with a restricted alphanumeric account profile, amount, bill number and purpose. Card transfers remain unimplemented.                                                                                                                                                                         |

[EMVCo's QR documentation](https://www.emvco.com/emv-technologies/qr-codes/) supplies the shared MPM context, not a substitute for a national scheme profile.

## API and extension points

TypeScript exports `PayQrCountry`, `PayQrScheme`, `PayQrTarget`, `payQrSchemes`, `parsePayQr`, `serializePayQr`, `validatePayQrIdentifier`, `validatePayQrParameters` from the existing package entry point. Existing `Payto` exposes `payQr`, `country`, `scheme`, `identifier`, `identifierType`, `reference`; setters exist for country, identifier, identifierType and reference. `address` aliases the decoded PayQR identifier. `toJSON()` remains a URI string; `toJSONObject()` adds the new fields. Common PayQR parameter setters are validated atomically. Low-level mutable URL/searchParams APIs are revalidated when reading a PayQR target or serializing.

```ts
import Payto, { parsePayQr, serializePayQr } from 'payto-rl';
const payment = new Payto('payto://qr/th/0066812345678');
payment.amount = 'THB:12.50';
payment.receiverName = 'Test';
const target = parsePayQr(payment.toString());
const canonicalUri = serializePayQr(target);
```

Dart exports `PayQrScheme`, `payQrSchemes` and immutable `PayQrTarget` through `flutter_paytorl.dart`. Use `PayQrTarget.parse(uri)`, the named-argument constructor, `toString()` and `toJson()`. Existing `Payto` has equivalent properties/setters; `toJson()` remains a string and `toJsonObject()` adds country/scheme/identifier/type/reference. No existing required JSON constructor arguments were changed.

```dart
final payment = Payto('payto://qr/kh/john_smith%40devb');
payment.amount = 'USD:12.50';
final target = PayQrTarget.parse(payment.toString());
final canonicalUri = target.toString();
final details = payment.toJsonObject().toJson();
```

To extend globally: add country/scheme metadata and a documented identifier/currency profile in each language; add a website country schema and the desired presentation grouping; implement and register national adapters in the website only; add matching contract fixtures and scheme vectors. No authority or URI redesign is needed. The same checked-in JSON fixtures in both libraries guard parity without imposing a cross-repository dependency on Dart tests.

## Remaining encoder integration requirements

A further primary-source review on 2026-09-16 did not establish complete local encoding profiles for BN, ID or PH. These remain unsupported; successful QR image rendering alone must not be reported as national payment support.

- **Brunei:** [BDCB Notice TRS/N-1/2025/1](https://cms.bdcb.gov.bn/storage/uploads/regulatories/17417558761835440.pdf) refers to the national technical standard but does not include its payload field definitions. Obtain the tarusQR technical profile from ndpx or a participating issuer, including routing identifiers and conformance vectors.
- **Indonesia:** [ASPI Annual Report 2023, p. 46](https://aspi-indonesia.or.id/files/2024/12/AR%20ASPI%202023-FA_all_rev.pdf) documents QRIS specification and test-scenario requests through SiLA. Obtain the MPM specification and applicable merchant/acquirer assignments; community payload examples do not establish the complete required profile.
- **Philippines:** [PayMongo Wallet QR](https://docs.paymongo.com/re/docs/money-movement-moving-money-with-wallet-qr) documents generation through an authenticated provider API, returning the exact QR string. That provider requires an activated wallet and live credentials and has no Wallet QR test mode. It is an integration option, not evidence for a locally invented QR Ph field layout. Obtain the applicable PPMI/issuer payload specification or select and configure a provider integration.

Importing an existing bank-issued QR could preserve its exact payment payload for previews and downloads without putting that payload in the PayTo URI. This is a proposed alternative only, not implemented or enabled. It would need separate persistence for shared passes and must not be silently substituted for generation from payment fields.

## Pass form and API format selection

Both JSON POST requests and form submissions to `/pass` accept `design.qrFormat` (the country’s scheme name or `payto`, default `payto` when omitted; legacy `native` is also accepted) and `design.barcode` (`qr`, `pdf417`, `aztec`, `code128`, default `qr`). Invalid mode/type or unencodable/invalid payment data returns HTTP 400 before wallet signing. Existing authorization requirements still apply.

Example JSON body (for form submissions, JSON-stringify `props` and `design` into their respective form fields):

```json
{
  "hostname": "qr",
  "os": "ios",
  "props": {
    "network": "qr",
    "payQrForm": {
      "country": "vn",
      "scheme": "vietqr",
      "identifier": "00123",
      "identifierType": "account",
      "acquirerId": "970468"
    }
  },
  "design": { "qrFormat": "vietqr", "barcode": "qr" }
}
```

Use `os: "ios"` for Apple Wallet and `os: "android"` for Google Wallet. Omit `design`, omit `design.qrFormat`, or select `payto` to encode the PayTo link. The website wallet buttons submit the current format selection through the same endpoint.

Native mode requires the selected country's native fields; PayTo mode requires only a valid portable URI. Supplied optional payment fields must also validate. Barcode rendering does not certify acceptance of non-QR symbologies by a national banking app.

## Required-field audit (2026-09-16)

The native static profiles require the following user inputs. Country, identifier type and currency use the selected/default values. Optional fields, when supplied, must still validate. PayTo mode needs a valid portable URI rather than all native-only fields.

| Country     | User inputs required for native generation                                                     | Defaults / conditions                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Brunei      | Native profile unverified; generation unavailable                                              | Identifier enables portable PayTo mode only                                                                       |
| Cambodia    | Bakong identifier, receiver name                                                               | KHR and Phnom Penh defaults; merchant adds merchant ID and acquiring bank; amount adds creation/expiry timestamps |
| Indonesia   | Native profile unverified; generation unavailable                                              | Identifier enables portable PayTo mode only                                                                       |
| Laos        | Identifier, receiver name, institution AID and IIN                                             | LAK; amount requires dynamic mode                                                                                 |
| Malaysia    | QR identifier, acquirer ID, receiver name, city, MCC                                           | MYR; explicitly enter MY for city if not applicable; no fabricated acquirer/MCC                                   |
| Myanmar     | Merchant identifier, issuer scheme ID, English receiver name, city, MCC, Myanmar receiver name | MMK; terminal defaults to 000000; Myanmar language template mandatory for domestic merchants                      |
| Philippines | Native profile unverified; generation unavailable                                              | Identifier enables portable PayTo mode only                                                                       |
| Singapore   | Mobile/UEN identifier and receiver name                                                        | SGD, Singapore city and MCC 0000; non-editable amount requires amount                                             |
| Thailand    | Selected proxy identifier and receiver name                                                    | THB; MCC and city optional in the implemented domestic PromptPay profile                                          |
| Vietnam     | Account identifier and receiving bank BIN                                                      | VND; name and city are not required                                                                               |

Dynamic mode in the implemented profiles requires amount. Its label and HTML required state now follow that selection; KHQR timestamp fields also display field validation state.

Audit evidence: PayNet v1.5 root table (name, city, MCC mandatory; MY allowed when city not applicable); BOT attachment 1 pp. 18–19 (MCC/city exceptions, name inherits EMV requirements); Lao Decision 96/BoL Annex 8 (AID, IIN, receiver, name mandatory); MyanmarPay May 2023 tables 2.1/2.8 and section 3 (domestic Myanmar-language template mandatory); SGQR v1.7 root table (name mandatory, city default Singapore); NAPAS v1.0 root/account tables (name/city optional). Source links are in the research table above. Where remote PDF retrieval failed during this audit, the previously downloaded primary-source PDFs and extracted tables were reviewed locally. BN/ID/PH requirements remain unverified, not inferred from generic EMV fields.

Regression coverage removes each required user field from each supported static profile, checks dynamic amount requirements, verifies KH merchant conditional fields and confirms unsupported countries only work in explicit PayTo mode.

Copied PayPass links and Open Weblink include the scheme-specific `format` value only for the selected national format. A shared link without format uses PayTo, the constructor default. Payment/integration links omit format in either mode. Wallet requests send their selection separately in `design.qrFormat`. The format parameter is presentation metadata and is removed from encoded payment data.

### Philippine QR Ph payment data

Canonical destination: `payto://qr/ph/{identifier}`; network `qr`, country `ph`, scheme `qrph`.
The identifier is an opaque issuer-provided value, not a verified bank account, mobile number or merchant ID.
The existing generic target stores optional `payment-mode=p2p|p2m` and `qr-type=static|dynamic` in its parameters.
`Payto.paymentMode` and `Payto.qrType` expose validated getters/setters and JSON object properties.
`payment-mode` is a PayTo extension; `mode` remains the existing pass presentation property.

Example (illustrative URI, not an official payment destination or native test vector):

```text
payto://qr/ph/Demo%40Issuer?amount=PHP%3A15.25&payment-mode=p2m&qr-type=dynamic&reference=Bill%201
```

PHP amounts use positive decimal strings with at most two decimal places and the existing 13-character amount limit. No floating-point conversion is used by the QR URI codec. Dynamic requests require an amount in this supported PayTo profile. Static data does not imply a recurring debit mandate. We preserve generic receiver-name/reference fields without claiming a verified native tag mapping. We do not impose participant-specific transaction limits or infer recipient requirements from another country.

**Native QR Ph payload encoding and decoding are not implemented:** researched public sources did not establish the Philippine account templates, routing identifiers and official conformance vectors. A PayTo URI is not a QR Ph payload accepted by banking apps. No generic EMV payload is classified as QR Ph merely from PH/PHP.

Architecture, when a verified native profile becomes available:

```text
PayTo URI → structured payment data → native encoder → payload string
scanned payload string → native decoder → structured data → PayTo URI
```

The native arrows above are currently unavailable for QR Ph. Libraries stop at data, never render QR images, scan cameras, enroll merchants, connect to InstaPay, transfer funds or check payment status. QR URI input is capped at 8192 characters; duplicate query keys, controls, malformed escaping and invalid amounts are rejected.

Sources: [BSP QR Ph](https://www.bsp.gov.ph/SitePages/MediaAndResearch/Multimedia_QRPh.aspx), [BSP P2P FAQ](https://www.bsp.gov.ph/Media_and_Research/Primers%20Faqs/QR_Ph_P2P_FAQs.pdf), [BSP P2M FAQ](https://www.bsp.gov.ph/Media_and_Research/Primers%20Faqs/QR_Ph_P2M_FAQs.pdf), [PayMongo MPM API](https://docs.paymongo.com/reference/generate-mpm-qr), [PayMongo QR Ph acceptance](https://docs.paymongo.com/docs/payment-acceptance-qr-ph). Provider API fields are evidence for supported payment concepts, not the national TLV layout.

### Indonesian QRIS payment data

Canonical URI: `payto://qr/id/{identifier}`. Network `qr`, country `id`, scheme `qris`, domestic currency `IDR`.
The path remains an opaque acquirer-issued identifier (`issuer` type). It is **not** relabeled NMID or Merchant PAN: the reviewed public material does not establish sufficient routing semantics for that mapping. Do not invent these provider-issued values.

```text
payto://qr/id/Demo?qr-type=static
payto://qr/id/Demo?amount=IDR%3A50000&qr-type=dynamic&reference=Bill%201
```

These illustrative links are not native QRIS payloads. Optional `qr-type=static|dynamic` uses the existing `qrType` property. Explicit static requests reject amount; dynamic requests require it. Unspecified type preserves a portable suggested amount without generating a native transaction. Amounts are positive IDR decimal strings, at most two fractional digits, capped at IDR 10,000,000 using integer minor-unit comparison. Decimal precision is the existing portable profile, not a claim that every provider accepts fractional rupiah. Generic `receiver-name` and `reference` remain portable metadata without a verified QRIS tag mapping. No static-to-dynamic payload conversion is implemented.

`inspectEmvMpm(payload)` provides bounded **raw ASCII EMV envelope inspection** in both libraries. It checks TLV boundaries, duplicate fields, nested template boundaries and CRC, then returns `fields` and `templates`. Its JSON shape matches across TypeScript and Dart (Dart uses `.toJson()`). It does not return a national scheme, NMID, Merchant PAN or PayTo target and is not a QRIS compliance validator. It rejects non-ASCII input and payloads over 4096 characters; nested unknown subfields stay raw. The official Midtrans example is a fixture with published CRC `A623`.

**Native QRIS encoding and semantic decoding remain unsupported.** Full authoritative routing/template requirements were not available in the reviewed public material. ASPI documents a specification request process. Neither a correct CRC nor ID/360 proves QRIS validity. No guessed national tags, transaction identifiers or provider credentials are generated. The website uses PayTo for this country and hides the native-format switch.

```text
PayTo URI ↔ structured portable QR data
provider payload → raw EMV inspection (no payment destination inference)
structured QRIS → native encoder → payload → website renderer [not implemented]
```

Libraries render no images, perform no scanning or network calls, register no merchants, issue no identifiers and perform no transfers, status checks or settlement. Static QR does not authorize recurring debits. CPM, QRIS TAP, Tuntas, cross-border routing/FX and provider connectivity are outside this implementation.

Sources: [Bank Indonesia QRIS](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/kanal-layanan/QRIS/default.aspx), [ASPI QRIS modes](https://aspi-indonesia.or.id/standar-dan-layanan/qris/), [ASPI specification-request process, annual report p. 46](https://aspi-indonesia.or.id/files/2024/12/AR%20ASPI%202023-FA_all_rev.pdf), [Midtrans official dynamic example](https://docs.midtrans.com/docs/gopay-qris-pos-integration), [EMVCo QR specifications](https://www.emvco.com/emv-technologies/qr-codes/), [BI cross-border QRIS](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/kanal-layanan/QRIS/QRIS-Antarnegara/default.aspx).

Native PayPass format values are `khqr` (Cambodia), `duitnow` (Malaysia), `laoqr` (Laos), `mmqr` (Myanmar), `paynow` (Singapore), `promptpay` (Thailand), and `vietqr` (Vietnam). For example, a Vietnamese native PayPass link uses `format=vietqr`. The value must match the payment country. IBAN uses `epc`. These values are also accepted in `design.qrFormat` for JSON and form API requests.

## Field coverage and validation boundaries

All current Pay QR constructor fields can round-trip through the libraries' URI
parameter maps. This does **not** mean every field has a dedicated `Payto`
getter/setter, a top-level JSON property, or complete country-specific validation.

| Data                          | URI representation                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Country, identifier           | `payto://qr/{country}/{identifier}` path                                                                               |
| Scheme                        | Derived from country; not a separate URI parameter                                                                     |
| Identifier type               | `identifier-type` (default type omitted)                                                                               |
| Amount and currency           | `amount=CURRENCY:value`; KH static currency uses `qr-currency`                                                         |
| Common details                | `receiver-name`, `reference`, `message`, `org`                                                                         |
| Routing and merchant identity | `acquirer-id`, `application-id`, `scheme-id`, `recipient-type`, `merchant-id`, `acquiring-bank`, `account-information` |
| Merchant details              | `merchant-city`, `mcc`, `local-name`, `merchant-mobile`, `postal-code`                                                 |
| Additional details            | `bill-number`, `store-label`, `terminal-label`                                                                         |
| Request settings              | `payment-mode`, `qr-type`, `amount-editable`, `expiry-date`, `creation-timestamp`, `expiration-timestamp`              |

Use `Payto.payQr.parameters` or the parsed target's `parameters` for fields without
dedicated accessors. TypeScript updates can use `serializePayQr` with a copied
parameter map; Dart uses a new `PayQrTarget` with a copied map. Object JSON from
`Payto` does not flatten every parameter; keep the URI or target parameter map
when complete field preservation is needed.

Both libraries validate URI structure/escaping, supported identifiers, monetary
syntax/currencies, selected enums, field lengths and some country-specific rules.
Unknown extensions are preserved under the generic query constraints. Validation
is **not yet fully aligned** with the website: examples of additional website
checks include KH expiry after creation, Lao receiver-ID ASCII/length limits,
printable-ASCII merchant fields, and some field/country and static/amount
combinations. The two library implementations also have remaining differences
(for example, Lao merchant-city length handling). Native-generation prerequisites
remain application responsibilities; a parsed PayTo link does not prove that a
national barcode can be generated or that an account is registered.

## Format metadata and IBAN extensions

`Payto.formats` describes presentation capabilities, not implemented library
encoders and not validation of the current payment data.

| Payment method                                           | `formats` in object JSON |
| -------------------------------------------------------- | ------------------------ |
| IBAN                                                     | `['payto', 'epc']`       |
| Cambodia                                                 | `['payto', 'khqr']`      |
| Laos                                                     | `['payto', 'laoqr']`     |
| Malaysia                                                 | `['payto', 'duitnow']`   |
| Myanmar                                                  | `['payto', 'mmqr']`      |
| Singapore                                                | `['payto', 'paynow']`    |
| Thailand                                                 | `['payto', 'promptpay']` |
| Vietnam                                                  | `['payto', 'vietqr']`    |
| Brunei, Philippines, Indonesia, other PayTo-only methods | Omitted                  |

PayTo is first and is the application default. A PayTo-only getter returns
`undefined` in TypeScript or `null` in Dart, never `['payto']`. The metadata appears
in `toJSONObject()` (TypeScript) and `toJsonObject().toJson()` (Dart), not in URI
serialization and not automatically on the lower-level Pay QR target.

`reference`, `purpose` and `information` are readable/writable PayTo query
extensions and object JSON properties. Setting them to `null` removes them.
The libraries preserve IBAN extension values without applying the application's
EPC RF checksum, purpose-code or payload-length rules. EPC encoding/decoding and
national payload encoding/decoding are not library capabilities. The existing
`inspectEmvMpm` helper only inspects a raw EMV envelope; it does not decode a
national payment into a PayTo target.

The website's `/pass` endpoint accepts `design.qrFormat` with `payto`, `epc` or the
matching supported country scheme name. It defaults to PayTo when the format or
entire design object is omitted, for both JSON and form requests and both wallets.
This is an application API, not a library encoder. Payment links omit `format`;
shared PayPass presentation links use it only for a nondefault format.

## Wallet generation verification

See [wallet testing](WALLET-TESTING.md) for the real signed-artifact suite covering
Apple `.pkpass` archives and Google Wallet JWTs, API/form defaults, supported
country formats, alternate barcodes and rejection paths. Run `npm run test:wallet`.
The suite uses temporary test keys and does not claim live device/service acceptance.
