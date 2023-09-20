import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { SensorReading, ProcessedData, DataAlert } from '../types/sensor';

export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress: string;
  contractABI: any[];
  gasLimit?: number;
  gasPrice?: string;
}

export interface BlockchainTransaction {
  hash: string;
  blockNumber: number;
  gasUsed: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: string;
}

export class BlockchainConnector {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private config: BlockchainConfig;

  constructor(config: BlockchainConfig) {
    this.config = config;
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.contract = new ethers.Contract(
      config.contractAddress,
      config.contractABI,
      this.wallet
    );
  }

  /**
   * Submit sensor data to blockchain
   * @param sensorData Sensor reading data
   * @returns Transaction hash
   */
  public async submitSensorData(sensorData: SensorReading): Promise<string> {
    try {
      logger.info(`Submitting sensor data to blockchain: ${sensorData.sensorId}`);

      const tx = await this.contract.addSensorData(
        sensorData.sensorId,
        sensorData.sensorType,
        sensorData.value,
        sensorData.timestamp,
        sensorData.location || '',
        sensorData.metadata || {},
        {
          gasLimit: this.config.gasLimit || 200000,
          gasPrice: this.config.gasPrice
        }
      );

      logger.info(`Sensor data submitted, transaction hash: ${tx.hash}`);
      return tx.hash;

    } catch (error) {
      logger.error('Error submitting sensor data to blockchain:', error);
      throw error;
    }
  }

  /**
   * Submit processed data to blockchain
   * @param processedData Processed sensor data
   * @returns Transaction hash
   */
  public async submitProcessedData(processedData: ProcessedData): Promise<string> {
    try {
      logger.info(`Submitting processed data to blockchain: ${processedData.sensorId}`);

      const tx = await this.contract.addProcessedData(
        processedData.sensorId,
        processedData.sensorType,
        processedData.value,
        processedData.qualityScore,
        processedData.processedAt,
        processedData.derivedMetrics || {},
        processedData.transformedData || {},
        {
          gasLimit: this.config.gasLimit || 250000,
          gasPrice: this.config.gasPrice
        }
      );

      logger.info(`Processed data submitted, transaction hash: ${tx.hash}`);
      return tx.hash;

    } catch (error) {
      logger.error('Error submitting processed data to blockchain:', error);
      throw error;
    }
  }

  /**
   * Submit alert to blockchain
   * @param alert Data alert
   * @returns Transaction hash
   */
  public async submitAlert(alert: DataAlert): Promise<string> {
    try {
      logger.info(`Submitting alert to blockchain: ${alert.sensorId}`);

      const tx = await this.contract.addAlert(
        alert.sensorId,
        alert.type,
        alert.severity,
        alert.message,
        alert.timestamp,
        alert.data || {},
        {
          gasLimit: this.config.gasLimit || 150000,
          gasPrice: this.config.gasPrice
        }
      );

      logger.info(`Alert submitted, transaction hash: ${tx.hash}`);
      return tx.hash;

    } catch (error) {
      logger.error('Error submitting alert to blockchain:', error);
      throw error;
    }
  }

