import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { logger } from '../utils/logger';
import { SensorReading, ProcessedData, DataAlert } from '../types/sensor';

export class IPFSConnector {
  private ipfsClient: IPFSHTTPClient | null = null;
  private gatewayUrl: string;

  constructor() {
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'http://localhost:8080';
    this.initializeIPFS();
  }

  private async initializeIPFS(): Promise<void> {
    try {
      const ipfsUrl = process.env.IPFS_API_URL || 'http://localhost:5001';
      
      this.ipfsClient = create({
        url: ipfsUrl,
        timeout: 30000,
      });

      // Test connection
      const version = await this.ipfsClient.version();
      logger.info(`Connected to IPFS node: ${version.version}`);
      
    } catch (error) {
      logger.error('Failed to initialize IPFS connection:', error);
      throw error;
    }
  }

  /**
   * Upload sensor data to IPFS
   * @param sensorData Sensor reading data
   * @returns IPFS hash
   */
  public async uploadSensorData(sensorData: SensorReading): Promise<string> {
    try {
      if (!this.ipfsClient) {
        throw new Error('IPFS client not initialized');
      }

      const data = JSON.stringify(sensorData);
      const result = await this.ipfsClient.add(data);
      
      logger.info(`Sensor data uploaded to IPFS: ${result.cid}`);
      return result.cid.toString();
      
    } catch (error) {
      logger.error('Failed to upload sensor data to IPFS:', error);
      throw error;
    }
  }

  /**
   * Upload processed data to IPFS
   * @param processedData Processed sensor data
   * @returns IPFS hash
   */
  public async uploadProcessedData(processedData: ProcessedData): Promise<string> {
    try {
      if (!this.ipfsClient) {
        throw new Error('IPFS client not initialized');
      }

      const data = JSON.stringify(processedData);
      const result = await this.ipfsClient.add(data);
      
      logger.info(`Processed data uploaded to IPFS: ${result.cid}`);
      return result.cid.toString();
      
    } catch (error) {
      logger.error('Failed to upload processed data to IPFS:', error);
      throw error;
    }
  }

  /**
   * Upload alert data to IPFS
   * @param alert Data alert
   * @returns IPFS hash
   */
  public async uploadAlert(alert: DataAlert): Promise<string> {
    try {
      if (!this.ipfsClient) {
        throw new Error('IPFS client not initialized');
      }

      const data = JSON.stringify(alert);
      const result = await this.ipfsClient.add(data);
      
      logger.info(`Alert data uploaded to IPFS: ${result.cid}`);
      return result.cid.toString();
      
    } catch (error) {
      logger.error('Failed to upload alert to IPFS:', error);
      throw error;
    }
  }

  /**
   * Download data from IPFS
   * @param cid IPFS content identifier
   * @returns Downloaded data
   */
  public async downloadData(cid: string): Promise<any> {
    try {
      if (!this.ipfsClient) {
        throw new Error('IPFS client not initialized');
      }

      const chunks = [];
      
      for await (const chunk of this.ipfsClient.cat(cid)) {
        chunks.push(chunk);
      }
      
      const data = Buffer.concat(chunks).toString();
      return JSON.parse(data);
      
    } catch (error) {
      logger.error('Failed to download data from IPFS:', error);
      throw error;
    }
  }

  /**
   * Batch upload multiple sensor readings
   * @param sensorReadings Array of sensor readings
   * @returns Array of IPFS hashes
   */
  public async batchUploadSensorData(sensorReadings: SensorReading[]): Promise<string[]> {
    try {
      const hashes: string[] = [];
      
      for (const reading of sensorReadings) {
        try {
          const hash = await this.uploadSensorData(reading);
          hashes.push(hash);
        } catch (error) {
          logger.error(`Failed to upload sensor reading ${reading.sensorId}:`, error);
          // Continue with other readings
        }
      }
      
      logger.info(`Batch upload completed: ${hashes.length}/${sensorReadings.length} successful`);
      return hashes;
      
    } catch (error) {
      logger.error('Failed to batch upload sensor data:', error);
      throw error;
    }
  }

  /**
   * Get IPFS gateway URL for a given hash
   * @param cid IPFS content identifier
   * @returns Gateway URL
   */
  public getGatewayUrl(cid: string): string {
    return `${this.gatewayUrl}/ipfs/${cid}`;
  }

  /**
   * Check IPFS connection health
   * @returns True if connection is healthy
   */
  public async checkHealth(): Promise<boolean> {
    try {
      if (!this.ipfsClient) {
        return false;
      }
      
      await this.ipfsClient.version();
      return true;
    } catch (error) {
      logger.error('IPFS health check failed:', error);
      return false;
    }
  }

  /**
   * Get IPFS node information
   * @returns Node information
   */
  public async getNodeInfo(): Promise<any> {
    try {
      if (!this.ipfsClient) {
        throw new Error('IPFS client not initialized');
      }
      
      const version = await this.ipfsClient.version();
      const id = await this.ipfsClient.id();
      
      return {
        version: version.version,
        nodeId: id.id,
        addresses: id.addresses,
        gatewayUrl: this.gatewayUrl
      };
      
    } catch (error) {
      logger.error('Failed to get IPFS node info:', error);
      throw error;
    }
  }

  /**
   * Disconnect from IPFS
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.ipfsClient) {
        // IPFS client doesn't have a disconnect method
        this.ipfsClient = null;
        logger.info('IPFS client disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from IPFS:', error);
    }
  }
}
