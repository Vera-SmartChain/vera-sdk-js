/**
 * Base error class for all VERA SDK errors.
 */
export class VeraError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VeraError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error returned by VERA SmartChain JSON-RPC endpoint.
 */
export class VeraRpcError extends VeraError {
  readonly code?: number;
  readonly method?: string;
  readonly data?: unknown;

  constructor(message: string, code?: number, method?: string, data?: unknown) {
    super(message);
    this.name = 'VeraRpcError';
    this.code = code;
    this.method = method;
    this.data = data;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error returned by the VERA SmartChain Faucet API.
 */
export class VeraFaucetError extends VeraError {
  readonly retryAfterSeconds?: number;
  readonly isRateLimited: boolean;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'VeraFaucetError';
    this.retryAfterSeconds = retryAfterSeconds;
    this.isRateLimited = typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when input validation fails (e.g. invalid address or unit format).
 */
export class VeraValidationError extends VeraError {
  constructor(message: string) {
    super(message);
    this.name = 'VeraValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
