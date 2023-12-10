import { SensorDataCollector } from './sensors/SensorDataCollector';
import { DataProcessor } from './processors/DataProcessor';
import { BlockchainConnector } from './connectors/BlockchainConnector';
import { IPFSConnector } from './connectors/IPFSConnector';
import { SensorSimulator } from './simulators/SensorSimulator';
import { logger } from './utils/logger';

class ChainTraceIoTModule {
  private sensorCollector: SensorDataCollector;
  private dataProcessor: DataProcessor;
  private blockchainConnector: BlockchainConnector;
  private ipfsConnector: IPFSConnector;
  private sensorSimulator: SensorSimulator;
  private isRunning: boolean = false;

  constructor() {
    this.sensorCollector = new SensorDataCollector();
    this.dataProcessor = new DataProcessor();
    this.blockchainConnector = new BlockchainConnector({
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://localhost:8545',
      privateKey: process.env.PRIVATE_KEY || '',
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      contractABI: [] // Would be loaded from contract
    });
    this.ipfsConnector = new IPFSConnector();
    this.sensorSimulator = new SensorSimulator();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Sensor data collection events
    this.sensorCollector.on('sensorData', (reading) => {
      this.dataProcessor.addToQueue(reading);
    });

    this.sensorCollector.on('sensorAlert', (alert) => {
      this.handleSensorAlert(alert);
    });

    // Data processing events
    this.dataProcessor.on('processedData', (processedData) => {
      this.handleProcessedData(processedData);
    });

    this.dataProcessor.on('alertGenerated', (alerts) => {
      this.handleDataAlerts(alerts);
    });
  }

  private async handleProcessedData(processedData: any): Promise<void> {
    try {
      // Upload to IPFS
      const ipfsHash = await this.ipfsConnector.uploadProcessedData(processedData);
      
      // Submit to blockchain
      await this.blockchainConnector.submitProcessedData(processedData);
      
      logger.info(`Processed data handled: ${processedData.sensorId} - IPFS: ${ipfsHash}`);
    } catch (error) {
      logger.error('Error handling processed data:', error);
    }
  }

  private async handleSensorAlert(alert: any): Promise<void> {
    try {
      // Upload alert to IPFS
      const ipfsHash = await this.ipfsConnector.uploadAlert(alert);
      
      // Submit alert to blockchain
      await this.blockchainConnector.submitAlert(alert);
      
      logger.warn(`Sensor alert handled: ${alert.sensorId} - IPFS: ${ipfsHash}`);
    } catch (error) {
      logger.error('Error handling sensor alert:', error);
    }
  }

  private async handleDataAlerts(alerts: any[]): Promise<void> {
    for (const alert of alerts) {
      await this.handleSensorAlert(alert);
    }
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting ChainTrace IoT Module...');

      // Connect to MQTT broker
      await this.sensorCollector.connect();

      // Start data processing
      this.dataProcessor.startProcessing();

      // Start sensor simulation (for testing)
      if (process.env.NODE_ENV === 'development') {
        this.sensorSimulator.startSimulation();
      }

      this.isRunning = true;
      logger.info('ChainTrace IoT Module started successfully');

    } catch (error) {
      logger.error('Failed to start IoT module:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      logger.info('Stopping ChainTrace IoT Module...');

      // Stop sensor simulation
      this.sensorSimulator.stopSimulation();

      // Stop data processing
      this.dataProcessor.stopProcessing();

      // Disconnect from MQTT
      await this.sensorCollector.disconnect();

      // Disconnect from blockchain
      await this.blockchainConnector.disconnect();

      // Disconnect from IPFS
      await this.ipfsConnector.disconnect();

      this.isRunning = false;
      logger.info('ChainTrace IoT Module stopped successfully');

    } catch (error) {
      logger.error('Error stopping IoT module:', error);
    }
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      sensorCollector: this.sensorCollector.isMQTTConnected(),
      dataProcessor: this.dataProcessor.getStats(),
      sensorSimulator: this.sensorSimulator.getStatus(),
      blockchain: this.blockchainConnector.getNetworkInfo(),
      ipfs: this.ipfsConnector.checkHealth()
    };
  }
}

// Start the IoT module if this file is run directly
if (require.main === module) {
  const iotModule = new ChainTraceIoTModule();
  
  iotModule.start().catch((error) => {
    logger.error('Failed to start IoT module:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await iotModule.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await iotModule.stop();
    process.exit(0);
  });
}

export default ChainTraceIoTModule;
