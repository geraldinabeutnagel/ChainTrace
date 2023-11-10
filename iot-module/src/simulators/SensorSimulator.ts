import mqtt from 'mqtt';
import { logger } from '../utils/logger';
import { SensorReading } from '../types/sensor';

export class SensorSimulator {
  private mqttClient: mqtt.MqttClient | null = null;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.setupMQTT();
  }

  private async setupMQTT(): Promise<void> {
    try {
      const mqttOptions: mqtt.IClientOptions = {
        host: process.env.IOT_MQTT_BROKER || 'mqtt://localhost:1883',
        username: process.env.IOT_MQTT_USERNAME,
        password: process.env.IOT_MQTT_PASSWORD,
        clientId: `sensor-simulator-${Date.now()}`,
        clean: true,
      };

      this.mqttClient = mqtt.connect(mqttOptions);

      this.mqttClient.on('connect', () => {
        logger.info('Sensor simulator connected to MQTT broker');
      });

      this.mqttClient.on('error', (error) => {
        logger.error('Sensor simulator MQTT error:', error);
      });

    } catch (error) {
      logger.error('Failed to setup MQTT for sensor simulator:', error);
    }
  }

  public startSimulation(): void {
    if (this.isRunning) {
      logger.warn('Sensor simulation already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting sensor simulation');

    // Simulate different types of sensors
    this.simulateTemperatureSensor();
    this.simulateHumiditySensor();
    this.simulatePressureSensor();
    this.simulateLocationSensor();
  }

  public stopSimulation(): void {
    if (!this.isRunning) {
      logger.warn('Sensor simulation not running');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Sensor simulation stopped');
  }

  private simulateTemperatureSensor(): void {
    const sensorId = 'TEMP_SIM_001';
    let temperature = 20; // Starting temperature

    setInterval(() => {
      if (!this.isRunning) return;

      // Simulate temperature variation
      temperature += (Math.random() - 0.5) * 2; // ±1°C variation
      temperature = Math.max(15, Math.min(35, temperature)); // Keep within reasonable range

      const reading: SensorReading = {
        sensorId,
        sensorType: 'temperature',
        value: Math.round(temperature * 10) / 10,
        unit: '°C',
        timestamp: new Date().toISOString(),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 5
        },
        metadata: {
          simulation: true,
          batch_id: 'BATCH001'
        }
      };

      this.publishSensorReading(reading);
    }, 5000); // Every 5 seconds
  }

  private simulateHumiditySensor(): void {
    const sensorId = 'HUMIDITY_SIM_001';
    let humidity = 50; // Starting humidity

    setInterval(() => {
      if (!this.isRunning) return;

      // Simulate humidity variation
      humidity += (Math.random() - 0.5) * 10; // ±5% variation
      humidity = Math.max(20, Math.min(80, humidity)); // Keep within reasonable range

      const reading: SensorReading = {
        sensorId,
        sensorType: 'humidity',
        value: Math.round(humidity),
        unit: '%',
        timestamp: new Date().toISOString(),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 5
        },
        metadata: {
          simulation: true,
          batch_id: 'BATCH001'
        }
      };

      this.publishSensorReading(reading);
    }, 7000); // Every 7 seconds
  }

  private simulatePressureSensor(): void {
    const sensorId = 'PRESSURE_SIM_001';
    let pressure = 1013; // Starting pressure (hPa)

    setInterval(() => {
      if (!this.isRunning) return;

      // Simulate pressure variation
      pressure += (Math.random() - 0.5) * 20; // ±10 hPa variation
      pressure = Math.max(950, Math.min(1050, pressure)); // Keep within reasonable range

      const reading: SensorReading = {
        sensorId,
        sensorType: 'pressure',
        value: Math.round(pressure),
        unit: 'hPa',
        timestamp: new Date().toISOString(),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 5
        },
        metadata: {
          simulation: true,
          batch_id: 'BATCH001'
        }
      };

      this.publishSensorReading(reading);
    }, 10000); // Every 10 seconds
  }

  private simulateLocationSensor(): void {
    const sensorId = 'LOCATION_SIM_001';
    let latitude = 40.7128;
    let longitude = -74.0060;

    setInterval(() => {
      if (!this.isRunning) return;

      // Simulate small location changes (vehicle movement)
      latitude += (Math.random() - 0.5) * 0.001; // ±0.0005° variation
      longitude += (Math.random() - 0.5) * 0.001; // ±0.0005° variation

      const reading: SensorReading = {
        sensorId,
        sensorType: 'location',
        value: {
          latitude: Math.round(latitude * 1000000) / 1000000,
          longitude: Math.round(longitude * 1000000) / 1000000
        },
        unit: 'degrees',
        timestamp: new Date().toISOString(),
        location: {
          latitude,
          longitude,
          accuracy: 10
        },
        metadata: {
          simulation: true,
          batch_id: 'BATCH001',
          vehicle_id: 'TRUCK001'
        }
      };

      this.publishSensorReading(reading);
    }, 15000); // Every 15 seconds
  }

  private publishSensorReading(reading: SensorReading): void {
    if (!this.mqttClient || !this.mqttClient.connected) {
      logger.warn('MQTT client not connected, skipping sensor reading');
      return;
    }

    const topic = `sensors/${reading.sensorId}/${reading.sensorType}`;
    const message = JSON.stringify(reading);

    this.mqttClient.publish(topic, message, { qos: 1 }, (error) => {
      if (error) {
        logger.error(`Failed to publish sensor reading for ${reading.sensorId}:`, error);
      } else {
        logger.debug(`Published sensor reading: ${reading.sensorId} - ${reading.sensorType}: ${reading.value}`);
      }
    });
  }

  public getStatus(): { isRunning: boolean; connected: boolean } {
    return {
      isRunning: this.isRunning,
      connected: this.mqttClient?.connected || false
    };
  }

  public async disconnect(): Promise<void> {
    this.stopSimulation();
    
    if (this.mqttClient) {
      await this.mqttClient.endAsync();
      this.mqttClient = null;
    }
    
    logger.info('Sensor simulator disconnected');
  }
}
