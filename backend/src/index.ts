import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketServer } from 'ws';

import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { initializeBlockchain } from './config/blockchain';
import { initializeIPFS } from './config/ipfs';

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import batchRoutes from './routes/batches';
import traceRoutes from './routes/traces';
import iotRoutes from './routes/iot';
import blockchainRoutes from './routes/blockchain';
import analyticsRoutes from './routes/analytics';

// Load environment variables
dotenv.config();

class ChainTraceServer {
  private app: express.Application;
  private server: any;
  private wss: SocketServer;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://chaintrace.io', 'https://www.chaintrace.io']
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }));

    // Compression and logging
    this.app.use(compression());
    this.app.use(morgan('combined', {
      stream: { write: (message: string) => logger.info(message.trim()) }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(rateLimiter);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/products', authMiddleware, productRoutes);
    this.app.use('/api/batches', authMiddleware, batchRoutes);
    this.app.use('/api/traces', authMiddleware, traceRoutes);
    this.app.use('/api/iot', authMiddleware, iotRoutes);
    this.app.use('/api/blockchain', authMiddleware, blockchainRoutes);
    this.app.use('/api/analytics', authMiddleware, analyticsRoutes);

    // WebSocket endpoint for real-time updates
    this.app.get('/ws', (req, res) => {
      res.status(200).json({ message: 'WebSocket endpoint available at /ws' });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private setupWebSocket(): void {
    this.wss = new SocketServer({ server: this.server });
    
    this.wss.on('connection', (ws, req) => {
      logger.info(`New WebSocket connection from ${req.socket.remoteAddress}`);
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          logger.info('WebSocket message received:', data);
          
          // Handle different message types
          switch (data.type) {
            case 'subscribe':
              // Subscribe to specific channels
              ws.send(JSON.stringify({
                type: 'subscribed',
                channel: data.channel,
                timestamp: new Date().toISOString()
              }));
              break;
            case 'ping':
              ws.send(JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString()
              }));
              break;
            default:
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Unknown message type',
                timestamp: new Date().toISOString()
              }));
          }
        } catch (error) {
          logger.error('WebSocket message parsing error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid JSON format',
            timestamp: new Date().toISOString()
          }));
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to ChainTrace WebSocket server',
        timestamp: new Date().toISOString()
      }));
    });
  }

  public async start(): Promise<void> {
    try {
      // Initialize external services
      await connectDatabase();
      await connectRedis();
      await initializeBlockchain();
      await initializeIPFS();

      // Create HTTP server
      this.server = createServer(this.app);
      
      // Setup WebSocket
      this.setupWebSocket();

      // Start server
      this.server.listen(this.port, () => {
        logger.info(`ChainTrace server running on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
        logger.info(`WebSocket server available at ws://localhost:${this.port}/ws`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down ChainTrace server...');
    
    if (this.server) {
      this.server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    if (this.wss) {
      this.wss.close(() => {
        logger.info('WebSocket server closed');
      });
    }

    // Close database connections
    // await closeDatabase();
    
    logger.info('Server shutdown complete');
    process.exit(0);
  }
}

// Start server
const server = new ChainTraceServer();
server.start().catch((error) => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});

export default ChainTraceServer;
