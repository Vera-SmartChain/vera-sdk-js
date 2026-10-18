import { veraTestnet as baseChain } from './chain.js';

/**
 * Ethers v6 compatible Network definition for VERA SmartChain Testnet.
 * Compatible with ethers' JsonRpcProvider and Network.from.
 */
export const veraTestnetNetwork = {
  name: 'vera-testnet',
  chainId: baseChain.id,
} as const;

export default veraTestnetNetwork;

