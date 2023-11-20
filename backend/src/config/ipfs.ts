import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { logger } from '../utils/logger';

let ipfsClient: IPFSHTTPClient | null = null;

export const initializeIPFS = async (): Promise<void> => {
  try {
    const ipfsUrl = process.env.IPFS_API_URL || 'http://localhost:5001';
    
    ipfsClient = create({
      url: ipfsUrl,
      timeout: 30000,
    });

    // Test connection
    const version = await ipfsClient.version();
    logger.info(`Connected to IPFS node: ${version.version}`);
    
  } catch (error) {
    logger.error('Failed to initialize IPFS connection:', error);
    throw error;
  }
};

export const getIPFSClient = (): IPFSHTTPClient => {
  if (!ipfsClient) {
    throw new Error('IPFS client not initialized');
  }
  return ipfsClient;
};

export const uploadToIPFS = async (data: string | Buffer): Promise<string> => {
  try {
    const client = getIPFSClient();
    const result = await client.add(data);
    logger.info(`Data uploaded to IPFS: ${result.cid}`);
    return result.cid.toString();
  } catch (error) {
    logger.error('Failed to upload to IPFS:', error);
    throw error;
  }
};

export const downloadFromIPFS = async (cid: string): Promise<Buffer> => {
  try {
    const client = getIPFSClient();
    const chunks = [];
    
    for await (const chunk of client.cat(cid)) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    logger.error('Failed to download from IPFS:', error);
    throw error;
  }
};

export const checkIPFSHealth = async (): Promise<boolean> => {
  try {
    if (!ipfsClient) {
      return false;
    }
    
    await ipfsClient.version();
    return true;
  } catch (error) {
    logger.error('IPFS health check failed:', error);
    return false;
  }
};
