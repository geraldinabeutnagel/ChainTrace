import { EventEmitter } from 'events';
import { SensorReading } from '../types/sensor';
import { logger } from '../utils/logger';

export interface EnvironmentalConfig {
  temperature: {
    min: number;
    max: number;
    variation: number;
    trend: 'stable' | 'increasing' | 'decreasing' | 'fluctuating';
  };
  humidity: {
    min: number;
    max: number;
    variation: number;
    correlation: number; // Correlation with temperature
  };
  pressure: {
    min: number;
    max: number;
    variation: number;
    altitude: number; // Altitude in meters
  };
  light: {
    min: number;
    max: number;
    variation: number;
    dayNightCycle: boolean;
  };
  vibration: {
    min: number;
    max: number;
    variation: number;
    frequency: number; // Hz
  };
}

export interface SimulationState {
  temperature: number;
  humidity: number;
  pressure: number;
  light: number;
  vibration: number;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

export class EnvironmentalSimulator extends EventEmitter {
  private config: EnvironmentalConfig;
  private state: SimulationState;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private sensorId: string;
  private updateInterval: number;

  constructor(
    sensorId: string,
    config: EnvironmentalConfig,
    updateInterval: number = 1000
  ) {
    super();
    this.sensorId = sensorId;
    this.config = config;
    this.updateInterval = updateInterval;
    this.state = this.initializeState();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('readingGenerated', (reading: SensorReading) => {
      logger.debug('Environmental reading generated', {
        sensorId: reading.sensorId,
        sensorType: reading.sensorType,
        value: reading.value
      });
    });

    this.on('stateChanged', (state: SimulationState) => {
      logger.debug('Simulation state changed', {
        temperature: state.temperature,
        humidity: state.humidity,
        pressure: state.pressure
      });
    });
  }

  private initializeState(): SimulationState {
    const now = new Date();
    
    return {
      temperature: this.generateInitialValue(this.config.temperature),
      humidity: this.generateInitialValue(this.config.humidity),
      pressure: this.generateInitialValue(this.config.pressure),
      light: this.generateInitialValue(this.config.light),
      vibration: this.generateInitialValue(this.config.vibration),
      timestamp: now,
      location: {
        latitude: 40.7128 + (Math.random() - 0.5) * 0.01, // NYC area
        longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
        accuracy: 5 + Math.random() * 10
      }
    };
  }

  private generateInitialValue(range: { min: number; max: number }): number {
    return range.min + Math.random() * (range.max - range.min);
  }

  /**
   * Start the simulation
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Simulation is already running');
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.updateState();
      this.generateReadings();
    }, this.updateInterval);

    logger.info('Environmental simulation started', {
      sensorId: this.sensorId,
      updateInterval: this.updateInterval
    });
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Simulation is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Environmental simulation stopped', {
      sensorId: this.sensorId
    });
  }

  /**
   * Update simulation state
   */
  private updateState(): void {
    const now = new Date();
    const timeDelta = (now.getTime() - this.state.timestamp.getTime()) / 1000; // seconds

    // Update temperature based on trend
    this.state.temperature = this.updateTemperature(timeDelta);
    
    // Update humidity (correlated with temperature)
    this.state.humidity = this.updateHumidity(timeDelta);
    
    // Update pressure (affected by altitude and weather)
    this.state.pressure = this.updatePressure(timeDelta);
    
    // Update light (day/night cycle)
    this.state.light = this.updateLight(timeDelta);
    
    // Update vibration (random with some patterns)
    this.state.vibration = this.updateVibration(timeDelta);
    
    // Update location (small random movement)
    this.state.location = this.updateLocation(timeDelta);
    
    this.state.timestamp = now;

    this.emit('stateChanged', this.state);
  }

  private updateTemperature(timeDelta: number): number {
    const { min, max, variation, trend } = this.config.temperature;
    let newTemp = this.state.temperature;

    // Apply trend
    switch (trend) {
      case 'increasing':
        newTemp += variation * timeDelta * 0.1;
        break;
      case 'decreasing':
        newTemp -= variation * timeDelta * 0.1;
        break;
      case 'fluctuating':
        newTemp += (Math.random() - 0.5) * variation * timeDelta * 0.2;
        break;
      case 'stable':
      default:
        newTemp += (Math.random() - 0.5) * variation * timeDelta * 0.05;
        break;
    }

    // Add random variation
    newTemp += (Math.random() - 0.5) * variation * 0.1;

    // Clamp to range
    return Math.max(min, Math.min(max, newTemp));
  }

  private updateHumidity(timeDelta: number): number {
    const { min, max, variation, correlation } = this.config.humidity;
    let newHumidity = this.state.humidity;

    // Apply correlation with temperature
    const tempChange = this.state.temperature - (this.state.temperature - variation * timeDelta);
    newHumidity -= tempChange * correlation * 0.1;

    // Add random variation
    newHumidity += (Math.random() - 0.5) * variation * 0.1;

    // Clamp to range
    return Math.max(min, Math.min(max, newHumidity));
  }

