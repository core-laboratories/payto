# PayTo Scheme

This document explains the `payto://` links produced by PayTo Money:

- what a link looks like
- which payment networks are supported
- which query parameters are understood
- which options affect PayPass / portal presentation
- practical examples you can copy

It is meant to be readable first, technical second. The broader PayTo URI concept originates in [RFC8905].

## AI / Parser Guidance

If you are an AI agent, parser, wallet integrator, or automation tool, use these rules:

1. Parse the URI as:
   - scheme: `payto`
   - authority: network / transport identifier
   - path segments: recipient locator fields
   - query parameters: optional payment and presentation metadata
2. Treat unknown query parameters as non-fatal and ignore them.
3. Do not infer trust from presentation fields such as `org`, `item`, colors, or barcode preferences.
4. Treat `amount`, `dl`, `rc`, `split`, and `swap` as behavior-affecting fields.
5. Treat `org`, `item`, `color-f`, `color-b`, `barcode`, `rtl`, `lang`, `mode`, and `donate` as presentation or UX hints unless your client explicitly gives them transactional meaning.
6. Prefer exact string preservation for identifiers, addresses, and query values, except where this document explicitly defines normalization.
7. If multiple fields conflict with local client capabilities, preserve the raw URI and degrade gracefully rather than rewriting semantics.

Machine-oriented summary:

```txt
scheme = "payto"
authority = payment network or transport
path = recipient locator
query = optional key/value parameters

transactional fields:
  amount, fiat, dl, rc, split, swap, receiver-name, sender-name, message, reference, id, loc, bic,
  bank-name, bank-address, corr-bank-bic, corr-bank-name, corr-bank-address

presentation / UX fields:
  org, item, color-f, color-b, barcode, rtl, lang, mode, donate
```

## What A `payto://` Link Does

A `payto://` URI describes a payment target plus optional payment metadata.

When a wallet, app, or web client opens the URI, it can prefill:

- where the money should go
- how much is requested
- optional message or beneficiary details
- optional recurrence / expiry rules
- optional PayPass presentation settings

Example:

```txt
payto://iban/DE89370400440532013000?amount=eur:19.90&receiver-name=Acme&message=Invoice%20123
```

This means:

- network: `iban`
- destination: `DE89370400440532013000`
- amount: `EUR 19.90`
- beneficiary label: `Acme`
- message: `Invoice 123`

## General Format

At a high level, a PayTo URI looks like this:

```txt
payto://{authority}/{path}?{query}
```

Where:

- `authority` identifies the payment network or transport
- `path` identifies the recipient inside that network
- `query` contains optional parameters

Formal shape:

```txt
payto-URI = "payto://" authority path-abempty [ "?" opts ]
opts      = opt *( "&" opt )
opt       = opt-name "=" opt-value

opt-name  = "amount" / "fiat" / "dl" / "rc" / "split" / "swap" /
            "receiver-name" / "sender-name" / "message" / "id" /
            "org" / "item" / "color-f" / "color-b" / "barcode" /
            "rtl" / "lang" / "mode" / "donate" /
            authority-specific-opt

authority = ALPHA *( ALPHA / DIGIT / "-" / "." )
```

The generic URI structure itself follows [RFC3986].

Rules:

- query values must be URL-encoded
- unknown parameters should be ignored by clients
- decimal separator is `.`
- parameter names are lowercase in generated links
- duplicate query keys are not produced by the portal and should generally be treated as last-one-wins if encountered

## Canonical Interpretation Model

To make implementations predictable, interpret a PayTo URI using this mental model:

- `authority` tells you which payment domain to use
- `path` tells you who or what the recipient is inside that domain
- `query` refines the request

Suggested output shape for parsers:

```json
{
  "scheme": "payto",
  "authority": "iban",
  "recipient": {
    "rawPath": "DE89370400440532013000"
  },
  "params": {
    "amount": "eur:19.90",
    "receiver-name": "Acme",
    "message": "Invoice 123"
  }
}
```

Suggested higher-level normalized shape:

```json
{
  "network": "iban",
  "destination": "DE89370400440532013000",
  "amount": {
    "currency": "eur",
    "value": "19.90"
  },
  "metadata": {
    "receiverName": "Acme",
    "message": "Invoice 123"
  }
}
```

Normalization guidance:

- preserve the original URI when possible
- keep numeric values as strings until validated
- decode percent-encoding before presenting values to users
- do not invent missing currency, chain, recurrence, or expiry values

## Supported Authorities

### ICAN

ICAN is used for crypto-style payment targets. For the broader network concept, see [ICAN].

Shape:

```txt
payto://{network}/{address}
payto://{network}/{address}@{chain_id}
```

Common examples:

