import { Module, Controller, Get, Patch, Param, Query, Body, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

export type NotificationCategory = 'reservation' | 'shared_stock' | 'sale' | 'lead' | 'broker_deal' | 'general' | 'global_trade';

interface CreateNotificationInput {
  dealer_id?: string;
  broker_id?: string;
  type: string;
  category?: NotificationCategory;
  title: string;
  body?: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // ── Outbound stubs (unchanged — kept for backward compatibility) ───────────

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`[Email] To: ${to} | Subject: ${subject}`);
  }

  async sendWhatsApp(to: string, message: string): Promise<void> {
    console.log(`[WhatsApp] To: ${to} | ${message}`);
  }

  async sendSMS(to: string, message: string): Promise<void> {
    console.log(`[SMS] To: ${to} | ${message}`);
  }

  // ── In-app notifications — single source of truth ──────────────────────────
  // Every module that needs to notify a dealer or broker should call this
  // instead of writing to `prisma.notification` directly, so the dashboard
  // notification bells stay consistent across the whole platform.

  async create(input: CreateNotificationInput) {
    if (!input.dealer_id && !input.broker_id) {
      // Silently skip rather than throw — notifications are best-effort and
      // should never break the calling business flow (sale, reservation, etc).
      return null;
    }
    try {
      return await this.prisma.notification.create({
        data: {
          dealer_id: input.dealer_id,
          broker_id: input.broker_id,
          type: input.type,
          category: input.category || 'general',
          title: input.title,
          body: input.body,
          data: input.data || {},
        },
      });
    } catch {
      return null;
    }
  }

  // Convenience: notify both a dealer and a broker at once for the same event
  // (e.g. a reservation, where both sides need to know).
  async createForBoth(
    dealerId: string | undefined,
    brokerId: string | undefined,
    type: string,
    category: NotificationCategory,
    dealerTitle: string,
    dealerBody: string,
    brokerTitle?: string,
    brokerBody?: string,
    data: Record<string, any> = {},
  ) {
    const results = await Promise.all([
      dealerId ? this.create({ dealer_id: dealerId, type, category, title: dealerTitle, body: dealerBody, data }) : null,
      brokerId ? this.create({ broker_id: brokerId, type, category, title: brokerTitle || dealerTitle, body: brokerBody || dealerBody, data }) : null,
    ]);
    return results;
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  async listForDealer(dealerId: string, q: { unread_only?: string; limit?: string; category?: string } = {}) {
    const where: any = { dealer_id: dealerId };
    if (q.unread_only === 'true') where.read_at = null;
    if (q.category) where.category = q.category;
    return this.prisma.notification.findMany({
      where, orderBy: { created_at: 'desc' }, take: Number(q.limit) || 50,
    });
  }

  async listForBroker(brokerId: string, q: { unread_only?: string; limit?: string; category?: string } = {}) {
    const where: any = { broker_id: brokerId };
    if (q.unread_only === 'true') where.read_at = null;
    if (q.category) where.category = q.category;
    return this.prisma.notification.findMany({
      where, orderBy: { created_at: 'desc' }, take: Number(q.limit) || 50,
    });
  }

  async unreadCountForDealer(dealerId: string) {
    return this.prisma.notification.count({ where: { dealer_id: dealerId, read_at: null } });
  }

  async unreadCountForBroker(brokerId: string) {
    return this.prisma.notification.count({ where: { broker_id: brokerId, read_at: null } });
  }

  // Single endpoint both dashboards poll: returns the feed + unread count together
  // so the frontend only needs one request per poll cycle.
  async feedForDealer(dealerId: string, q: { limit?: string } = {}) {
    const [items, unread] = await Promise.all([
      this.listForDealer(dealerId, { limit: q.limit || '30' }),
      this.unreadCountForDealer(dealerId),
    ]);
    return { items, unread_count: unread };
  }

  async feedForBroker(brokerId: string, q: { limit?: string } = {}) {
    const [items, unread] = await Promise.all([
      this.listForBroker(brokerId, { limit: q.limit || '30' }),
      this.unreadCountForBroker(brokerId),
    ]);
    return { items, unread_count: unread };
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { read_at: new Date() } });
  }

  async markAllReadForDealer(dealerId: string) {
    return this.prisma.notification.updateMany({
      where: { dealer_id: dealerId, read_at: null }, data: { read_at: new Date() },
    });
  }

  async markAllReadForBroker(brokerId: string) {
    return this.prisma.notification.updateMany({
      where: { broker_id: brokerId, read_at: null }, data: { read_at: new Date() },
    });
  }
}

@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get('dealer/:dealerId/feed')
  dealerFeed(@Param('dealerId') id: string, @Query() q: any) { return this.svc.feedForDealer(id, q); }

  @Get('broker/:brokerId/feed')
  brokerFeed(@Param('brokerId') id: string, @Query() q: any) { return this.svc.feedForBroker(id, q); }

  @Patch(':id/read')
  markRead(@Param('id') id: string) { return this.svc.markRead(id); }

  @Patch('dealer/:dealerId/read-all')
  markAllDealer(@Param('dealerId') id: string) { return this.svc.markAllReadForDealer(id); }

  @Patch('broker/:brokerId/read-all')
  markAllBroker(@Param('brokerId') id: string) { return this.svc.markAllReadForBroker(id); }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
