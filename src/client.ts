import { isEvmAddress, isVeraAddress, toEvmAddress } from './addresses.js';
import { veraTestnet } from './chain.js';
import { VeraRpcError, VeraValidationError } from './errors.js';
import type {
  AccountInfo,
  AccountProof,
  NetworkStatus,
  NodeAttestation,
  RecentBlock,
  RecentTransaction,
  ValidatorsResponse,
  VeraBlock,
  VeraClientOptions,
} from './types.js';

/**
 * High-level typed read-only client for VERA SmartChain.
 */
export class VeraClient {
  readonly rpcUrl: string;
  readonly timeoutMs: number;

  constructor(options: VeraClientOptions = {}) {
    this.rpcUrl = options.rpcUrl || veraTestnet.rpcUrls.default.http[0];
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  /**
   * Internal generic JSON-RPC call handler with timeout and error mapping.
   */
  private async rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    };

    let response: Response;
    try {
      response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (err as { name?: string })?.name === 'AbortError';
      const msg = isAbort
        ? `RPC request timed out after ${this.timeoutMs}ms for method "${method}"`
        : `Network error connecting to RPC (${this.rpcUrl}): ${(err as Error)?.message || String(err)}`;
      throw new VeraRpcError(msg, isAbort ? -32000 : undefined, method);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new VeraRpcError(
        `HTTP error ${response.status} (${response.statusText}) from RPC endpoint`,
        response.status,
        method
      );
    }

    let json: { jsonrpc?: string; result?: unknown; error?: { code?: number; message?: string; data?: unknown } };
    try {
      json = (await response.json()) as typeof json;
    } catch (err) {
      throw new VeraRpcError(`Failed to parse JSON-RPC response from RPC endpoint: ${(err as Error).message}`, undefined, method);
    }

    if (json.error) {
      throw new VeraRpcError(
        json.error.message || `JSON-RPC error calling "${method}"`,
        json.error.code,
        method,
        json.error.data
      );
    }