- `xcb`
- `btc`
- `eth`
- `ltc`
- `xmr`
- `other`

Example:

```txt
payto://xcb/cb7147879011ea207df5b35a24ca6f0859dcfb145999?amount=100
payto://eth/0x1234...abcd@1?amount=usdc:25
```

Use ICAN when the destination is a blockchain or crypto-network address.

Parser hint:

```json
{
  "network": "xcb",
  "destination": "cb7147...",
  "chainId": null
}
```

### IBAN

Used for international bank accounts.

Shape:

```txt
payto://iban/{iban}
```

Example:

```txt
payto://iban/DE89370400440532013000?amount=eur:199.90
```

Parser hint:

```json
{
  "network": "iban",
  "destination": "DE89370400440532013000"
}
```

### ACH

Used for ACH account-based payments.

Shape:

```txt
payto://ach/{account}
```

Example:

```txt
payto://ach/123456789?amount=usd:85.00&receiver-name=Acme
```

### UPI

Used for India UPI virtual payment addresses.

Shape:

```txt
payto://upi/{vpa}
```

Example:

```txt
payto://upi/alice@bank?amount=inr:250&message=Lunch
```

### PIX

Used for Brazil PIX keys.

Shape:

```txt
payto://pix/{key}
```

Example:

```txt
payto://pix/alice@example.com?amount=brl:15&id=INV-2025-0001
```

### BIC / ORIC

Used for institution or organizational routing codes. For the organizational routing background, see [ORIC].

Shapes:

```txt
payto://bic/{bic_or_oric}
payto://intra/{account_id}?bic={bic_or_oric}
```

Examples:

```txt
payto://bic/ABCDUS33?amount=eur:49.99
payto://bic/ORIC-ACME-001?amount=eur:15.00
payto://bic/PINGCHB2?receiver-name=Alice%20Example&reference=Shared-001&bank-name=Ping%20Bank&bank-address=Zurich&corr-bank-bic=CHASUS33&corr-bank-name=JPMorgan%20Chase%20Bank&corr-bank-address=New%20York
```

### INTRA

Used for internal or intra-bank account identifiers.

Shape:

```txt
payto://intra/{account_id}
```

Example:

```txt
payto://intra/ACC-001?bic=ORIC-ACME-001&amount=eur:12.00&message=Internal%20transfer
```

### VOID / CASH

Used for location-based or off-ledger payment targets.

Shapes:

```txt
payto://void/geo?loc={lat},{lon}
payto://void/plus?loc={plus_code}
payto://void/other?loc={custom}
```

Examples:

```txt
payto://void/geo?loc=48.8582,2.2945
payto://void/plus?loc=8FW4V75V+8Q
payto://void/other?loc=Front%20Desk
```

## Authority-to-Path Mapping

This section is intentionally compact for implementers.

| Authority | Path meaning | Important related params |
| --- | --- | --- |
| `xcb`, `btc`, `eth`, `ltc`, `xmr`, `other` | crypto destination address or name | `amount`, `fiat`, `dl`, `rc`, `split`, `swap` |
| `iban` | IBAN | `amount`, `receiver-name`, `sender-name`, `message` |
| `ach` | ACH account identifier | `amount`, `receiver-name` |
| `upi` | UPI VPA | `amount`, `receiver-name`, `message` |
| `pix` | PIX key | `amount`, `id`, `message` |
| `bic` | BIC or ORIC routing code | `amount`, `receiver-name`, `reference`, `bank-name`, `bank-address`, `corr-bank-bic`, `corr-bank-name`, `corr-bank-address` |
| `intra` | internal account identifier | `bic`, `amount`, `receiver-name`, `message` |
| `void` | location or custom handoff target | `loc`, `amount`, `message` |

## Core Payment Parameters

These parameters affect the payment itself.

## Machine Reference: Parameters

