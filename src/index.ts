/**
 * @verachain/sdk — Official TypeScript/JavaScript SDK for VERA SmartChain.
 * Read-only, keyless, zero runtime dependencies.
 */

// Error classes
export {
  VeraError,
  VeraRpcError,
  VeraFaucetError,
  VeraValidationError,
} from './errors.js';

// Cryptography & Address utilities
export { keccak256, keccak256Hex } from './crypto/keccak.js';
export {
  isVeraAddress,
  isEvmAddress,
  toChecksumAddress,
  toEvmAddress,
} from './addresses.js';

// Unit conversion
export { parseVera, formatVera } from './units.js';

// Chain configurations & Presets
export { veraTestnet } from './chain.js';
export type { VeraChain } from './chain.js';

// Client
export { VeraClient, createVeraClient } from './client.js';

// Faucet
export { requestFaucet } from './faucet.js';

// TypeScript Types
export type {
  ValidatorStatus,
  NetworkStatus,
  Validator,
  ValidatorsResponse,
  AccountInfo,
  AccountProof,
  NodeAttestation,
  RecentBlock,
  RecentTransaction,
  BlockHeader,
  VeraBlock,
  FaucetResponse,
  VeraClientOptions,
  FaucetOptions,
} from './types.js';
