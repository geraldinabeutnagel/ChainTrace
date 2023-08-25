import mqtt from 'mqtt';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { SensorData, SensorConfig, SensorReading } from '../types/sensor';

export class SensorDataCollector extends EventEmitter {
  private mqttClient: mqtt.MqttClient | null = null;
  private sensors: Map<string, SensorConfig> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('sensorData', this.processSensorData.bind(this));
    this.on('sensorAlert', this.handleSensorAlert.bind(this));
    this.on('sensorOffline', this.handleSensorOffline.bind(this));
  }

  public async connect(): Promise<void> {
    try {
      const mqttOptions: mqtt.IClientOptions = {
        host: process.env.IOT_MQTT_BROKER || 'mqtt://localhost:1883',
        username: process.env.IOT_MQTT_USERNAME,
        password: process.env.IOT_MQTT_PASSWORD,
        clientId: `chaintrace-collector-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        keepalive: 60,
      };

      this.mqttClient = mqtt.connect(mqttOptions);

      this.mqttClient.on('connect', () => {
        logger.info('MQTT client connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToSensorTopics();
      });

      this.mqttClient.on('error', (error) => {
        logger.error('MQTT client error:', error);
        this.isConnected = false;
      });

      this.mqttClient.on('close', () => {
        logger.warn('MQTT client connection closed');
        this.isConnected = false;
        this.handleReconnection();
      });

      this.mqttClient.on('message', (topic, message) => {
        this.handleMQTTMessage(topic, message);
      });

    } catch (error) {
      logger.error('Failed to connect to MQTT broker:', error);
      throw error;
    }
  }

  private subscribeToSensorTopics(): void {
    if (!this.mqttClient) return;

    // Subscribe to all sensor topics
    const topics = [
      'sensors/+/temperature',
      'sensors/+/humidity',
      'sensors/+/location',
      'sensors/+/pressure',
      'sensors/+/light',
      'sensors/+/vibration',
      'sensors/+/status',
      'sensors/+/alert'
    ];

    topics.forEach(topic => {
      this.mqttClient!.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          logger.error(`Failed to subscribe to topic ${topic}:`, error);
        } else {
          logger.info(`Subscribed to topic: ${topic}`);
        }
      });
    });
  }

  private handleMQTTMessage(topic: string, message: Buffer): void {
    try {
      const data = JSON.parse(message.toString());
      const topicParts = topic.split('/');
      
      if (topicParts.length < 3) {
        logger.warn(`Invalid topic format: ${topic}`);
        return;
      }

      const sensorId = topicParts[1];
      const sensorType = topicParts[2];

      const sensorReading: SensorReading = {
        sensorId,
        sensorType,
        value: data.value,
        unit: data.unit,
        timestamp: data.timestamp || new Date().toISOString(),
        location: data.location,
        metadata: data.metadata || {}
      };

      this.emit('sensorData', sensorReading);

      // Update sensor status
      this.updateSensorStatus(sensorId, 'online');

    } catch (error) {
      logger.error(`Error processing MQTT message from topic ${topic}:`, error);
    }
  }

  private processSensorData(sensorReading: SensorReading): void {
    try {
      // Validate sensor reading
      if (!this.validateSensorReading(sensorReading)) {
        logger.warn(`Invalid sensor reading from ${sensorReading.sensorId}`);
        return;
      }

      // Check for alerts
      this.checkForAlerts(sensorReading);

      // Store sensor data
      this.storeSensorData(sensorReading);

      // Emit processed data event
      this.emit('processedData', sensorReading);

    } catch (error) {
      logger.error('Error processing sensor data:', error);
    }
  }

  private validateSensorReading(reading: SensorReading): boolean {
    const requiredFields = ['sensorId', 'sensorType', 'value', 'timestamp'];
    
    for (const field of requiredFields) {
      if (!reading[field as keyof SensorReading]) {
        return false;
      }
    }

    // Validate value based on sensor type
    switch (reading.sensorType) {
      case 'temperature':
        return typeof reading.value === 'number' && reading.value >= -50 && reading.value <= 150;
      case 'humidity':
        return typeof reading.value === 'number' && reading.value >= 0 && reading.value <= 100;
      case 'pressure':
        return typeof reading.value === 'number' && reading.value >= 0 && reading.value <= 2000;
      case 'light':
        return typeof reading.value === 'number' && reading.value >= 0;
      case 'vibration':
        return typeof reading.value === 'number' && reading.value >= 0;
      case 'location':
        return typeof reading.value === 'object' && 
               typeof reading.value.latitude === 'number' && 
               typeof reading.value.longitude === 'number';
      default:
        return true;
    }
  }

  private checkForAlerts(reading: SensorReading): void {
    const sensorConfig = this.sensors.get(reading.sensorId);
    if (!sensorConfig) return;

    const thresholds = sensorConfig.thresholds;
    if (!thresholds) return;

    const threshold = thresholds[reading.sensorType];
    if (!threshold) return;

    let alertTriggered = false;
    let alertMessage = '';

    if (reading.value > threshold.max) {
      alertTriggered = true;
      alertMessage = `${reading.sensorType} exceeded maximum threshold: ${reading.value} > ${threshold.max}`;
    } else if (reading.value < threshold.min) {
      alertTriggered = true;
      alertMessage = `${reading.sensorType} below minimum threshold: ${reading.value} < ${threshold.min}`;
    }

    if (alertTriggered) {
      const alert = {
        sensorId: reading.sensorId,
        sensorType: reading.sensorType,
        value: reading.value,
        threshold: threshold,
        message: alertMessage,
        timestamp: reading.timestamp,
        severity: 'high'
      };

      this.emit('sensorAlert', alert);
    }
  }

  private storeSensorData(reading: SensorReading): void {
    // This would typically store to database or send to blockchain
    logger.debug(`Storing sensor data: ${reading.sensorId} - ${reading.sensorType}: ${reading.value}`);
  }

  private handleSensorAlert(alert: any): void {
    logger.warn(`Sensor alert: ${alert.message}`);
    
    // Send alert to blockchain for immutable record
    this.sendAlertToBlockchain(alert);
    
    // Send real-time notification
    this.emit('alertNotification', alert);
  }

  private handleSensorOffline(sensorId: string): void {
    logger.warn(`Sensor ${sensorId} is offline`);
    
    // Update sensor status
    this.updateSensorStatus(sensorId, 'offline');
    
    // Send offline notification
    this.emit('offlineNotification', { sensorId, timestamp: new Date().toISOString() });
  }

  private updateSensorStatus(sensorId: string, status: 'online' | 'offline'): void {
    const sensorConfig = this.sensors.get(sensorId);
    if (sensorConfig) {
      sensorConfig.status = status;
      sensorConfig.lastSeen = new Date().toISOString();
    }
  }

  private async sendAlertToBlockchain(alert: any): Promise<void> {
    try {
      // This would integrate with the blockchain service
      logger.info(`Sending alert to blockchain: ${alert.sensorId}`);
    } catch (error) {
      logger.error('Failed to send alert to blockchain:', error);
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info(`Attempting to reconnect to MQTT broker (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, 5000 * this.reconnectAttempts);
    } else {
      logger.error('Max reconnection attempts reached. MQTT client will not reconnect.');
    }
  }

  public registerSensor(sensorConfig: SensorConfig): void {
    this.sensors.set(sensorConfig.id, sensorConfig);
    logger.info(`Registered sensor: ${sensorConfig.id}`);
  }

  public unregisterSensor(sensorId: string): void {
    this.sensors.delete(sensorId);
    logger.info(`Unregistered sensor: ${sensorId}`);
  }

  public getSensorStatus(sensorId: string): SensorConfig | undefined {
    return this.sensors.get(sensorId);
  }

  public getAllSensors(): SensorConfig[] {
    return Array.from(this.sensors.values());
  }

  public async disconnect(): Promise<void> {
    if (this.mqttClient) {
      await this.mqttClient.endAsync();
      this.mqttClient = null;
      this.isConnected = false;
      logger.info('MQTT client disconnected');
    }
  }

  public isMQTTConnected(): boolean {
    return this.isConnected;
  }
}
