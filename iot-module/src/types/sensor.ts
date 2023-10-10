export interface SensorReading {
  sensorId: string;
  sensorType: 'temperature' | 'humidity' | 'pressure' | 'light' | 'vibration' | 'location';
  value: number | object;
  unit?: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  metadata?: Record<string, any>;
}

export interface ProcessedData extends SensorReading {
  derivedMetrics?: Record<string, any>;
  transformedData?: Record<string, any>;
  qualityScore: number;
  processedAt: string;
  processingVersion: string;
}

export interface DataAlert {
  sensorId: string;
  type: 'QUALITY_LOW' | 'ANOMALY_DETECTED' | 'THRESHOLD_EXCEEDED' | 'SENSOR_OFFLINE';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  data?: Record<string, any>;
}

export interface SensorConfig {
  id: string;
  type: string;
  location: {
    latitude: number;
    longitude: number;
  };
  thresholds?: {
    temperature?: { min: number; max: number };
    humidity?: { min: number; max: number };
    pressure?: { min: number; max: number };
    light?: { min: number; max: number };
    vibration?: { min: number; max: number };
  };
  metadata?: Record<string, any>;
  status: 'online' | 'offline';
  lastSeen?: string;
}

export interface IoTDevice {
  deviceId: string;
  deviceType: 'sensor' | 'gateway' | 'controller';
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  sensors: SensorConfig[];
  status: 'active' | 'inactive' | 'maintenance';
  lastHeartbeat: string;
  batteryLevel?: number;
  signalStrength?: number;
}

export interface SensorDataBatch {
  batchId: string;
  deviceId: string;
  sensorReadings: SensorReading[];
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;
}

export interface SensorAnalytics {
  sensorId: string;
  timeRange: {
    start: string;
    end: string;
  };
  statistics: {
    count: number;
    average: number;
    min: number;
    max: number;
    standardDeviation: number;
  };
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number;
  };
  anomalies: DataAlert[];
}

export interface SensorCalibration {
  sensorId: string;
  calibrationDate: string;
  calibrationType: 'factory' | 'field' | 'maintenance';
  calibrationData: {
    offset: number;
    scale: number;
    accuracy: number;
  };
  validUntil: string;
  performedBy: string;
}

export interface SensorMaintenance {
  sensorId: string;
  maintenanceDate: string;
  maintenanceType: 'cleaning' | 'calibration' | 'repair' | 'replacement';
  description: string;
  performedBy: string;
  nextMaintenanceDate: string;
  cost?: number;
}
