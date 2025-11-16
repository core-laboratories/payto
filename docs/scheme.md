# PayTo Scheme

## Specification: PAYTO Uniform Resource Identifier (URI) Scheme

This memo introduces an interim URI scheme for resources that identify a payment recipient. Resolution of a PAYTO URI usually results in making a payment to the designated recipient, but may also include non‑financial operations (e.g., sending a message). This expands upon [RFC 8905][RFC8905].

## PAYTO URI Scheme

### Introduction

The PAYTO URI scheme designates the recipient and parameters of a payment or related action. When a PAYTO URI is dereferenced, client applications can construct a transfer form prefilled with the encoded parameters.

### Scheme Syntax

PAYTO is a [URI][RFC3986] with an authority indicating the payment network or transport and an optional query for parameters.

```txt
payto-URI = "payto://" authority path-abempty [ "?" opts ]
opts      = opt *( "&" opt )
opt       = opt-name "=" opt-value

; Common options (appear across multiple authorities)
opt-name  = "amount" / "fiat" / "dl" / "rc" / "split" / "swap" /
            "receiver-name" / "sender-name" / "message" / "id" /
            "org" / "item" / "color-f" / "color-b" / "barcode" /
            authority-specific-opt

authority = ALPHA *( ALPHA / DIGIT / "-" / "." )
```

Notes:

- All query values are URL‑encoded.
- Unknown parameters MUST be ignored by clients.

## Supported Authorities (Networks/Transports)

### ICAN (International Crypto Asset Network)

- Constructors (examples): `xcb` (Core), `btc`, `eth`, `ltc`, `xmr`, `other`
- Form: `payto://{type}/{address}[@{chain_id}]?{options}`
- Address may be a direct address or a name service record depending on `{type}`.

What it is: ICAN represents crypto-asset rails (public or enterprise chains). Transfers are settled on-chain. Assets can be native coins or tokens. Optional `@{chain_id}` disambiguates sub‑nets (e.g., parachains, L2s). See also [ICAN][ICAN].

Typical use: consumer P2P/P2B payments, donations, or machine-to-machine transfers using crypto.

### IBAN (International Bank Account Number)

- Form: `payto://iban/{iban}?{options}`

What it is: A standardized international bank account format used across many countries. IBAN identifies the destination account and country for bank transfers.

Typical use: bank credit transfers (SEPA/Swift) where the receiver is identified by an IBAN; optional metadata such as beneficiary name and message are supported.

### ACH (Automated Clearing House)

- Form: `payto://ach/{account}?{options}`

What it is: A batch‑clearing network (primarily US) that settles bank payments in batches. Amounts are expressed in currency with decimals (not cents).

Typical use: payroll, invoicing, and lower‑cost bank transfers where settlement latency is acceptable.

### UPI (Unified Payments Interface)

- Form: `payto://upi/{vpa}?{options}`

What it is: A real‑time retail payment system in India, addressed by VPA (Virtual Payment Address). Supports metadata (beneficiary name, message).

Typical use: instant P2P/P2M QR‑based payments within the UPI ecosystem.

### PIX (Central Bank of Brazil)

- Form: `payto://pix/{key}?{options}`

What it is: Brazil’s instant payment system operated by the Central Bank. Addressed by a PIX key (phone/email/tax id/random).

Typical use: instant transfers 24/7 to individuals and businesses using the receiver’s PIX key.

### BIC / ORIC (Routing Identifiers)

- BIC (Bank Identifier Code) identifies a financial institution.
- ORIC (Organizational Routing Identifier Code) extends routing for organizations and private networks (see [ORIC solution][ORIC]).
- Both are supported under the `bic` authority; the path may contain a BIC or an ORIC string. For intra‑bank payments, you can also place the BIC/ORIC as a `bic` query parameter on `intra`.
- Forms:
  - `payto://bic/{bic_or_oric}?{options}`
  - `payto://intra/{account_id}?bic={bic_or_oric}&{options}`

What it is: Routing identifiers for bank/organizational networks. Use BIC for SWIFT institutions; use ORIC for private/enterprise routing domains where applicable.

Typical use: lookups and routing where an institution or organization code is the primary locator (with the actual account supplied via `iban`, `intra`, etc.).

### INTRA (Intra‑bank account)

- Used for transfers within the same banking group or private networks.
- Fields include an internal account identifier and optionally a bank routing identifier (BIC/ORIC).
- Form: `payto://intra/{account_id}?{options}`
- Common options: `bic={bic_or_oric}`, `receiver-name`, `message`, `amount`

What it is: Internal account routing within a single bank or a closed banking group. `bic` may hold a BIC or an ORIC value to route inside private or organizational networks.

Typical use: fast, on‑us transfers between accounts of the same institution or group.

Examples:

```txt
payto://intra/ACC123456?bic=ABCDUS33&amount=eur:25.00&receiver-name=Acme
payto://intra/ID-98765?amount=eur:10.50&message=Internal%20transfer
```

### CASH (Void transport)

