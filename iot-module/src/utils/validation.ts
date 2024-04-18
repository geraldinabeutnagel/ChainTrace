import { SensorReading, ProcessedData, DataAlert } from '../types/sensor';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SensorDataValidator {
  /**
   * Validate sensor reading data
   * @param reading Sensor reading
   * @throws ValidationError if validation fails
   */
  static validateSensorReading(reading: SensorReading): void {
    if (!reading.sensorId || reading.sensorId.length === 0) {
      throw new ValidationError('Sensor ID is required');
    }

    if (!reading.sensorType || reading.sensorType.length === 0) {
      throw new ValidationError('Sensor type is required');
    }

    if (reading.value === null || reading.value === undefined) {
      throw new ValidationError('Sensor value is required');
    }

    if (!reading.timestamp) {
      throw new ValidationError('Timestamp is required');
    }

    // Validate timestamp format
    if (isNaN(Date.parse(reading.timestamp))) {
      throw new ValidationError('Invalid timestamp format');
    }

    // Type-specific validation
    switch (reading.sensorType) {
      case 'temperature':
        if (typeof reading.value !== 'number' || reading.value < -50 || reading.value > 150) {
          throw new ValidationError('Invalid temperature value (must be between -50 and 150)');
        }
        break;
      case 'humidity':
        if (typeof reading.value !== 'number' || reading.value < 0 || reading.value > 100) {
          throw new ValidationError('Invalid humidity value (must be between 0 and 100)');
        }
        break;
      case 'pressure':
        if (typeof reading.value !== 'number' || reading.value < 0 || reading.value > 2000) {
          throw new ValidationError('Invalid pressure value (must be between 0 and 2000)');
        }
        break;
      case 'light':
        if (typeof reading.value !== 'number' || reading.value < 0) {
          throw new ValidationError('Invalid light value (must be non-negative)');
        }
        break;
      case 'vibration':
        if (typeof reading.value !== 'number' || reading.value < 0) {
          throw new ValidationError('Invalid vibration value (must be non-negative)');
        }
        break;
      case 'location':
        if (typeof reading.value !== 'object' || 
            typeof reading.value.latitude !== 'number' || 
            typeof reading.value.longitude !== 'number') {
          throw new ValidationError('Invalid location value (must have latitude and longitude)');
        }
        if (reading.value.latitude < -90 || reading.value.latitude > 90) {
          throw new ValidationError('Invalid latitude (must be between -90 and 90)');
        }
        if (reading.value.longitude < -180 || reading.value.longitude > 180) {
          throw new ValidationError('Invalid longitude (must be between -180 and 180)');
        }
        break;
      default:
        throw new ValidationError(`Unknown sensor type: ${reading.sensorType}`);
    }
  }

  /**
   * Validate processed data
   * @param data Processed data
   * @throws ValidationError if validation fails
   */
  static validateProcessedData(data: ProcessedData): void {
    // Validate base sensor reading
    this.validateSensorReading(data);

    if (typeof data.qualityScore !== 'number' || data.qualityScore < 0 || data.qualityScore > 100) {
      throw new ValidationError('Invalid quality score (must be between 0 and 100)');
    }

    if (!data.processedAt) {
      throw new ValidationError('Processed timestamp is required');
    }

    if (isNaN(Date.parse(data.processedAt))) {
      throw new ValidationError('Invalid processed timestamp format');
    }

    if (!data.processingVersion || data.processingVersion.length === 0) {
      throw new ValidationError('Processing version is required');
    }
  }

  /**
   * Validate data alert
   * @param alert Data alert
   * @throws ValidationError if validation fails
   */
  static validateDataAlert(alert: DataAlert): void {
    if (!alert.sensorId || alert.sensorId.length === 0) {
      throw new ValidationError('Sensor ID is required');
    }

    if (!alert.type || alert.type.length === 0) {
      throw new ValidationError('Alert type is required');
    }

    if (!alert.severity || !['low', 'medium', 'high', 'critical'].includes(alert.severity)) {
      throw new ValidationError('Invalid alert severity (must be low, medium, high, or critical)');
    }

    if (!alert.message || alert.message.length === 0) {
      throw new ValidationError('Alert message is required');
    }

    if (!alert.timestamp) {
      throw new ValidationError('Alert timestamp is required');
    }

    if (isNaN(Date.parse(alert.timestamp))) {
      throw new ValidationError('Invalid alert timestamp format');
    }
  }

  /**
   * Validate sensor ID format
   * @param sensorId Sensor ID
   * @throws ValidationError if validation fails
   */
  static validateSensorId(sensorId: string): void {
    if (!sensorId || sensorId.length === 0) {
      throw new ValidationError('Sensor ID is required');
    }

    if (sensorId.length > 50) {
      throw new ValidationError('Sensor ID is too long (max 50 characters)');
    }

    // Check for valid characters (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(sensorId)) {
      throw new ValidationError('Sensor ID contains invalid characters (only alphanumeric, underscore, and hyphen allowed)');
    }
  }

  /**
   * Validate timestamp format
   * @param timestamp Timestamp string
   * @throws ValidationError if validation fails
   */
  static validateTimestamp(timestamp: string): void {
    if (!timestamp) {
      throw new ValidationError('Timestamp is required');
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid timestamp format');
    }

    // Check if timestamp is not too far in the future (more than 1 hour)
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff > 3600000) { // 1 hour in milliseconds
      throw new ValidationError('Timestamp cannot be more than 1 hour in the future');
    }

    // Check if timestamp is not too far in the past (more than 30 days)
    if (diff < -2592000000) { // 30 days in milliseconds
      throw new ValidationError('Timestamp cannot be more than 30 days in the past');
    }
  }

  /**
   * Validate location data
   * @param location Location object
   * @throws ValidationError if validation fails
   */
  static validateLocation(location: { latitude: number; longitude: number; accuracy?: number }): void {
    if (typeof location.latitude !== 'number' || location.latitude < -90 || location.latitude > 90) {
      throw new ValidationError('Invalid latitude (must be between -90 and 90)');
    }

    if (typeof location.longitude !== 'number' || location.longitude < -180 || location.longitude > 180) {
      throw new ValidationError('Invalid longitude (must be between -180 and 180)');
    }

    if (location.accuracy !== undefined) {
      if (typeof location.accuracy !== 'number' || location.accuracy < 0) {
        throw new ValidationError('Invalid accuracy (must be non-negative)');
      }
    }
  }

  /**
   * Validate metadata object
   * @param metadata Metadata object
   * @throws ValidationError if validation fails
   */
  static validateMetadata(metadata: Record<string, any>): void {
    if (metadata === null || typeof metadata !== 'object') {
      throw new ValidationError('Metadata must be an object');
    }

    // Check for circular references
    try {
      JSON.stringify(metadata);
    } catch (error) {
      throw new ValidationError('Metadata contains circular references');
    }

    // Check metadata size (max 1MB)
    const metadataSize = JSON.stringify(metadata).length;
    if (metadataSize > 1048576) { // 1MB in bytes
      throw new ValidationError('Metadata is too large (max 1MB)');
    }
  }
}
