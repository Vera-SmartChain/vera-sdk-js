import { veraTestnet as baseChain } from './chain.js';

/**
 * Viem-compatible Chain configuration for VERA SmartChain Testnet.
 * Compatible with viem's createPublicClient, createWalletClient, and defineChain.
 */
export const veraTestnet = {
  id: baseChain.id,
  name: baseChain.name,
  nativeCurrency: baseChain.nativeCurrency,
  rpcUrls: {
    default: {
      http: [...baseChain.rpcUrls.default.http],
    },
    public: {
      http: [...baseChain.rpcUrls.public.http],
    },
  },
  blockExplorers: {
    default: {
      name: baseChain.blockExplorers.default.name,
      url: baseChain.blockExplorers.default.url,
    },
  },
  testnet: true,
} as const;

export default veraTestnet;