- Transports: `geo`, `plus`, `other`
- Forms:
  - Geolocation: `payto://void/geo?loc={lat},{lon}`
  - Plus Code:   `payto://void/plus?loc={plus_code}`
  - Other:       `payto://void/other?loc={custom}`

What it is: Off‑ledger/pay‑in‑person flows where the target is a physical location or out‑of‑band rendezvous. Used for cash/physical settlement scenarios.

Typical use: show a location for hand‑off, ATM‑like interactions, or location‑anchored vouchers.

## Parameters

### amount

Specifies the requested amount and optionally asset on ICAN.

- ICAN (tokenized): `amount={asset_code}:{amount}` (e.g. `ctn:12.5`)
- ICAN (native):    `amount={amount}` (uses default network currency)
- IBAN/ACH/UPI/PIX/BIC/CASH: `amount={fiat_code}:{amount}` or `{amount}` as supported by the network
- Decimal separator is `.`. Amount must be non‑negative.

Examples:

```txt
payto://xcb/Xx...x?amount=ctn:25.00
payto://iban/DE89...3704?amount=eur:199.90
```

### fiat (ICAN only)

Fiat currency used for display/conversion on crypto (ICAN).

```txt
payto://xcb/Xx...x?amount=ctn:25.00&fiat=eur
```

### dl (deadline / expiration)

Expiration as ISO timestamp, UNIX seconds, or minutes from now (1–60). Value earlier than current time marks the request as expired.

```txt
payto://xcb/Xx...x?amount=ctn:10&dl=2025-12-31T23:59:59Z
payto://xcb/Xx...x?amount=ctn:10&dl=1735689599
payto://xcb/Xx...x?amount=ctn:10&dl=15   ; 15 minutes
```

### rc (recurring)

Recurrence schedule. Supported:

- `y` yearly, `m` monthly, `w` weekly, `d` daily
- `Nd` daily every N days, where `N` is 2–365 (e.g., `2d`, `45d`)

```txt
payto://xcb/Xx...x?amount=ctn:9.99&rc=m
payto://iban/DE89...3704?amount=eur:25&rc=30d
```

### split (ICAN)

Split an amount to a secondary address; two transfers are streamed.

- Absolute: `split={value}@{address}`
- Percentage: `split=p:{percent}@{address}` (0 < percent ≤ 100)
- `value` must be ≤ `amount`.

```txt
payto://xcb/Xx...x?amount=ctn:100&split=p:10@Xy...y
```

### swap (ICAN)

Request on‑the‑fly asset conversion to `asset_code` for the recipient.

```txt
payto://xcb/Xx...x?amount=ctn:20&swap=ctn
```

### receiver-name / sender-name / message

Optional metadata used by banking rails and passes.

```txt
payto://iban/DE89...3704?amount=eur:99.5&receiver-name=Acme%20GmbH&message=Invoice%20123
```

### id (PIX)

Optional transaction identifier.

```txt
payto://pix/abc-123?amount=brl:15&id=INV-2025-0001
```

### loc (CASH transports)

Geolocation or Plus Code as described under CASH.

## Pass (Presentation) Options

These parameters influence wallet card presentation and are optional.

- `org` Company name (≤ 25 chars)
- `item` Item/purpose (≤ 40 chars)
- `color-f` Foreground color hex without `#` (e.g. `9AB1D6`)
- `color-b` Background color hex without `#` (e.g. `2A3950`)
- `barcode` One of `qr`, `pdf417`, `aztec` (default `qr`)
- `donate` `1` for donation flow

Colors are validated using a minimum Euclidean distance of 100 between foreground and background.

Example:

```txt
payto://xcb/Xx...x?amount=ctn:12.3&org=Acme&item=Coffee&color-f=9AB1D6&color-b=2A3950&barcode=qr&donate=1
```

## Comprehensive Examples

ICAN with chain, split, swap, deadline, recurring (every 30 days):

```txt
payto://xcb/Xx...x@777?amount=ctn:100&fiat=eur&split=p:10@Xy...y&swap=ctn&dl=30&rc=30d
```

IBAN with receiver name and message:

```txt
payto://iban/DE89370400440532013000?amount=eur:199.90&receiver-name=Acme%20GmbH&message=Invoice%23123
payto://bic/ABCDUS33?amount=eur:49.99
payto://bic/ORIC-ACME-001?amount=eur:15.00
payto://intra/ACC-001?bic=ORIC-ACME-001&amount=eur:12.00
```

PIX with identifier:

```txt
payto://pix/abc-key-123?amount=brl:15&id=INV-2025-0001
```

CASH with geolocation:

```txt
payto://void/geo?loc=48.8582,2.2945
```

## Security Considerations

Always validate the authenticity and correctness of PAYTO URIs. For irreversible assets, users must confirm the recipient address and amount before initiating a transfer.

[RFC3986]: https://www.rfc-editor.org/rfc/rfc3986 (URI: Generic Syntax)
[RFC8905]: https://www.rfc-editor.org/rfc/rfc8905 (The 'payto' URI Scheme for Payments)
[ORIC]: https://payto.onl/solutions/oric (Organizational Routing Identifier Code)
[ICAN]: https://payto.onl/solutions/ican (International Crypto Asset Network)
