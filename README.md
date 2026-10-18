# @verachain/sdk

Official TypeScript / JavaScript SDK for **VERA SmartChain** — read-only, keyless, and zero runtime dependencies.

[![npm version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://www.npmjs.com/package/@verachain/sdk)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)
[![Network](https://img.shields.io/badge/network-testnet--83721-orange.svg)](https://testnet-explorer.verachain.cloud)

---

## Features

- 🔒 **Keyless & Safe:** Strictly read-only in v0.1. Zero private key handling or signing (native Ed25519 signing deferred to v0.2 via official WASM).
- 🪶 **Zero Runtime Dependencies:** Pure TypeScript compiled to dual ESM and CJS with zero external runtime dependencies (`dependencies: {}`).
- ⚡ **Native Typed RPC:** Built-in client for all `vera_*` protocol methods (`getStatus`, `getBlockNumber`, `getAccount`, `getValidators`, `isAllowlisted`, `getProof`, `getNodeAttestation`).
- 📐 **Lossless BigInt Units:** `parseVera` and `formatVera` use pure BigInt math with strict validation (no IEEE-754 precision loss).
- 🌐 **EIP-55 Address Derivation:** Convert 32-byte native VERA addresses to canonical 20-byte EVM addresses with zero-dependency Keccak-256.
- 🔌 **Ready for Viem & Ethers:** Subpath exports for viem (`@verachain/sdk/viem`) and ethers (`@verachain/sdk/ethers`).
- 🚰 **Testnet Faucet:** First-class typed faucet client with automatic 24-hour rate-limit error mapping.

---

## Installation

```bash
npm install @verachain/sdk
```

Optional peer dependencies (install if you use viem or ethers):

```bash
npm install viem ethers
```

---

## Quick Start

### 1. Network Status and Health

```typescript
import { createVeraClient, formatVera } from "@verachain/sdk";

const client = createVeraClient();

// Query network status
const status = await client.getStatus();
console.log(`Current Block Height: #${status.height}`);
console.log(`Active Validators: ${status.activeValidators}`);
console.log(`Total Staked: ${status.totalStake} VERA`);
```

### 2. Validator Allowlist and Details

```typescript
import { createVeraClient, formatVera, toEvmAddress } from "@verachain/sdk";

const client = createVeraClient();

const { allowlist, activeValidators, totalStake } = await client.getValidators();
console.log(`Total Staked (wei): ${totalStake.toString()} (${formatVera(totalStake)} VERA)`);
console.log(`Allowlisted Validators: ${allowlist.length}`);

for (const val of activeValidators) {
  const evm = toEvmAddress(val.address);
  console.log(`Validator: ${val.address} -> EVM: ${evm} (Stake: ${formatVera(val.stake)} VERA)`);
}
```

### 3. Lossless Unit Conversions

```typescript
import { parseVera, formatVera } from "@verachain/sdk";

// Convert decimal string to wei BigInt (zero float rounding error)
const wei = parseVera("1.5");
console.log(`Wei: ${wei.toString()}`); // 1500000000000000000n

// Format wei BigInt back to human-readable string
const formatted = formatVera(wei);
console.log(`Formatted: ${formatted}`); // "1.5"
```

### 4. Address Derivation (Native VERA -> EVM)

Native VERA addresses are 32 bytes (`0x` + 64 hex characters). The corresponding EVM address is derived from the last 20 bytes with EIP-55 checksum:

```typescript
import { toEvmAddress, isVeraAddress, isEvmAddress } from "@verachain/sdk";

const veraAddress = "0x19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2e";
const evmAddress = toEvmAddress(veraAddress);

console.log(`Native 32-byte Address: ${veraAddress}`);
console.log(`Checksummed EVM Address: ${evmAddress}`);
// Output: "0x5fdE1EEBE9012c8Fc8f76654d51B4304B61EBf2E"
```

> **Note:** Because 12 bytes are discarded during EVM address derivation, the conversion EVM -> VERA is non-invertible and is not supported.

### 5. Using with Viem

Import the preset directly via subpath `@verachain/sdk/viem`:

```typescript
import { createPublicClient, http } from "viem";
import { veraTestnet } from "@verachain/sdk/viem";

const publicClient = createPublicClient({
  chain: veraTestnet,
  transport: http(),
});

const blockNumber = await publicClient.getBlockNumber();
console.log(`Current Block Number via Viem: ${blockNumber}`);
```

### 6. Using with Ethers v6

Import the preset directly via subpath `@verachain/sdk/ethers`:

```typescript
import { JsonRpcProvider } from "ethers";
import { veraTestnetNetwork } from "@verachain/sdk/ethers";

const provider = new JsonRpcProvider(
  "https://testnet-rpc.verachain.cloud",
  veraTestnetNetwork
);

const blockNumber = await provider.getBlockNumber();
console.log(`Current Block Number via Ethers: ${blockNumber}`);
```

---

## Testnet Parameters

| Parameter | Value |
|---|---|
| **EVM Chain ID** | `83721` (`0x14709`) |
| **Native Chain ID** | `vera-testnet-1` |
| **Currency** | `VERA` (18 decimals) |
| **Gas Price** | `1 gwei` (`1000000000` wei) |
| **Genesis BLAKE3** | `0xf9e740cbcddab634a4b1d3e6b11692e76d4b302084a6d722e517dea5e40d4c24` |
| **Public RPC** | `https://testnet-rpc.verachain.cloud` |
| **Block Explorer** | `https://testnet-explorer.verachain.cloud` |
| **Official Faucet** | `https://testnet-faucet.verachain.cloud/api/faucet` |

---

## Security & Transparency

- **Audit:** `npm audit` reports 0 vulnerabilities.
- **Zero Secrets:** No private keys, mnemonics, or production secrets are stored in this package.
- **Read-Only:** Cannot sign transactions or drain funds.

---

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