  private updatePressure(timeDelta: number): number {
    const { min, max, variation, altitude } = this.config.pressure;
    let newPressure = this.state.pressure;

    // Apply altitude effect
    const altitudeEffect = altitude * 0.001; // 1 hPa per 8m altitude
    newPressure -= altitudeEffect;

    // Add random variation
    newPressure += (Math.random() - 0.5) * variation * 0.1;

    // Clamp to range
    return Math.max(min, Math.min(max, newPressure));
  }

  private updateLight(timeDelta: number): number {
    const { min, max, variation, dayNightCycle } = this.config.light;
    let newLight = this.state.light;

    if (dayNightCycle) {
      // Simulate day/night cycle
      const hour = this.state.timestamp.getHours();
      const dayFactor = Math.sin((hour - 6) * Math.PI / 12); // Peak at noon
      newLight = min + (max - min) * Math.max(0, dayFactor);
    } else {
      // Random variation
      newLight += (Math.random() - 0.5) * variation * 0.1;
    }

    // Clamp to range
    return Math.max(min, Math.min(max, newLight));
  }

  private updateVibration(timeDelta: number): number {
    const { min, max, variation, frequency } = this.config.vibration;
    let newVibration = this.state.vibration;

    // Apply frequency-based pattern
    const time = this.state.timestamp.getTime() / 1000;
    const frequencyEffect = Math.sin(time * frequency * 2 * Math.PI) * variation * 0.1;
    newVibration += frequencyEffect;

    // Add random variation
    newVibration += (Math.random() - 0.5) * variation * 0.2;

    // Clamp to range
    return Math.max(min, Math.min(max, newVibration));
  }

  private updateLocation(timeDelta: number): { latitude: number; longitude: number; accuracy: number } {
    const { latitude, longitude, accuracy } = this.state.location;
    
    // Small random movement (simulating GPS drift)
    const latDrift = (Math.random() - 0.5) * 0.0001 * timeDelta;
    const lngDrift = (Math.random() - 0.5) * 0.0001 * timeDelta;
    const accuracyDrift = (Math.random() - 0.5) * 2 * timeDelta;

    return {
      latitude: latitude + latDrift,
      longitude: longitude + lngDrift,
      accuracy: Math.max(1, accuracy + accuracyDrift)
    };
  }

  /**
   * Generate sensor readings from current state
   */
  private generateReadings(): void {
    const readings: SensorReading[] = [
      {
        sensorId: this.sensorId,
        sensorType: 'temperature',
        value: this.state.temperature,
        timestamp: this.state.timestamp.toISOString(),
        metadata: {
          unit: 'celsius',
          accuracy: 0.1
        }
      },
      {
        sensorId: this.sensorId,
        sensorType: 'humidity',
        value: this.state.humidity,
        timestamp: this.state.timestamp.toISOString(),
        metadata: {
          unit: 'percent',
          accuracy: 1
        }
      },
      {
        sensorId: this.sensorId,
        sensorType: 'pressure',
        value: this.state.pressure,
        timestamp: this.state.timestamp.toISOString(),
        metadata: {
          unit: 'hPa',
          accuracy: 0.1
        }
      },
      {
        sensorId: this.sensorId,
        sensorType: 'light',
        value: this.state.light,
        timestamp: this.state.timestamp.toISOString(),
        metadata: {
          unit: 'lux',
          accuracy: 10
        }
      },
      {
        sensorId: this.sensorId,
        sensorType: 'vibration',
        value: this.state.vibration,
        timestamp: this.state.timestamp.toISOString(),
        metadata: {
          unit: 'g',
          accuracy: 0.01
        }
      },
      {
        sensorId: this.sensorId,
        sensorType: 'location',
        value: this.state.location,
        timestamp: this.state.timestamp.toISOString(),
        metadata: {
          unit: 'coordinates',
          accuracy: this.state.location.accuracy
        }
      }
    ];

    // Emit each reading
    readings.forEach(reading => {
      this.emit('readingGenerated', reading);
    });
  }

  /**
   * Get current simulation state
   */
  getState(): SimulationState {
    return { ...this.state };
  }

  /**
   * Update simulation configuration
   */
  updateConfig(newConfig: Partial<EnvironmentalConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Environmental simulation configuration updated');
  }

  /**
   * Check if simulation is running
   */
  isSimulationRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get simulation statistics
   */
  getStatistics(): {
    sensorId: string;
    isRunning: boolean;
    updateInterval: number;
    currentState: SimulationState;
    config: EnvironmentalConfig;
  } {
    return {
      sensorId: this.sensorId,
      isRunning: this.isRunning,
      updateInterval: this.updateInterval,
      currentState: this.getState(),
      config: this.config
    };
  }
}