    return json.result as T;
  }

  /**
   * Returns current network status including active validators, height, and state roots.
   */
  async getStatus(): Promise<NetworkStatus> {
    const res = await this.rpcCall<{
      active_validators: number;
      chain_id: string;
      csmt_root: string;
      height: number;
      latest_block_hash: string;
      total_stake: number;
      total_transactions: number;
      validators: Array<{
        address: string;
        missed_blocks: number;
        public_key: string;
        rank: number;
        stake: number;
        stake_raw: string;
        status: string;
      }>;
    }>('vera_status');

    return {
      activeValidators: res.active_validators,
      chainId: res.chain_id,
      csmtRoot: res.csmt_root,
      height: res.height,
      latestBlockHash: res.latest_block_hash,
      totalStake: res.total_stake,
      totalTransactions: res.total_transactions,
      validators: res.validators || [],
    };
  }

  /**
   * Returns the current block height as an integer.
   */
  async getBlockNumber(): Promise<number> {
    const res = await this.rpcCall<number>('vera_blockNumber');
    return Number(res);
  }

  /**
   * Returns account information (balance in wei as BigInt, nonce, codeHash, storageRoot).
   * @param address 32-byte native VERA address or 20-byte EVM address.
   */
  async getAccount(address: string): Promise<AccountInfo> {
    if (!isVeraAddress(address) && !isEvmAddress(address)) {
      throw new VeraValidationError(
        `Invalid address format: "${address}". Expected 32-byte VERA or 20-byte EVM address.`
      );
    }

    const res = await this.rpcCall<{
      balance: string | number;
      nonce: number;
      code_hash: string;
      storage_root: string;
    }>('vera_getAccount', [address]);

    const balanceBigInt =
      typeof res.balance === 'string'
        ? res.balance.startsWith('0x')
          ? BigInt(res.balance)
          : BigInt(res.balance)
        : BigInt(res.balance);

    return {
      balance: balanceBigInt,
      nonce: Number(res.nonce),
      codeHash: res.code_hash,
      storageRoot: res.storage_root,
    };
  }

  /**
   * Returns validator set information, stakes, and allowlist.
   * All stake values are returned as BigInt in wei.
   */
  async getValidators(): Promise<ValidatorsResponse> {
    const res = await this.rpcCall<{
      activeTotalStake: string;
      activeValidators: Array<{
        address: string;
        isJailed: boolean;
        missedBlocks: number;
        publicKey: string;
        stake: string;
      }>;
      allowlist: string[];
      governanceAddress: string;
      maxActiveValidators: number;
      minValidatorStake: string;
      permissionedValidators: boolean;
      supermajorityThreshold: string;
      totalStake: string;
      unbondingQueue?: unknown[];
      validators: Array<{
        address: string;
        isJailed: boolean;
        missedBlocks: number;
        publicKey: string;
        stake: string;
      }>;
    }>('vera_getValidators');

    const mapVal = (v: {
      address: string;
      isJailed: boolean;
      missedBlocks: number;
      publicKey: string;
      stake: string;
    }) => ({
      address: v.address,
      isJailed: v.isJailed,
      missedBlocks: v.missedBlocks,
      publicKey: v.publicKey,
      stake: BigInt(v.stake),
    });

    return {
      activeTotalStake: BigInt(res.activeTotalStake || '0'),
      activeValidators: (res.activeValidators || []).map(mapVal),
      allowlist: res.allowlist || [],
      governanceAddress: res.governanceAddress,
      maxActiveValidators: Number(res.maxActiveValidators),
      minValidatorStake: BigInt(res.minValidatorStake || '0'),
      permissionedValidators: Boolean(res.permissionedValidators),
      supermajorityThreshold: BigInt(res.supermajorityThreshold || '0'),
      totalStake: BigInt(res.totalStake || '0'),
      unbondingQueue: res.unbondingQueue || [],
      validators: (res.validators || []).map(mapVal),
    };
  }

  /**
   * Checks if an address is in the official validator allowlist.
   * Supports both 32-byte native addresses and 20-byte derived EVM addresses.
   * @param address 32-byte VERA address or 20-byte EVM address.
   */
  async isAllowlisted(address: string): Promise<boolean> {
    if (!isVeraAddress(address) && !isEvmAddress(address)) {
      throw new VeraValidationError(
        `Invalid address format: "${address}". Expected 32-byte VERA or 20-byte EVM address.`
      );
    }

    const { allowlist } = await this.getValidators();
    const queryLower = address.toLowerCase();

    for (const entry of allowlist) {
      if (entry.toLowerCase() === queryLower) {
        return true;
      }
      if (isVeraAddress(entry) && isEvmAddress(address)) {
        try {
          if (toEvmAddress(entry).toLowerCase() === queryLower) {
            return true;
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    return false;
  }

  /**
   * Returns cryptographic account proof from the Sparse Merkle Tree (CSMT).
   * @param address 32-byte native VERA address.
   */
  async getProof(address: string): Promise<AccountProof> {
    return this.rpcCall<AccountProof>('vera_getProof', [address]);
  }

  /**
   * Returns cryptographic node attestation containing self-reported binary SHA-256 and state root.
   */
  async getNodeAttestation(): Promise<NodeAttestation> {
    const res = await this.rpcCall<{
      attestation_timestamp: number;
      chain_id: string;
      cryptographic_standard: string;
      current_block_height: number;
      integrity_status: string;
      network: string;
      node_address: string;
      self_reported_binary_sha256: string;
      state_root: string;
    }>('vera_getNodeAttestation');

    return {
      attestationTimestamp: res.attestation_timestamp,
      chainId: res.chain_id,
      cryptographicStandard: res.cryptographic_standard,
      currentBlockHeight: res.current_block_height,
      integrityStatus: res.integrity_status,
      network: res.network,
      nodeAddress: res.node_address,
      selfReportedBinarySha256: res.self_reported_binary_sha256,
      stateRoot: res.state_root,
    };
  }

  /**
   * Returns recent block summaries.
   * @param limit Maximum number of recent blocks to return (default: 10).
   */
  async getRecentBlocks(limit: number = 10): Promise<RecentBlock[]> {
    return this.rpcCall<RecentBlock[]>('vera_getRecentBlocks', [limit]);
  }

  /**
   * Returns recent transactions.
   * @param limit Maximum number of recent transactions to return (default: 10).
   */
  async getRecentTransactions(limit: number = 10): Promise<RecentTransaction[]> {
    return this.rpcCall<RecentTransaction[]>('vera_getRecentTransactions', [limit]);
  }

  /**
   * Returns block details by height.
   * @param height Block height.
   * @param fullTxs Whether to include full transaction objects.
   */
  async getBlockByNumber(height: number, fullTxs: boolean = false): Promise<VeraBlock | null> {
    return this.rpcCall<VeraBlock | null>('vera_getBlockByNumber', [height, fullTxs]);
  }
}

/**
 * Creates a new instance of VeraClient.
 */
export function createVeraClient(options?: VeraClientOptions): VeraClient {
  return new VeraClient(options);
}
