# TapeFlow on X Layer

TapeFlow is an on-chain payment suite built on X Layer and integrated with the TapeOut processor/circuit model. It combines everyday payment flows with programmable settlement, privacy, escrow, red packets, conditional locks, and merchant-facing tools in one public web app.

This repository is the public source package for the TapeOut Genesis Transistor Hackathon submission. It contains the browser client, Solidity contracts and tests, the TapeOut circuit source, and the X Layer mainnet deployment manifest. It intentionally excludes project-owned private keys, signer secrets, relayer credentials, and server infrastructure. Bundled third-party browser libraries may retain their upstream public default-provider identifiers.

## Live product

- Main website: [tapeflow.world](https://tapeflow.world/)
- Tape-hosted mirror: [1-2-247.tapekit.org](https://1-2-247.tapekit.org/)
- Canonical Tape name: `tape://1.2.247.tape/`
- Product announcement and demo: [X post](https://x.com/BitGoldKnight/status/2106280041122578645?s=20)
- Network: X Layer Mainnet (`chainId: 196`, native gas token: OKB)

## TapeOut processor disclosure

| Item | Value |
| --- | --- |
| Processor | `0x173b0C58d08e053ae6a2c2Ffe4bB51C37C03C9A3` |
| Transistor token | `0xf633119cea3017e8d328968be015a55bcf4f498c` |
| Creator / deployment wallet | `0x382e86E61b8C3aD6c32b8EEfdF81C5E9819703e6` |
| Processor name / symbol | `TapeFlow X` / `TFX` |
| Maximum transistor supply | `100,000` |
| Minted supply snapshot | `10` on 2026-10-03 |
| Unit mint price | `0.00066 OKB` |
| Protocol fee per mint | `0.00066 OKB` |
| Taped-out circuit | Circuit `#1`, `1.2.247` |
| Public container | `0x634934cc33bfb79ca9eb17f1a22b960906416894` |

The transistor supply, unit price, cap, and circuit values above are public on-chain parameters. The snapshot value can change after publication; verify current state on X Layer before relying on it.

## Product features

- **Wallet payments** — send native OKB or supported tokens to a wallet or compatible contract. OKX Connect supports cross-device QR authorization, same-device app handoff, session restoration, and explicit disconnect without moving the web app into the wallet browser.
- **QR receive and scan** — create payment requests and scan compatible payment codes. The scanner uses native browser decoding when available and a local JavaScript fallback for wallet browsers that only allow image selection.
- **Red packets** — normal, random, designated-recipient, and password-based packets. Supported public claim flows let the recipient claim without holding gas; the sender funds the service cost.
- **Escrow payments** — escrowed settlement with configured refund and dispute paths.
- **Conditional locks** — time conditions, price conditions, or combined time/price rules.
- **Scheduled payments** — create recurring or future payment instructions with explicit wallet authorization.
- **TapeVeil P3** — X Layer native-asset privacy-pool flows with locally generated proofs, encrypted recovery files, relayed withdrawal, and wallet-signed Ragequit recovery.
- **Budget policies** — optional per-payment, daily-limit, allowlist, freeze, and recipient-validity checks enforced through the TapeOut circuit policy.
- **Merchant tools** — payment links, QR codes, shareable posters, and integration-oriented public endpoints.

## TapeOut circuit

`tapeout/TapeFlowPolicyGateV1.blif` implements a five-condition payment policy gate. A payment is allowed only when all of these inputs are true:

1. the account is not frozen;
2. the payment is within its per-transaction limit;
3. the daily budget remains within its limit;
4. the allowlist rule passes; and
5. the payer and recipient are valid.

The deployed policy adapters bind this circuit to the TapeFlow hub on X Layer. Circuit source and notes are in [`tapeout/`](tapeout/).

## Architecture

```text
Wallet / browser
      |
      +-- TapeFlow static web client
      |       |
      |       +-- X Layer smart contracts
      |       +-- TapeOut processor + circuit policy
      |       +-- optional public relayer/API for assisted flows
      |
      +-- user-controlled signatures and transaction approvals
```

Core asset custody and settlement state are handled by contracts on X Layer. Local encryption, proof generation, recovery-file handling, read-only RPC calls, and optional relayer submission happen outside the contracts. TapeFlow does not require users to disclose private keys or seed phrases.

## Repository layout

```text
contracts/   Solidity contracts, Hardhat configuration, and tests
deployments/ X Layer mainnet addresses and verification metadata
deweb/       Compact Tape/DeWEB entry page
tapeout/     TapeOut BLIF circuit and circuit documentation
web/         Public browser application, ABIs, proving artifacts, and static assets
```

## Mainnet contracts

The complete address list, deployment transactions, bytecode checks, privacy-pool parameters, and superseded-version notes are recorded in [`deployments/xlayer-mainnet.json`](deployments/xlayer-mainnet.json).

Current primary contracts include:

| Component | Address |
| --- | --- |
| TapeFlow hub | `0xD0FeCB3371d5DdCde9bfeF436D1E0DFBa8B8e074` |
| Circuit budget policy V2 | `0x73Bebf28704e0D4e56eDD559291484c18C091Ed5` |
| Escrow V2 | `0x1913374b8B09C02eE1aC85d5215785aaeB99ca04` |
| Packet hub V4 | `0xAEbAc1a120908E8E3a860b2f7a30b4052463C436` |
| Price oracle | `0x6fE2CAcE8c8cD8D5f833aC6d9d479E6050e8549c` |
| Conditional lock V2 | `0x83Fe48c687Da4557668a7DAb937B638DD75FdE2f` |
| TapeVeil P3 entrypoint | `0x9dD6EE0f62f7D6c5dEb6236973b7176cD0064f60` |
| TapeVeil P3 native pool | `0xc3848137D254716676FE71d7DB0324d7675090cE` |

## Local development

The product client is static and can be served from the `web` directory:

```bash
npx serve web
```

To compile and test the public contracts:

```bash
cd contracts
pnpm install
pnpm compile
pnpm test
```

Never place wallet private keys, relayer signing keys, API credentials, or production `.env` files in this repository.

## Status

This is the initial public release of TapeFlow. The product and repository will continue to be updated. Users should verify contract addresses, transaction details, and current interface state before signing any transaction.

## Contact and support

- X: [@BitGoldKnight](https://x.com/BitGoldKnight)
- Telegram: [@Naani_Developer](https://t.me/Naani_Developer)
- Developer support wallet: `0x382e86e61b8c3ad6c32b8eefdf81c5e9819703e6`
