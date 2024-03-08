import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';
import { logger } from '../utils/logger';

const router = Router();

// Initialize analytics service
const analyticsService = new AnalyticsService({
  enabled: true,
  batchSize: 100,
  flushInterval: 30000, // 30 seconds
  retentionDays: 90,
  metrics: {
    performance: true,
    errors: true,
    userActivity: true,
    systemHealth: true
  }
});

/**
 * GET /analytics/summary
 * Get analytics summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = analyticsService.getAnalyticsSummary();
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get analytics summary', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics summary',
      code: 'ANALYTICS_ERROR'
    });
  }
});

/**
 * POST /analytics/metric
 * Record a custom metric
 */
router.post('/metric', async (req: Request, res: Response) => {
  try {
    const { type, name, value, tags, metadata } = req.body;

    if (!type || !name || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, name, value',
        code: 'VALIDATION_ERROR'
      });
    }

    analyticsService.recordCustomMetric({
      type,
      name,
      value: Number(value),
      tags: tags || {},
      metadata: metadata || {}
    });

    res.json({
      success: true,
      message: 'Metric recorded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record metric', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to record metric',
      code: 'METRIC_ERROR'
    });
  }
});

/**
 * POST /analytics/performance
 * Record performance metric
 */
router.post('/performance', async (req: Request, res: Response) => {
  try {
    const { operation, duration, success, metadata } = req.body;

    if (!operation || duration === undefined || success === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: operation, duration, success',
        code: 'VALIDATION_ERROR'
      });
    }

    analyticsService.recordPerformance({
      name: `performance.${operation}`,
      value: Number(duration),
      tags: { operation },
      duration: Number(duration),
      operation,
      success: Boolean(success),
      metadata: metadata || {}
    });

    res.json({
      success: true,
      message: 'Performance metric recorded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record performance metric', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to record performance metric',
      code: 'PERFORMANCE_ERROR'
    });
  }
});

/**
 * POST /analytics/error
 * Record error metric
 */
router.post('/error', async (req: Request, res: Response) => {
  try {
    const { errorType, errorMessage, stackTrace, context } = req.body;

    if (!errorType || !errorMessage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: errorType, errorMessage',
        code: 'VALIDATION_ERROR'
      });
    }

    analyticsService.recordError({
      name: `error.${errorType}`,
      value: 1,
      tags: { errorType },
      errorType,
      errorMessage,
      stackTrace: stackTrace || '',
      context: context || {}
    });

    res.json({
      success: true,
      message: 'Error metric recorded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record error metric', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to record error metric',
      code: 'ERROR_METRIC_ERROR'
    });
  }
});

/**
 * POST /analytics/user-activity
 * Record user activity metric
 */
router.post('/user-activity', async (req: Request, res: Response) => {
  try {
    const { userId, action, resource, ipAddress, userAgent } = req.body;

    if (!userId || !action || !resource) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, action, resource',
        code: 'VALIDATION_ERROR'
      });
    }

    analyticsService.recordUserActivity({
      name: `user_activity.${action}`,
      value: 1,
      tags: { userId, action, resource },
      userId,
      action,
      resource,
      ipAddress: ipAddress || req.ip,
      userAgent: userAgent || req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User activity metric recorded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record user activity metric', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to record user activity metric',
      code: 'USER_ACTIVITY_ERROR'
    });
  }
});

/**
 * POST /analytics/system-health
 * Record system health metric
 */
router.post('/system-health', async (req: Request, res: Response) => {
  try {
    const { component, status, cpuUsage, memoryUsage, diskUsage, networkLatency } = req.body;

    if (!component || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: component, status',
        code: 'VALIDATION_ERROR'
      });
    }

    analyticsService.recordSystemHealth({
      name: `system_health.${component}`,
      value: 1,
      tags: { component, status },
      component,
      status,
      cpuUsage: cpuUsage ? Number(cpuUsage) : undefined,
      memoryUsage: memoryUsage ? Number(memoryUsage) : undefined,
      diskUsage: diskUsage ? Number(diskUsage) : undefined,
      networkLatency: networkLatency ? Number(networkLatency) : undefined
    });

    res.json({
      success: true,
      message: 'System health metric recorded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record system health metric', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to record system health metric',
      code: 'SYSTEM_HEALTH_ERROR'
    });
  }
});

/**
 * POST /analytics/flush
 * Manually flush metrics
 */
router.post('/flush', async (req: Request, res: Response) => {
  try {
    await analyticsService.flushMetrics();
    
    res.json({
      success: true,
      message: 'Metrics flushed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to flush metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to flush metrics',
      code: 'FLUSH_ERROR'
    });
  }
});

/**
 * PUT /analytics/config
 * Update analytics configuration
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const { enabled, batchSize, flushInterval, retentionDays, metrics } = req.body;

    const configUpdate: any = {};
    if (enabled !== undefined) configUpdate.enabled = Boolean(enabled);
    if (batchSize !== undefined) configUpdate.batchSize = Number(batchSize);
    if (flushInterval !== undefined) configUpdate.flushInterval = Number(flushInterval);
    if (retentionDays !== undefined) configUpdate.retentionDays = Number(retentionDays);
    if (metrics !== undefined) configUpdate.metrics = metrics;

    analyticsService.updateConfig(configUpdate);

    res.json({
      success: true,
      message: 'Analytics configuration updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to update analytics configuration', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update analytics configuration',
      code: 'CONFIG_UPDATE_ERROR'
    });
  }
});

export default router;