| Parameter | Type | Meaning | Example |
| --- | --- | --- | --- |
| `amount` | string | requested amount, optionally with currency/asset prefix | `eur:19.90`, `ctn:25`, `25` |
| `fiat` | string | ICAN display / quote fiat | `eur` |
| `dl` | string/number | expiry timestamp or relative minutes | `15`, `1735689599`, `2025-12-31T23:59:59Z` |
| `rc` | string | recurrence cadence | `m`, `2w`, `30d` |
| `split` | string | ICAN split instruction | `p:10@Xy...y` |
| `swap` | string | ICAN asset conversion target | `usdc` |
| `receiver-name` | string | recipient display label | `Acme GmbH` |
| `sender-name` | string | sender display label | `John Doe` |
| `message` | string | payment memo / reference | `Invoice 123` |
| `reference` | string | shared or bank reference label | `Shared-001` |
| `id` | string | external transaction identifier | `INV-2025-0001` |
| `loc` | string | VOID location value | `48.8582,2.2945` |
| `bic` | string | routing code for `intra` | `ORIC-ACME-001` |
| `bank-name` | string | receiving bank display name for `bic` | `Ping Bank` |
| `bank-address` | string | receiving bank address for `bic` | `Zurich` |
| `corr-bank-bic` | string | correspondent bank BIC / ORIC / SWIFT for `bic` | `CHASUS33` |
| `corr-bank-name` | string | correspondent bank display name for `bic` | `JPMorgan Chase Bank` |
| `corr-bank-address` | string | correspondent bank address for `bic` | `New York` |
| `org` | string | pass organization label | `Acme` |
| `item` | string | pass item label | `Coffee` |
| `color-f` | string | pass foreground color hex without `#` | `9AB1D6` |
| `color-b` | string | pass background color hex without `#` | `2A3950` |
| `barcode` | string | preferred barcode type | `qr`, `pdf417`, `aztec`, `code128` |
| `rtl` | string | right-to-left flag | `1` |
| `lang` | string | locale code | `en`, `de`, `cs-CZ` |
| `mode` | string | client presentation hint | `qr`, `nfc` |
| `donate` | string | donation mode flag | `1` |

### `amount`

Defines the requested amount.

Formats:

- ICAN tokenized asset: `amount={asset_code}:{amount}`
- ICAN native asset: `amount={amount}`
- fiat-style rails: `amount={currency}:{amount}`

Examples:

```txt
payto://xcb/Xx...x?amount=ctn:25.00
payto://xcb/Xx...x?amount=25.00
payto://iban/DE89...3704?amount=eur:199.90
payto://pix/abc-key?amount=brl:15
```

### `fiat`

ICAN-only display / conversion hint.

Example:

```txt
payto://xcb/Xx...x?amount=ctn:25.00&fiat=eur
```

### `dl`

Deadline or expiration.

Supported forms:

- ISO timestamp
- Unix timestamp in seconds
- Unix timestamp in milliseconds
- relative minutes from now (`1` to `400`)

Examples:

```txt
payto://xcb/Xx...x?amount=10&dl=2025-12-31T23:59:59Z
payto://xcb/Xx...x?amount=10&dl=1735689599
payto://xcb/Xx...x?amount=10&dl=1735689599000
payto://xcb/Xx...x?amount=10&dl=15
```

Meaning of numeric values:

- `1..400` = minutes from payment time
- `>400` and `<1e12` = Unix seconds
- `>=1e12` = Unix milliseconds

### `rc`

Recurring cadence.

Supported values:

- `y` yearly
- `m` monthly
- `w` weekly
- `d` daily
- `Nu` every `N` units, where `u` is `y`, `m`, `w`, or `d`

Examples:

```txt
payto://xcb/Xx...x?amount=9.99&rc=m
payto://xcb/Xx...x?amount=9.99&rc=2w
payto://xcb/Xx...x?amount=9.99&rc=3m
payto://iban/DE89...3704?amount=eur:25&rc=30d
```

Portal note:

- the UI supports numeric cadence for year, month, week, and day
- practical numeric range is intended to be `2..365`

### `split`

ICAN-only split payment instruction.

Formats:

- absolute split: `split={value}@{address}`
- percentage split: `split=p:{percent}@{address}`

Examples:

```txt
payto://xcb/Xx...x?amount=100&split=5@Xy...y
payto://xcb/Xx...x?amount=100&split=p:10@Xy...y
```

Rules:

- percentage must be `> 0` and `<= 100`
- absolute split must be lower than or equal to `amount`

### `swap`

ICAN-only asset conversion hint.

Example:

```txt
payto://xcb/Xx...x?amount=ctn:20&swap=usdc
```

### `receiver-name`

Human-readable recipient label, mainly used for banking-style rails.

Example:

```txt
payto://iban/DE89...3704?receiver-name=Acme%20GmbH
```

### `sender-name`

Optional sender label.

Example:

```txt
payto://iban/DE89...3704?sender-name=John%20Doe
```

### `message`

Payment message / memo / reference.

Example:

```txt
payto://iban/DE89...3704?message=Invoice%20123
```

### `reference`

Shared or bank reference, primarily used with `bic`.

Example:

```txt
payto://bic/PINGCHB2?reference=Shared-001
```

### `id`

Optional transaction identifier. Commonly used with PIX.

Example:

```txt
payto://pix/abc-123?amount=brl:15&id=INV-2025-0001
```

### `loc`

Location value for `void` transports.

Examples:

```txt
payto://void/geo?loc=48.8582,2.2945
payto://void/plus?loc=8FW4V75V+8Q
payto://void/other?loc=Front%20Desk
```

