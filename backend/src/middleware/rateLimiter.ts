import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// Create rate limiter instance
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later',
        timestamp: new Date().toISOString(),
        retryAfter: Math.round(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 0)
      }
    });
  }
});

// Strict rate limiter for sensitive endpoints
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests to sensitive endpoint, please try again later',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Strict rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests to sensitive endpoint, please try again later',
        timestamp: new Date().toISOString(),
        retryAfter: Math.round(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 0)
      }
    });
  }
});

// API rate limiter for authenticated users
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // limit each IP to 1000 requests per hour
  message: {
    success: false,
    error: {
      code: 'API_RATE_LIMIT_EXCEEDED',
      message: 'API rate limit exceeded, please try again later',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return (req as any).user?.id?.toString() || req.ip;
  },
  handler: (req: Request, res: Response) => {
    const identifier = (req as any).user?.id?.toString() || req.ip;
    
    logger.warn('API rate limit exceeded:', {
      identifier,
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'API_RATE_LIMIT_EXCEEDED',
        message: 'API rate limit exceeded, please try again later',
        timestamp: new Date().toISOString(),
        retryAfter: Math.round(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 0)
      }
    });
  }
});

// WebSocket rate limiter
export const wsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 WebSocket connections per minute
  message: {
    success: false,
    error: {
      code: 'WS_RATE_LIMIT_EXCEEDED',
      message: 'Too many WebSocket connections, please try again later',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('WebSocket rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'WS_RATE_LIMIT_EXCEEDED',
        message: 'Too many WebSocket connections, please try again later',
        timestamp: new Date().toISOString(),
        retryAfter: Math.round(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 0)
      }
    });
  }
});

// Rate limiter middleware factory
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: {
        code: 'CUSTOM_RATE_LIMIT_EXCEEDED',
        message: options.message || 'Rate limit exceeded',
        timestamp: new Date().toISOString()
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator,
    handler: (req: Request, res: Response) => {
      logger.warn('Custom rate limit exceeded:', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      
      res.status(429).json({
        success: false,
        error: {
          code: 'CUSTOM_RATE_LIMIT_EXCEEDED',
          message: options.message || 'Rate limit exceeded',
          timestamp: new Date().toISOString(),
          retryAfter: Math.round(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 0)
        }
      });
    }
  });
};
