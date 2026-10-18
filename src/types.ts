/**
 * Type definitions for VERA SmartChain SDK.
 */

export interface ValidatorStatus {
  address: string;
  missed_blocks: number;
  public_key: string;
  rank: number;
  stake: number;
  stake_raw: string;
  status: string;
}

export interface NetworkStatus {
  activeValidators: number;
  chainId: string;
  csmtRoot: string;
  height: number;
  latestBlockHash: string;
  totalStake: number;
  totalTransactions: number;
  validators: ValidatorStatus[];
}

export interface Validator {
  address: string;
  isJailed: boolean;
  missedBlocks: number;
  publicKey: string;
  stake: bigint;
}

export interface ValidatorsResponse {
  activeTotalStake: bigint;
  activeValidators: Validator[];
  allowlist: string[];
  governanceAddress: string;
  maxActiveValidators: number;
  minValidatorStake: bigint;
  permissionedValidators: boolean;
  supermajorityThreshold: bigint;
  totalStake: bigint;
  unbondingQueue: unknown[];
  validators: Validator[];
}

export interface AccountInfo {
  balance: bigint;
  nonce: number;
  codeHash: string;
  storageRoot: string;
}

export interface AccountProof {
  key: number[];
  non_existence_leaf: unknown;
  siblings: Array<[boolean, number[]]>;
  value_hash: number[];
}

export interface NodeAttestation {
  attestationTimestamp: number;
  chainId: string;
  cryptographicStandard: string;
  currentBlockHeight: number;
  integrityStatus: string;
  network: string;
  nodeAddress: string;
  selfReportedBinarySha256: string;
  stateRoot: string;
}

export interface RecentBlock {
  age_secs: number;
  hash: string;
  height: number;
  proposer: string;
  state_root: string;
  timestamp: number;
  tx_count: number;
}

export interface RecentTransaction {
  block_number: number;
  from: string;
  hash: string;
  status: string;
  timestamp: number;
  to: string | null;
  tx_type: string;
  value: string;
}

export interface BlockHeader {
  height: number;
  last_commit_hash: number[];
  prev_hash: number[];
  proposer: number[];
  receipts_root: number[];
  state_root: number[];
  timestamp: number;
  tx_root: number[];
}

export interface VeraBlock {
  header: BlockHeader;
  last_commit: unknown[];
  receipts: unknown[];
  transactions: unknown[];
  validator_signatures: unknown[];
}

export interface FaucetResponse {
  txHash: string;
  amount: string;
  wallet: string;
  recipient: string;
  faucetSender: string;
  network: string;
  message: string;
}

export interface VeraClientOptions {
  /**
   * JSON-RPC endpoint URL. Defaults to 'https://testnet-rpc.verachain.cloud'.
   */
  rpcUrl?: string;

  /**
   * Request timeout in milliseconds. Defaults to 10000 (10 seconds).
   */
  timeoutMs?: number;
}

export interface FaucetOptions {
  /**
   * Faucet API endpoint URL. Defaults to 'https://testnet-faucet.verachain.cloud/api/faucet'.
   */
  faucetUrl?: string;

  /**
   * Request timeout in milliseconds. Defaults to 15000 (15 seconds).
   */
  timeoutMs?: number;
}
