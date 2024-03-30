import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface AnalyticsConfig {
  enabled: boolean;
  batchSize: number;
  flushInterval: number;
  retentionDays: number;
  metrics: {
    performance: boolean;
    errors: boolean;
    userActivity: boolean;
    systemHealth: boolean;
  };
}

export interface MetricData {
  id: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric extends MetricData {
  type: 'timer';
  duration: number;
  operation: string;
  success: boolean;
}

export interface ErrorMetric extends MetricData {
  type: 'counter';
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, any>;
}

export interface UserActivityMetric extends MetricData {
  type: 'counter';
  userId: string;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SystemHealthMetric extends MetricData {
  type: 'gauge';
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  networkLatency?: number;
}

export class AnalyticsService extends EventEmitter {
  private config: AnalyticsConfig;
  private metricsBuffer: MetricData[] = [];
  private isProcessing: boolean = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: AnalyticsConfig) {
    super();
    this.config = config;
    this.setupEventHandlers();
    this.startFlushTimer();
  }

  private setupEventHandlers(): void {
    this.on('metricRecorded', (metric: MetricData) => {
      logger.debug('Metric recorded', {
        type: metric.type,
        name: metric.name,
        value: metric.value
      });
    });

    this.on('metricsFlushed', (count: number) => {
      logger.info(`Metrics flushed: ${count} metrics`);
    });

    this.on('error', (error: Error) => {
      logger.error('Analytics service error', { error: error.message });
    });
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.config.flushInterval);
  }

  /**
   * Record a performance metric
   */
  recordPerformance(metric: Omit<PerformanceMetric, 'id' | 'timestamp' | 'type'>): void {
    if (!this.config.enabled || !this.config.metrics.performance) {
      return;
    }

    const performanceMetric: PerformanceMetric = {
      ...metric,
      id: this.generateMetricId(),
      timestamp: new Date(),
      type: 'timer'
    };

    this.addMetric(performanceMetric);
  }

  /**
   * Record an error metric
   */
  recordError(metric: Omit<ErrorMetric, 'id' | 'timestamp' | 'type'>): void {
    if (!this.config.enabled || !this.config.metrics.errors) {
      return;
    }

    const errorMetric: ErrorMetric = {
      ...metric,
      id: this.generateMetricId(),
      timestamp: new Date(),
      type: 'counter'
    };

    this.addMetric(errorMetric);
  }

  /**
   * Record user activity metric
   */
  recordUserActivity(metric: Omit<UserActivityMetric, 'id' | 'timestamp' | 'type'>): void {
    if (!this.config.enabled || !this.config.metrics.userActivity) {
      return;
    }

    const activityMetric: UserActivityMetric = {
      ...metric,
      id: this.generateMetricId(),
      timestamp: new Date(),
      type: 'counter'
    };

    this.addMetric(activityMetric);
  }

  /**
   * Record system health metric
   */
  recordSystemHealth(metric: Omit<SystemHealthMetric, 'id' | 'timestamp' | 'type'>): void {
    if (!this.config.enabled || !this.config.metrics.systemHealth) {
      return;
    }

    const healthMetric: SystemHealthMetric = {
      ...metric,
      id: this.generateMetricId(),
      timestamp: new Date(),
      type: 'gauge'
    };

    this.addMetric(healthMetric);
  }

  /**
   * Record a custom metric
   */
  recordCustomMetric(metric: Omit<MetricData, 'id' | 'timestamp'>): void {
    if (!this.config.enabled) {
      return;
    }

    const customMetric: MetricData = {
      ...metric,
      id: this.generateMetricId(),
      timestamp: new Date()
    };

    this.addMetric(customMetric);
  }

  /**
   * Add metric to buffer
   */
  private addMetric(metric: MetricData): void {
    this.metricsBuffer.push(metric);
    this.emit('metricRecorded', metric);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.config.batchSize) {
      this.flushMetrics();
    }
  }

  /**
   * Flush metrics buffer
   */
  async flushMetrics(): Promise<void> {
    if (this.isProcessing || this.metricsBuffer.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const metricsToFlush = [...this.metricsBuffer];
      this.metricsBuffer = [];

      // In a real implementation, you would send metrics to your analytics service
      // For now, we'll just log them
      await this.processMetrics(metricsToFlush);

      this.emit('metricsFlushed', metricsToFlush.length);
    } catch (error) {
      this.emit('error', error as Error);
      // Re-add metrics to buffer on error
      this.metricsBuffer.unshift(...this.metricsBuffer);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process metrics (placeholder for actual analytics service)
   */
  private async processMetrics(metrics: MetricData[]): Promise<void> {
    // Group metrics by type for processing
    const groupedMetrics = metrics.reduce((groups, metric) => {
      if (!groups[metric.type]) {
        groups[metric.type] = [];
      }
      groups[metric.type].push(metric);
      return groups;
    }, {} as Record<string, MetricData[]>);

    // Process each group
    for (const [type, typeMetrics] of Object.entries(groupedMetrics)) {
      await this.processMetricType(type, typeMetrics);
    }
  }

  /**
   * Process specific metric type
   */
  private async processMetricType(type: string, metrics: MetricData[]): Promise<void> {
    switch (type) {
      case 'counter':
        await this.processCounterMetrics(metrics as (ErrorMetric | UserActivityMetric)[]);
        break;
      case 'gauge':
        await this.processGaugeMetrics(metrics as SystemHealthMetric[]);
        break;
      case 'histogram':
        await this.processHistogramMetrics(metrics);
        break;
      case 'timer':
        await this.processTimerMetrics(metrics as PerformanceMetric[]);
        break;
      default:
        logger.warn(`Unknown metric type: ${type}`);
    }
  }

  private async processCounterMetrics(metrics: (ErrorMetric | UserActivityMetric)[]): Promise<void> {
    // Process counter metrics (errors, user activity)
    logger.debug(`Processing ${metrics.length} counter metrics`);
  }

  private async processGaugeMetrics(metrics: SystemHealthMetric[]): Promise<void> {
    // Process gauge metrics (system health)
    logger.debug(`Processing ${metrics.length} gauge metrics`);
  }

  private async processHistogramMetrics(metrics: MetricData[]): Promise<void> {
    // Process histogram metrics
    logger.debug(`Processing ${metrics.length} histogram metrics`);
  }

  private async processTimerMetrics(metrics: PerformanceMetric[]): Promise<void> {
    // Process timer metrics (performance)
    logger.debug(`Processing ${metrics.length} timer metrics`);
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(): {
    totalMetrics: number;
    metricsByType: Record<string, number>;
    bufferSize: number;
    isProcessing: boolean;
  } {
    const metricsByType = this.metricsBuffer.reduce((groups, metric) => {
      groups[metric.type] = (groups[metric.type] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);

    return {
      totalMetrics: this.metricsBuffer.length,
      metricsByType,
      bufferSize: this.metricsBuffer.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.flushInterval) {
      this.startFlushTimer();
    }
    
    logger.info('Analytics configuration updated');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining metrics
    await this.flushMetrics();

    logger.info('Analytics service cleaned up');
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
