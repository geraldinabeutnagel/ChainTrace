import { ethers } from 'ethers';
import { logger } from '../utils/logger';

let provider: ethers.providers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;

export const initializeBlockchain = async (): Promise<void> => {
  try {
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
    
    provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    if (process.env.PRIVATE_KEY) {
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      logger.info(`Blockchain wallet initialized: ${wallet.address}`);
    }
    
    // Test connection
    const network = await provider.getNetwork();
    logger.info(`Connected to blockchain network: ${network.name} (Chain ID: ${network.chainId})`);
    
  } catch (error) {
    logger.error('Failed to initialize blockchain connection:', error);
    throw error;
  }
};

export const getProvider = (): ethers.providers.JsonRpcProvider => {
  if (!provider) {
    throw new Error('Blockchain provider not initialized');
  }
  return provider;
};

export const getWallet = (): ethers.Wallet => {
  if (!wallet) {
    throw new Error('Blockchain wallet not initialized');
  }
  return wallet;
};

export const checkBlockchainHealth = async (): Promise<boolean> => {
  try {
    if (!provider) {
      return false;
    }
    
    await provider.getBlockNumber();
    return true;
  } catch (error) {
    logger.error('Blockchain health check failed:', error);
    return false;
  }
};
