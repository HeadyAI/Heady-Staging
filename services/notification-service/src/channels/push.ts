import { NotificationPayload } from '../types';
import { logger } from '../logger';
import { v4 as uuidv4 } from 'uuid';

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushDeliveryResult {
  subscriptionId: string;
  userId: string;
  notificationId: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  timestamp: number;
}

export class PushChannelHandler {
  private subscriptions: Map<string, PushSubscription & { userId: string; registeredAt: number }> = new Map();
  private deliveryLog: PushDeliveryResult[] = [];
  private readonly maxDeliveryLogSize = 144;

  public registerSubscription(
    userId: string,
    subscription: PushSubscription
  ): string {
    const subscriptionId = uuidv4();

    this.subscriptions.set(subscriptionId, {
      ...subscription,
      userId,
      registeredAt: Date.now()
    });

    logger.info('push', 'Push subscription registered', {
      subscriptionId,
      userId,
      endpoint: this.obfuscateEndpoint(subscription.endpoint)
    });

    return subscriptionId;
  }

  public unregisterSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      logger.info('push', 'Push subscription unregistered', {
        subscriptionId,
        userId: subscription.userId,
        endpoint: this.obfuscateEndpoint(subscription.endpoint)
      });
    }

    this.subscriptions.delete(subscriptionId);
  }

  public async sendPushNotification(
    userId: string,
    notification: NotificationPayload
  ): Promise<PushDeliveryResult[]> {
    const results: PushDeliveryResult[] = [];
    const userSubscriptions: Array<[string, PushSubscription & { userId: string; registeredAt: number }]> = [];

    this.subscriptions.forEach((sub, id) => {
      if (sub.userId === userId) {
        userSubscriptions.push([id, sub]);
      }
    });

    if (userSubscriptions.length === 0) {
      logger.debug('push', 'No push subscriptions found', { userId });
      return results;
    }

    for (const [subscriptionId, subscription] of userSubscriptions) {
      const result = await this.deliverNotification(
        subscriptionId,
        subscription,
        notification
      );

      results.push(result);

      if (!result.success && result.statusCode === 410) {
        this.unregisterSubscription(subscriptionId);
      }

      this.addToDeliveryLog(result);
    }

    logger.info('push', 'Push notifications sent', {
      userId,
      notificationId: notification.id,
      totalSubscriptions: userSubscriptions.length,
      successCount: results.filter(r => r.success).length
    });

    return results;
  }

  private async deliverNotification(
    subscriptionId: string,
    subscription: PushSubscription & { userId: string; registeredAt: number },
    notification: NotificationPayload
  ): Promise<PushDeliveryResult> {
    const startTime = Date.now();

    try {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        data: notification.data,
        timestamp: notification.timestamp
      });

      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload).toString(),
          'TTL': '86400'
        },
        body: payload
      });

      const success = response.ok;

      const result: PushDeliveryResult = {
        subscriptionId,
        userId: subscription.userId,
        notificationId: notification.id,
        success,
        statusCode: response.status,
        timestamp: Date.now()
      };

      if (!success) {
        result.error = `HTTP ${response.status}`;
        logger.warn('push', 'Push delivery failed', {
          subscriptionId,
          userId: subscription.userId,
          notificationId: notification.id,
          statusCode: response.status,
          duration: Date.now() - startTime
        });
      } else {
        logger.debug('push', 'Push delivered successfully', {
          subscriptionId,
          userId: subscription.userId,
          duration: Date.now() - startTime
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('push', 'Push delivery error', error as Error, {
        subscriptionId,
        userId: subscription.userId,
        notificationId: notification.id
      });

      return {
        subscriptionId,
        userId: subscription.userId,
        notificationId: notification.id,
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  private addToDeliveryLog(result: PushDeliveryResult): void {
    if (this.deliveryLog.length >= this.maxDeliveryLogSize) {
      this.deliveryLog.shift();
    }

    this.deliveryLog.push(result);
  }

  private obfuscateEndpoint(endpoint: string): string {
    if (endpoint.length <= 10) {
      return '***';
    }

    return endpoint.substring(0, 10) + '...' + endpoint.substring(endpoint.length - 10);
  }

  public getSubscriptionStats(): {
    totalSubscriptions: number;
    userSubscriptions: Map<string, number>;
    averageAge: number;
  } {
    const userSubscriptions = new Map<string, number>();
    let totalAge = 0;

    this.subscriptions.forEach((sub) => {
      const count = userSubscriptions.get(sub.userId) || 0;
      userSubscriptions.set(sub.userId, count + 1);
      totalAge += Date.now() - sub.registeredAt;
    });

    const averageAge = this.subscriptions.size > 0
      ? Math.round(totalAge / this.subscriptions.size)
      : 0;

    return {
      totalSubscriptions: this.subscriptions.size,
      userSubscriptions,
      averageAge
    };
  }

  public getRecentDeliveryStats(): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  } {
    const total = this.deliveryLog.length;
    const successful = this.deliveryLog.filter(r => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) : 0;

    return {
      total,
      successful,
      failed,
      successRate
    };
  }
}
