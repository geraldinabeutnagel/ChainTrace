import { MongoClient, Db, Collection } from 'mongodb';
import { SensorReading, ProcessedData, DataAlert } from '../types/sensor';
import { logger } from '../utils/logger';

export interface DatabaseConfig {
  connectionString: string;
  databaseName: string;
  collections: {
    sensorReadings: string;
    processedData: string;
    alerts: string;
    metadata: string;
  };
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
  };
}

export class DatabaseConnector {
  private client: MongoClient;
  private db: Db;
  private config: DatabaseConfig;
  private isConnected: boolean = false;

  // Collections
  private sensorReadingsCollection: Collection<SensorReading>;
  private processedDataCollection: Collection<ProcessedData>;
  private alertsCollection: Collection<DataAlert>;
  private metadataCollection: Collection<any>;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.client = new MongoClient(config.connectionString, config.options);
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(this.config.databaseName);
      
      // Initialize collections
      this.sensorReadingsCollection = this.db.collection(this.config.collections.sensorReadings);
      this.processedDataCollection = this.db.collection(this.config.collections.processedData);
      this.alertsCollection = this.db.collection(this.config.collections.alerts);
      this.metadataCollection = this.db.collection(this.config.collections.metadata);

      // Create indexes for better performance
      await this.createIndexes();

