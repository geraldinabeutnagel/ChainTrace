import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { SensorReading, ProcessedData, DataAlert } from '../types/sensor';
import { logger } from '../utils/logger';

export interface APIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  apiKey?: string;
  headers?: Record<string, string>;
  auth?: {
    username: string;
    password: string;
  };
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
}

export class APIConnector {
  private client: AxiosInstance;
  private config: APIConfig;
  private isConnected: boolean = false;

  constructor(config: APIConfig) {
    this.config = config;
    this.client = this.createClient();
  }

  private createClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ChainTrace-IoT-Module/1.0',
        ...this.config.headers
      }
    });

    // Add API key if provided
    if (this.config.apiKey) {
      client.defaults.headers.common['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // Add basic auth if provided
    if (this.config.auth) {
      client.defaults.auth = this.config.auth;
    }

    // Add request interceptor
    client.interceptors.request.use(
      (config) => {
        logger.debug('API request', {
          method: config.method,
          url: config.url,
          baseURL: config.baseURL
        });
        return config;
      },
      (error) => {
        logger.error('API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor
    client.interceptors.response.use(
      (response) => {
        logger.debug('API response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.error('API response error', { 
          error: error.message,
          status: error.response?.status,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );

    return client;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      this.isConnected = response.status === 200;
      
      logger.info('API connection test', {
        success: this.isConnected,
        status: response.status
      });
      
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      logger.error('API connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Send sensor reading to API
   */
  async sendSensorReading(reading: SensorReading): Promise<APIResponse> {
    try {
      const response = await this.client.post('/sensor-readings', reading);
      
      logger.debug('Sensor reading sent', {
        sensorId: reading.sensorId,
        sensorType: reading.sensorType,
        status: response.status
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to send sensor reading', {
        sensorId: reading.sensorId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        code: 'SENSOR_READING_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send processed data to API
   */
  async sendProcessedData(data: ProcessedData): Promise<APIResponse> {
    try {
      const response = await this.client.post('/processed-data', data);
      
      logger.debug('Processed data sent', {
        sensorId: data.sensorId,
        qualityScore: data.qualityScore,
        status: response.status
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to send processed data', {
        sensorId: data.sensorId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        code: 'PROCESSED_DATA_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send alert to API
   */
  async sendAlert(alert: DataAlert): Promise<APIResponse> {
    try {
      const response = await this.client.post('/alerts', alert);
      
      logger.debug('Alert sent', {
        sensorId: alert.sensorId,
        type: alert.type,
        severity: alert.severity,
        status: response.status
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to send alert', {
        sensorId: alert.sensorId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        code: 'ALERT_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Batch send sensor readings
   */
  async sendBatchReadings(readings: SensorReading[]): Promise<APIResponse> {
    try {
      const response = await this.client.post('/sensor-readings/batch', {
        readings,
        count: readings.length,
        timestamp: new Date().toISOString()
      });
      
      logger.debug('Batch sensor readings sent', {
        count: readings.length,
        status: response.status
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to send batch readings', {
        count: readings.length,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        code: 'BATCH_READINGS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get sensor configuration from API
   */
  async getSensorConfig(sensorId: string): Promise<APIResponse> {
    try {
      const response = await this.client.get(`/sensors/${sensorId}/config`);
      
      logger.debug('Sensor config retrieved', {
        sensorId,
        status: response.status
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get sensor config', {
        sensorId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        code: 'SENSOR_CONFIG_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Update sensor configuration
   */
  async updateSensorConfig(sensorId: string, config: any): Promise<APIResponse> {
    try {
      const response = await this.client.put(`/sensors/${sensorId}/config`, config);
      
      logger.debug('Sensor config updated', {
        sensorId,
        status: response.status
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to update sensor config', {
        sensorId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        code: 'SENSOR_CONFIG_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send heartbeat to API
   */
  async sendHeartbeat(sensorId: string, status: string): Promise<APIResponse> {
    try {
      const response = await this.client.post('/heartbeat', {
        sensorId,
        status,
        timestamp: new Date().toISOString()
      });
      
      logger.debug('Heartbeat sent', {
        sensorId,
        status,
        responseStatus: response.status
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to send heartbeat', {
        sensorId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        code: 'HEARTBEAT_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Retry failed request
   */
  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    attempt: number = 1
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        logger.warn(`Retrying request (attempt ${attempt + 1})`, {
          error: error.message
        });
        
        await this.delay(this.config.retryDelay * attempt);
        return this.retryRequest(requestFn, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update API configuration
   */
  updateConfig(newConfig: Partial<APIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.client = this.createClient();
    logger.info('API configuration updated');
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get API configuration
   */
  getConfig(): APIConfig {
    return { ...this.config };
  }
}