  /**
   * Batch submit multiple sensor readings
   * @param sensorReadings Array of sensor readings
   * @returns Array of transaction hashes
   */
  public async batchSubmitSensorData(sensorReadings: SensorReading[]): Promise<string[]> {
    try {
      logger.info(`Batch submitting ${sensorReadings.length} sensor readings`);

      const txHashes: string[] = [];
      
      for (const reading of sensorReadings) {
        try {
          const txHash = await this.submitSensorData(reading);
          txHashes.push(txHash);
        } catch (error) {
          logger.error(`Error submitting sensor reading ${reading.sensorId}:`, error);
          // Continue with other readings
        }
      }

      logger.info(`Batch submission completed: ${txHashes.length}/${sensorReadings.length} successful`);
      return txHashes;

    } catch (error) {
      logger.error('Error in batch submission:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   * @param txHash Transaction hash
   * @returns Transaction status
   */
  public async getTransactionStatus(txHash: string): Promise<BlockchainTransaction> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return {
          hash: txHash,
          blockNumber: 0,
          gasUsed: '0',
          status: 'pending',
          timestamp: new Date().toISOString()
        };
      }

      return {
        hash: txHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting transaction status:', error);
      throw error;
    }
  }

  /**
   * Get sensor data from blockchain
   * @param sensorId Sensor ID
   * @param limit Number of records to retrieve
   * @returns Array of sensor data
   */
  public async getSensorData(sensorId: string, limit: number = 100): Promise<any[]> {
    try {
      logger.info(`Retrieving sensor data from blockchain: ${sensorId}`);

      const data = await this.contract.getSensorData(sensorId, limit);
      
      logger.info(`Retrieved ${data.length} sensor data records`);
      return data;

    } catch (error) {
      logger.error('Error retrieving sensor data from blockchain:', error);
      throw error;
    }
  }

  /**
   * Get alerts from blockchain
   * @param sensorId Sensor ID (optional)
   * @param limit Number of records to retrieve
   * @returns Array of alerts
   */
  public async getAlerts(sensorId?: string, limit: number = 100): Promise<any[]> {
    try {
      logger.info(`Retrieving alerts from blockchain: ${sensorId || 'all'}`);

      const alerts = await this.contract.getAlerts(sensorId || '', limit);
      
      logger.info(`Retrieved ${alerts.length} alert records`);
      return alerts;

    } catch (error) {
      logger.error('Error retrieving alerts from blockchain:', error);
      throw error;
    }
  }

  /**
   * Verify data integrity on blockchain
   * @param sensorId Sensor ID
   * @param timestamp Timestamp
   * @param value Sensor value
   * @returns True if data is verified
   */
  public async verifyDataIntegrity(
    sensorId: string,
    timestamp: string,
    value: any
  ): Promise<boolean> {
    try {
      logger.info(`Verifying data integrity: ${sensorId}`);

      const isVerified = await this.contract.verifyDataIntegrity(
        sensorId,
        timestamp,
        value
      );

      logger.info(`Data integrity verification result: ${isVerified}`);
      return isVerified;

    } catch (error) {
      logger.error('Error verifying data integrity:', error);
      return false;
    }
  }

  /**
   * Get blockchain network information
   * @returns Network information
   */
  public async getNetworkInfo(): Promise<any> {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const gasPrice = await this.provider.getGasPrice();

      return {
        chainId: network.chainId,
        name: network.name,
        blockNumber,
        gasPrice: gasPrice.toString(),
        rpcUrl: this.config.rpcUrl
      };

    } catch (error) {
      logger.error('Error getting network info:', error);
      throw error;
    }
  }

  /**
   * Estimate gas for transaction
   * @param method Contract method name
   * @param params Method parameters
   * @returns Estimated gas
   */
  public async estimateGas(method: string, params: any[]): Promise<string> {
    try {
      const gasEstimate = await this.contract.estimateGas[method](...params);
      return gasEstimate.toString();

    } catch (error) {
      logger.error('Error estimating gas:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   * @returns Wallet balance in ETH
   */
  public async getBalance(): Promise<string> {
    try {
      const balance = await this.wallet.getBalance();
      return ethers.utils.formatEther(balance);

    } catch (error) {
      logger.error('Error getting wallet balance:', error);
      throw error;
    }
  }

  /**
   * Check if wallet has sufficient balance
   * @param requiredAmount Required amount in ETH
   * @returns True if sufficient balance
   */
  public async hasSufficientBalance(requiredAmount: string): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      const required = parseFloat(requiredAmount);
      const current = parseFloat(balance);

      return current >= required;

    } catch (error) {
      logger.error('Error checking balance:', error);
      return false;
    }
  }

  /**
   * Disconnect from blockchain
   */
  public async disconnect(): Promise<void> {
    try {
      // Clean up connections
      logger.info('Disconnecting from blockchain');
    } catch (error) {
      logger.error('Error disconnecting from blockchain:', error);
    }
  }
}