      this.isConnected = true;
      logger.info('Connected to database successfully', {
        database: this.config.databaseName,
        collections: Object.values(this.config.collections)
      });
    } catch (error) {
      logger.error('Failed to connect to database', { error: error.message });
      throw error;
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      this.isConnected = false;
      logger.info('Disconnected from database');
    } catch (error) {
      logger.error('Error disconnecting from database', { error: error.message });
      throw error;
    }
  }

  /**
   * Create database indexes
   */
  private async createIndexes(): Promise<void> {
    try {
      // Sensor readings indexes
      await this.sensorReadingsCollection.createIndex({ sensorId: 1, timestamp: -1 });
      await this.sensorReadingsCollection.createIndex({ sensorType: 1, timestamp: -1 });
      await this.sensorReadingsCollection.createIndex({ timestamp: -1 });

      // Processed data indexes
      await this.processedDataCollection.createIndex({ sensorId: 1, processedAt: -1 });
      await this.processedDataCollection.createIndex({ qualityScore: 1 });
      await this.processedDataCollection.createIndex({ processedAt: -1 });

      // Alerts indexes
      await this.alertsCollection.createIndex({ sensorId: 1, timestamp: -1 });
      await this.alertsCollection.createIndex({ type: 1, severity: 1 });
      await this.alertsCollection.createIndex({ timestamp: -1 });

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Failed to create database indexes', { error: error.message });
      throw error;
    }
  }

  /**
   * Store sensor reading
   */
  async storeSensorReading(reading: SensorReading): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.sensorReadingsCollection.insertOne(reading);
      logger.debug('Sensor reading stored', { 
        sensorId: reading.sensorId, 
        documentId: result.insertedId 
      });
      return result.insertedId.toString();
    } catch (error) {
      logger.error('Failed to store sensor reading', { 
        sensorId: reading.sensorId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Store processed data
   */
  async storeProcessedData(data: ProcessedData): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.processedDataCollection.insertOne(data);
      logger.debug('Processed data stored', { 
        sensorId: data.sensorId, 
        documentId: result.insertedId 
      });
      return result.insertedId.toString();
    } catch (error) {
      logger.error('Failed to store processed data', { 
        sensorId: data.sensorId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Store alert
   */
  async storeAlert(alert: DataAlert): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.alertsCollection.insertOne(alert);
      logger.debug('Alert stored', { 
        sensorId: alert.sensorId, 
        type: alert.type,
        documentId: result.insertedId 
      });
      return result.insertedId.toString();
    } catch (error) {
      logger.error('Failed to store alert', { 
        sensorId: alert.sensorId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get sensor readings by sensor ID
   */
  async getSensorReadings(
    sensorId: string, 
    limit: number = 100, 
    offset: number = 0
  ): Promise<SensorReading[]> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const readings = await this.sensorReadingsCollection
        .find({ sensorId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(offset)
        .toArray();

      logger.debug('Sensor readings retrieved', { 
        sensorId, 
        count: readings.length 
      });
      return readings;
    } catch (error) {
      logger.error('Failed to get sensor readings', { 
        sensorId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get processed data by sensor ID
   */
  async getProcessedData(
    sensorId: string, 
    limit: number = 100, 
    offset: number = 0
  ): Promise<ProcessedData[]> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const data = await this.processedDataCollection
        .find({ sensorId })
        .sort({ processedAt: -1 })
        .limit(limit)
        .skip(offset)
        .toArray();

      logger.debug('Processed data retrieved', { 
        sensorId, 
        count: data.length 
      });
      return data;
    } catch (error) {
      logger.error('Failed to get processed data', { 
        sensorId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get alerts by sensor ID
   */
  async getAlerts(
    sensorId: string, 
    limit: number = 100, 
    offset: number = 0
  ): Promise<DataAlert[]> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const alerts = await this.alertsCollection
        .find({ sensorId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(offset)
        .toArray();

      logger.debug('Alerts retrieved', { 
        sensorId, 
        count: alerts.length 
      });
      return alerts;
    } catch (error) {
      logger.error('Failed to get alerts', { 
        sensorId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get data statistics
   */
  async getDataStatistics(sensorId?: string): Promise<{
    totalReadings: number;
    totalProcessedData: number;
    totalAlerts: number;
    averageQualityScore: number;
  }> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const filter = sensorId ? { sensorId } : {};

      const [totalReadings, totalProcessedData, totalAlerts, avgQuality] = await Promise.all([
        this.sensorReadingsCollection.countDocuments(filter),
        this.processedDataCollection.countDocuments(filter),
        this.alertsCollection.countDocuments(filter),
        this.processedDataCollection.aggregate([
          { $match: filter },
          { $group: { _id: null, avgQuality: { $avg: '$qualityScore' } } }
        ]).toArray()
      ]);

      const averageQualityScore = avgQuality.length > 0 ? avgQuality[0].avgQuality : 0;

      logger.debug('Data statistics retrieved', { 
        sensorId, 
        totalReadings, 
        totalProcessedData, 
        totalAlerts, 
        averageQualityScore 
      });

      return {
        totalReadings,
        totalProcessedData,
        totalAlerts,
        averageQualityScore
      };
    } catch (error) {
      logger.error('Failed to get data statistics', { 
        sensorId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Clean old data
   */
  async cleanOldData(olderThanDays: number = 30): Promise<{
    deletedReadings: number;
    deletedProcessedData: number;
    deletedAlerts: number;
  }> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const [deletedReadings, deletedProcessedData, deletedAlerts] = await Promise.all([
        this.sensorReadingsCollection.deleteMany({ timestamp: { $lt: cutoffDate } }),
        this.processedDataCollection.deleteMany({ processedAt: { $lt: cutoffDate } }),
        this.alertsCollection.deleteMany({ timestamp: { $lt: cutoffDate } })
      ]);

      logger.info('Old data cleaned', { 
        deletedReadings: deletedReadings.deletedCount,
        deletedProcessedData: deletedProcessedData.deletedCount,
        deletedAlerts: deletedAlerts.deletedCount,
        cutoffDate 
      });

      return {
        deletedReadings: deletedReadings.deletedCount,
        deletedProcessedData: deletedProcessedData.deletedCount,
        deletedAlerts: deletedAlerts.deletedCount
      };
    } catch (error) {
      logger.error('Failed to clean old data', { error: error.message });
      throw error;
    }
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<{
    connected: boolean;
    collections: string[];
    stats: any;
  }> {
    try {
      const collections = await this.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      const stats = await this.db.stats();

      return {
        connected: this.isConnected,
        collections: collectionNames,
        stats
      };
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      return {
        connected: false,
        collections: [],
        stats: null
      };
    }
  }
}
