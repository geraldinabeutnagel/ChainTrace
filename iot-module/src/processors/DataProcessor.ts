import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { SensorReading, ProcessedData, DataAlert } from '../types/sensor';

export class DataProcessor extends EventEmitter {
  private processingQueue: SensorReading[] = [];
  private isProcessing: boolean = false;
  private batchSize: number = 100;
  private processingInterval: number = 5000; // 5 seconds
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupEventHandlers();
    this.startProcessing();
  }

  private setupEventHandlers(): void {
    this.on('dataProcessed', this.handleProcessedData.bind(this));
    this.on('alertGenerated', this.handleAlert.bind(this));
  }

  /**
   * Add sensor reading to processing queue
   * @param reading Sensor reading data
   */
  public addToQueue(reading: SensorReading): void {
    this.processingQueue.push(reading);
    
    // Process immediately if queue is full
    if (this.processingQueue.length >= this.batchSize) {
      this.processQueue();
    }
  }

  /**
   * Start automatic processing
   */
  private startProcessing(): void {
    this.intervalId = setInterval(() => {
      if (this.processingQueue.length > 0 && !this.isProcessing) {
        this.processQueue();
      }
    }, this.processingInterval);
  }

  /**
   * Stop automatic processing
   */
  public stopProcessing(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Process queued sensor readings
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = this.processingQueue.splice(0, this.batchSize);

    try {
      logger.info(`Processing batch of ${batch.length} sensor readings`);
      
      const processedBatch = await Promise.all(
        batch.map(reading => this.processSensorReading(reading))
      );

      // Emit processed data
      this.emit('dataProcessed', processedBatch);

      // Check for alerts
      const alerts = this.checkForAlerts(processedBatch);
      if (alerts.length > 0) {
        this.emit('alertGenerated', alerts);
      }

    } catch (error) {
      logger.error('Error processing sensor readings batch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual sensor reading
   * @param reading Sensor reading
   * @returns Processed data
   */
  private async processSensorReading(reading: SensorReading): Promise<ProcessedData> {
    try {
      // Validate reading
      this.validateReading(reading);

      // Calculate derived metrics
      const derivedMetrics = this.calculateDerivedMetrics(reading);

      // Apply data transformations
      const transformedData = this.applyTransformations(reading);

      // Generate quality score
      const qualityScore = this.calculateQualityScore(reading);

      const processedData: ProcessedData = {
        ...reading,
        derivedMetrics,
        transformedData,
        qualityScore,
        processedAt: new Date().toISOString(),
        processingVersion: '1.0.0'
      };

      return processedData;

    } catch (error) {
      logger.error('Error processing sensor reading:', error);
      throw error;
    }
  }

  /**
   * Validate sensor reading
   * @param reading Sensor reading
   */
  private validateReading(reading: SensorReading): void {
    if (!reading.sensorId || reading.sensorId.length === 0) {
      throw new Error('Invalid sensor ID');
    }

    if (!reading.sensorType || reading.sensorType.length === 0) {
      throw new Error('Invalid sensor type');
    }

    if (reading.value === null || reading.value === undefined) {
      throw new Error('Invalid sensor value');
    }

    if (!reading.timestamp) {
      throw new Error('Invalid timestamp');
    }

    // Type-specific validation
    switch (reading.sensorType) {
      case 'temperature':
        if (typeof reading.value !== 'number' || reading.value < -50 || reading.value > 150) {
          throw new Error('Invalid temperature value');
        }
        break;
      case 'humidity':
        if (typeof reading.value !== 'number' || reading.value < 0 || reading.value > 100) {
          throw new Error('Invalid humidity value');
        }
        break;
      case 'pressure':
        if (typeof reading.value !== 'number' || reading.value < 0 || reading.value > 2000) {
          throw new Error('Invalid pressure value');
        }
        break;
      case 'location':
        if (typeof reading.value !== 'object' || 
            typeof reading.value.latitude !== 'number' || 
            typeof reading.value.longitude !== 'number') {
          throw new Error('Invalid location value');
        }
        break;
    }
  }

  /**
   * Calculate derived metrics from sensor reading
   * @param reading Sensor reading
   * @returns Derived metrics
   */
  private calculateDerivedMetrics(reading: SensorReading): any {
    const metrics: any = {};

    switch (reading.sensorType) {
      case 'temperature':
        metrics.celsius = reading.value;
        metrics.fahrenheit = (reading.value * 9/5) + 32;
        metrics.kelvin = reading.value + 273.15;
        break;
      case 'humidity':
        metrics.relativeHumidity = reading.value;
        metrics.dewPoint = this.calculateDewPoint(reading.value, 20); // Assuming 20°C ambient
        break;
      case 'pressure':
        metrics.pascal = reading.value;
        metrics.bar = reading.value / 100000;
        metrics.atmosphere = reading.value / 101325;
        break;
      case 'location':
        metrics.latitude = reading.value.latitude;
        metrics.longitude = reading.value.longitude;
        metrics.accuracy = reading.value.accuracy || 'unknown';
        break;
    }

    return metrics;
  }

  /**
   * Apply data transformations
   * @param reading Sensor reading
   * @returns Transformed data
   */
  private applyTransformations(reading: SensorReading): any {
    const transformed: any = {
      originalValue: reading.value,
      normalizedValue: this.normalizeValue(reading),
      timestamp: new Date(reading.timestamp).getTime(),
      sensorId: reading.sensorId.toUpperCase(),
      sensorType: reading.sensorType.toLowerCase()
    };

    // Apply smoothing if needed
    if (this.shouldApplySmoothing(reading)) {
      transformed.smoothedValue = this.applySmoothing(reading);
    }

    return transformed;
  }

  /**
   * Calculate quality score for sensor reading
   * @param reading Sensor reading
   * @returns Quality score (0-100)
   */
  private calculateQualityScore(reading: SensorReading): number {
    let score = 100;

    // Check timestamp freshness
    const age = Date.now() - new Date(reading.timestamp).getTime();
    if (age > 300000) { // 5 minutes
      score -= 20;
    }

    // Check value reasonableness
    if (this.isValueReasonable(reading)) {
      score -= 10;
    }

    // Check metadata completeness
    if (!reading.metadata || Object.keys(reading.metadata).length === 0) {
      score -= 5;
    }

    return Math.max(0, score);
  }

  /**
   * Check for alerts in processed data
   * @param processedData Array of processed data
   * @returns Array of alerts
   */
  private checkForAlerts(processedData: ProcessedData[]): DataAlert[] {
    const alerts: DataAlert[] = [];

    for (const data of processedData) {
      // Check quality score
      if (data.qualityScore < 70) {
        alerts.push({
          type: 'QUALITY_LOW',
          severity: 'medium',
          sensorId: data.sensorId,
          message: `Low quality score: ${data.qualityScore}`,
          timestamp: data.timestamp,
          data: data
        });
      }

      // Check for anomalies
      if (this.isAnomaly(data)) {
        alerts.push({
          type: 'ANOMALY_DETECTED',
          severity: 'high',
          sensorId: data.sensorId,
          message: 'Anomalous reading detected',
          timestamp: data.timestamp,
          data: data
        });
      }
    }

    return alerts;
  }

  /**
   * Normalize sensor value
   * @param reading Sensor reading
   * @returns Normalized value
   */
  private normalizeValue(reading: SensorReading): number {
    switch (reading.sensorType) {
      case 'temperature':
        return (reading.value + 50) / 200; // Normalize to 0-1 range
      case 'humidity':
        return reading.value / 100; // Already 0-1
      case 'pressure':
        return reading.value / 2000; // Normalize to 0-1 range
      default:
        return typeof reading.value === 'number' ? reading.value : 0;
    }
  }

  /**
   * Check if smoothing should be applied
   * @param reading Sensor reading
   * @returns True if smoothing should be applied
   */
  private shouldApplySmoothing(reading: SensorReading): boolean {
    return reading.sensorType === 'temperature' || reading.sensorType === 'humidity';
  }

  /**
   * Apply smoothing to sensor value
   * @param reading Sensor reading
   * @returns Smoothed value
   */
  private applySmoothing(reading: SensorReading): number {
    // Simple moving average (would need historical data for real implementation)
    return reading.value as number;
  }

  /**
   * Check if value is reasonable
   * @param reading Sensor reading
   * @returns True if value is reasonable
   */
  private isValueReasonable(reading: SensorReading): boolean {
    // This would implement domain-specific reasonableness checks
    return true;
  }

  /**
   * Check if reading is an anomaly
   * @param data Processed data
   * @returns True if anomaly detected
   */
  private isAnomaly(data: ProcessedData): boolean {
    // This would implement anomaly detection algorithms
    return false;
  }

  /**
   * Calculate dew point
   * @param humidity Relative humidity percentage
   * @param temperature Temperature in Celsius
   * @returns Dew point in Celsius
   */
  private calculateDewPoint(humidity: number, temperature: number): number {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
  }

  /**
   * Handle processed data
   * @param processedData Array of processed data
   */
  private handleProcessedData(processedData: ProcessedData[]): void {
    logger.info(`Processed ${processedData.length} sensor readings`);
    // This would typically send to database or blockchain
  }

  /**
   * Handle generated alerts
   * @param alerts Array of alerts
   */
  private handleAlert(alerts: DataAlert[]): void {
    logger.warn(`Generated ${alerts.length} alerts`);
    // This would typically send notifications or store alerts
  }

  /**
   * Get processing statistics
   * @returns Processing statistics
   */
  public getStats(): any {
    return {
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
      batchSize: this.batchSize,
      processingInterval: this.processingInterval
    };
  }
}