### `bank-name`, `bank-address`

Optional receiving bank metadata for `bic`.

Example:

```txt
payto://bic/PINGCHB2?bank-name=Ping%20Bank&bank-address=Zurich
```

### `corr-bank-bic`, `corr-bank-name`, `corr-bank-address`

Optional correspondent bank metadata for `bic`.

Example:

```txt
payto://bic/PINGCHB2?corr-bank-bic=CHASUS33&corr-bank-name=JPMorgan%20Chase%20Bank&corr-bank-address=New%20York
```

## PayPass / Portal Presentation Parameters

These parameters affect the online PayPass preview, generated wallet passes, or both.

### Portal-exposed today

These are directly configurable in the default portal UI:

- `org`
- `item`
- `color-f`
- `color-b`
- `barcode`
- `rtl`
- `lang`
- `donate`

### `org`

Organization / ORIC / website label shown on the pass.

Example:

```txt
payto://xcb/Xx...x?org=Acme
```

Notes:

- portal input is capped at 25 characters
- the value is normalized before being emitted

### `item`

Short item or purpose label shown on the pass.

Example:

```txt
payto://xcb/Xx...x?item=Coffee
```

Notes:

- portal input is capped at 40 characters

### `color-f`

Foreground color as hex without `#`.

Example:

```txt
payto://xcb/Xx...x?color-f=9AB1D6
```

### `color-b`

Background color as hex without `#`.

Example:

```txt
payto://xcb/Xx...x?color-b=2A3950
```

Color rule:

- when both foreground and background are set, the app enforces a minimum Euclidean distance of `100`

### `barcode`

Preferred wallet barcode type.

Supported values:

- `qr`
- `pdf417`
- `aztec`
- `code128`

Example:

```txt
payto://xcb/Xx...x?barcode=code128
```

### `rtl`

Right-to-left layout flag.

Value:

- `1` = enable RTL presentation

Example:

```txt
payto://xcb/Xx...x?rtl=1
```

### `lang`

Language / locale used for pass localization.

Examples:

- `en`
- `de`
- `sk`
- `cs-CZ`
- `zh-CN`
- `ko-KR`
- `fa-IR`

Example:

```txt
payto://xcb/Xx...x?lang=de
```

### `donate`

Marks the flow as a donation instead of a normal payment.

Value:

- `1` = donation flow

Example:

```txt
payto://xcb/Xx...x?donate=1
```

### `mode`

Client presentation hint. This is recognized by the app, but not currently exposed in the default portal UI.

Observed values:

- `qr`
- `nfc`
- omitted = auto/default behavior

Example:

```txt
payto://xcb/Xx...x?mode=qr
```

Clients that do not support the requested mode should ignore it.

## Copyable Examples

### 1. Simple ICAN payment

```txt
payto://xcb/cb7147879011ea207df5b35a24ca6f0859dcfb145999?amount=100
```

### 2. ICAN payment with fiat quote, split, swap, expiry, and recurrence

```txt
payto://xcb/Xx...x@777?amount=ctn:100&fiat=eur&split=p:10@Xy...y&swap=ctn&dl=30&rc=30d
```

### 3. ICAN donation with PayPass styling

```txt
payto://xcb/Xx...x?amount=ctn:12.3&org=Acme&item=Coffee&color-f=9AB1D6&color-b=2A3950&barcode=code128&lang=de&donate=1
```

### 4. IBAN payment with beneficiary and message

```txt
payto://iban/DE89370400440532013000?amount=eur:199.90&receiver-name=Acme%20GmbH&message=Invoice%23123
```

### 5. PIX payment with external identifier

```txt
payto://pix/abc-key-123?amount=brl:15&id=INV-2025-0001
```

### 6. INTRA payment with ORIC routing

```txt
payto://intra/ACC-001?bic=ORIC-ACME-001&amount=eur:12.00&message=Internal%20transfer
```

### 7. CASH / location handoff

```txt
payto://void/geo?loc=48.8582,2.2945
```

## Security Notes

Always validate a PayTo URI before sending money.

In particular:

- confirm the destination
- confirm the amount
- confirm recurrence and expiry settings
- confirm any split or swap instructions
- do not assume presentation options prove trust or issuer identity

For irreversible assets, users should verify the final address and parameters carefully before signing a transfer.

[RFC3986]: https://www.rfc-editor.org/rfc/rfc3986 "URI: Generic Syntax"
[RFC8905]: https://www.rfc-editor.org/rfc/rfc8905 "The 'payto' URI Scheme for Payments"
[ORIC]: https://payto.onl/solutions/oric "Organizational Routing Identifier Code"
[ICAN]: https://payto.onl/solutions/ican "International Crypto Asset Network"
