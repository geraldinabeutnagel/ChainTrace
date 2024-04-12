import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface NotificationConfig {
  email: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
  };
  sms: {
    enabled: boolean;
    provider: string;
    apiKey: string;
  };
  webhook: {
    enabled: boolean;
    url: string;
    secret: string;
  };
}

export interface NotificationMessage {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'push';
  recipient: string;
  subject?: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  createdAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  retryCount: number;
  maxRetries: number;
}

export class NotificationService extends EventEmitter {
  private config: NotificationConfig;
  private messageQueue: NotificationMessage[] = [];
  private isProcessing: boolean = false;

  constructor(config: NotificationConfig) {
    super();
    this.config = config;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('messageSent', (message: NotificationMessage) => {
      logger.info(`Notification sent successfully: ${message.id}`, {
        type: message.type,
        recipient: message.recipient,
        priority: message.priority
      });
    });

    this.on('messageFailed', (message: NotificationMessage, error: Error) => {
      logger.error(`Notification failed: ${message.id}`, {
        type: message.type,
        recipient: message.recipient,
        error: error.message,
        retryCount: message.retryCount
      });
    });

    this.on('queueProcessed', () => {
      logger.info('Notification queue processed', {
        queueSize: this.messageQueue.length
      });
    });
  }

  /**
   * Send email notification
   */
  async sendEmail(message: NotificationMessage): Promise<boolean> {
    try {
      if (!this.config.email.enabled) {
        logger.warn('Email notifications are disabled');
        return false;
      }

      // Simulate email sending
      logger.info(`Sending email to ${message.recipient}`, {
        subject: message.subject,
        priority: message.priority
      });

      // In a real implementation, you would use nodemailer or similar
      await this.simulateDelay(1000);

      message.status = 'sent';
      message.sentAt = new Date();
      this.emit('messageSent', message);

      return true;
    } catch (error) {
      message.status = 'failed';
      this.emit('messageFailed', message, error as Error);
      return false;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(message: NotificationMessage): Promise<boolean> {
    try {
      if (!this.config.sms.enabled) {
        logger.warn('SMS notifications are disabled');
        return false;
      }

      // Simulate SMS sending
      logger.info(`Sending SMS to ${message.recipient}`, {
        priority: message.priority
      });

      await this.simulateDelay(500);

      message.status = 'sent';
      message.sentAt = new Date();
      this.emit('messageSent', message);

      return true;
    } catch (error) {
      message.status = 'failed';
      this.emit('messageFailed', message, error as Error);
      return false;
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(message: NotificationMessage): Promise<boolean> {
    try {
      if (!this.config.webhook.enabled) {
        logger.warn('Webhook notifications are disabled');
        return false;
      }

      // Simulate webhook sending
      logger.info(`Sending webhook to ${this.config.webhook.url}`, {
        priority: message.priority
      });

      await this.simulateDelay(800);

      message.status = 'sent';
      message.sentAt = new Date();
      this.emit('messageSent', message);

      return true;
    } catch (error) {
      message.status = 'failed';
      this.emit('messageFailed', message, error as Error);
      return false;
    }
  }

  /**
   * Send push notification
   */
  async sendPush(message: NotificationMessage): Promise<boolean> {
    try {
      // Simulate push notification sending
      logger.info(`Sending push notification to ${message.recipient}`, {
        priority: message.priority
      });

      await this.simulateDelay(300);

      message.status = 'sent';
      message.sentAt = new Date();
      this.emit('messageSent', message);

      return true;
    } catch (error) {
      message.status = 'failed';
      this.emit('messageFailed', message, error as Error);
      return false;
    }
  }

  /**
   * Add message to queue
   */
  async queueMessage(message: Omit<NotificationMessage, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<string> {
    const notificationMessage: NotificationMessage = {
      ...message,
      id: this.generateMessageId(),
      createdAt: new Date(),
      status: 'pending',
      retryCount: 0,
      maxRetries: message.maxRetries || 3
    };

    this.messageQueue.push(notificationMessage);
    logger.info(`Message queued: ${notificationMessage.id}`, {
      type: notificationMessage.type,
      recipient: notificationMessage.recipient,
      priority: notificationMessage.priority
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return notificationMessage.id;
  }

  /**
   * Process message queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (!message) continue;

        let success = false;

        switch (message.type) {
          case 'email':
            success = await this.sendEmail(message);
            break;
          case 'sms':
            success = await this.sendSMS(message);
            break;
          case 'webhook':
            success = await this.sendWebhook(message);
            break;
          case 'push':
            success = await this.sendPush(message);
            break;
          default:
            logger.error(`Unknown notification type: ${message.type}`);
            message.status = 'failed';
        }

        // Retry logic
        if (!success && message.retryCount < message.maxRetries) {
          message.retryCount++;
          message.status = 'retrying';
          this.messageQueue.push(message);
          logger.info(`Retrying message: ${message.id} (attempt ${message.retryCount})`);
        }
      }
    } finally {
      this.isProcessing = false;
      this.emit('queueProcessed');
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    totalMessages: number;
    pendingMessages: number;
    failedMessages: number;
    retryingMessages: number;
  } {
    const pending = this.messageQueue.filter(m => m.status === 'pending').length;
    const failed = this.messageQueue.filter(m => m.status === 'failed').length;
    const retrying = this.messageQueue.filter(m => m.status === 'retrying').length;

    return {
      totalMessages: this.messageQueue.length,
      pendingMessages: pending,
      failedMessages: failed,
      retryingMessages: retrying
    };
  }

  /**
   * Clear failed messages
   */
  clearFailedMessages(): number {
    const initialLength = this.messageQueue.length;
    this.messageQueue = this.messageQueue.filter(m => m.status !== 'failed');
    const clearedCount = initialLength - this.messageQueue.length;
    
    logger.info(`Cleared ${clearedCount} failed messages`);
    return clearedCount;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Notification configuration updated');
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
