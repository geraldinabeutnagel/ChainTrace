import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface SecurityConfig {
  enableCORS: boolean;
  enableHelmet: boolean;
  enableRateLimit: boolean;
  enableCSRF: boolean;
  trustedProxies: string[];
  allowedOrigins: string[];
  maxRequestsPerMinute: number;
}

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * CORS middleware
   */
  corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    if (!this.config.enableCORS) {
      return next();
    }

    const origin = req.headers.origin;
    const isAllowedOrigin = this.config.allowedOrigins.includes(origin as string) || 
                           this.config.allowedOrigins.includes('*');

    if (isAllowedOrigin) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  };

  /**
   * Helmet security headers middleware
   */
  helmetMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    if (!this.config.enableHelmet) {
      return next();
    }

    // Security headers
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Content-Security-Policy', "default-src 'self'");

    next();
  };

  /**
   * Rate limiting middleware
   */
  rateLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    if (!this.config.enableRateLimit) {
      return next();
    }

    // Simple in-memory rate limiting (in production, use Redis)
    const clientIp = this.getClientIp(req);
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = this.config.maxRequestsPerMinute;

    // This is a simplified implementation
    // In production, you should use a proper rate limiting library
    const key = `rate_limit_${clientIp}`;
    
    // For now, just log the request
    logger.debug('Rate limit check', {
      ip: clientIp,
      path: req.path,
      method: req.method
    });

    next();
  };

  /**
   * CSRF protection middleware
   */
  csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    if (!this.config.enableCSRF) {
      return next();
    }

    // Skip CSRF for GET requests
    if (req.method === 'GET') {
      return next();
    }

    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
      logger.warn('CSRF token validation failed', {
        ip: this.getClientIp(req),
        path: req.path,
        method: req.method
      });
      
      return res.status(403).json({
        error: 'CSRF token validation failed',
        code: 'CSRF_ERROR'
      });
    }

    next();
  };

  /**
   * Request logging middleware
   */
  requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const clientIp = this.getClientIp(req);

    // Log request
    logger.info('Request received', {
      method: req.method,
      path: req.path,
      ip: clientIp,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: clientIp
      });

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };

  /**
   * Input validation middleware
   */
  inputValidationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Check for suspicious patterns in request body
    if (req.body && typeof req.body === 'object') {
      const bodyStr = JSON.stringify(req.body);
      
      // Check for SQL injection patterns
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
        /(\b(OR|AND)\s+'.*'\s*=\s*'.*')/i
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(bodyStr)) {
          logger.warn('Potential SQL injection detected', {
            ip: this.getClientIp(req),
            path: req.path,
            pattern: pattern.source
          });
          
          return res.status(400).json({
            error: 'Invalid input detected',
            code: 'INPUT_VALIDATION_ERROR'
          });
        }
      }

      // Check for XSS patterns
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];

      for (const pattern of xssPatterns) {
        if (pattern.test(bodyStr)) {
          logger.warn('Potential XSS detected', {
            ip: this.getClientIp(req),
            path: req.path,
            pattern: pattern.source
          });
          
          return res.status(400).json({
            error: 'Invalid input detected',
            code: 'INPUT_VALIDATION_ERROR'
          });
        }
      }
    }

    next();
  };

  /**
   * Error handling middleware
   */
  errorHandlingMiddleware = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    const clientIp = this.getClientIp(req);
    
    logger.error('Request error', {
      error: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      ip: clientIp,
      timestamp: new Date().toISOString()
    });

    // Don't expose internal errors to client
    const statusCode = res.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : err.message;

    res.status(statusCode).json({
      error: message,
      code: 'REQUEST_ERROR',
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const remoteAddress = req.connection.remoteAddress;

    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    }

    if (realIp) {
      return realIp as string;
    }

    return remoteAddress || 'unknown';
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Security configuration updated');
  }

  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}
