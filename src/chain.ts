/**
 * Canonical network configuration for VERA SmartChain Testnet.
 */
export const veraTestnet = {
  id: 83721,
  chainId: 83721,
  hexChainId: '0x14709',
  nativeChainId: 'vera-testnet-1',
  name: 'VERA SmartChain Testnet',
  network: 'vera-testnet',
  nativeCurrency: {
    name: 'VERA',
    symbol: 'VERA',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.verachain.cloud'],
    },
    public: {
      http: ['https://testnet-rpc.verachain.cloud'],
    },
  },
  blockExplorers: {
    default: {
      name: 'VeraScan',
      url: 'https://testnet-explorer.verachain.cloud',
    },
  },
  faucetUrls: {
    default: 'https://testnet-faucet.verachain.cloud/api/faucet',
  },
  genesisBlake3: '0xf9e740cbcddab634a4b1d3e6b11692e76d4b302084a6d722e517dea5e40d4c24',
  gasPrice: 1000000000n, // 1 gwei
  testnet: true,
} as const;

export type VeraChain = typeof veraTestnet;
