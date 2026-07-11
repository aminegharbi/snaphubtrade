import { Module, Controller, Get, Post, Patch, Delete, Body, Param, Query, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async subscribe(body: any) {
    return this.prisma.alertSubscription.create({
      data: {
        email: body.email, phone: body.phone, user_id: body.user_id,
        alert_type: body.alert_type, filters: body.filters || {},
        channel: body.channel || ['email'],
      },
    });
  }

  async getMyAlerts(email: string) {
    return this.prisma.alertSubscription.findMany({
      where: { email, is_active: true }, orderBy: { created_at: 'desc' },
    });
  }

  async toggleAlert(id: string, active: boolean) {
    return this.prisma.alertSubscription.update({ where: { id }, data: { is_active: active } });
  }

  async deleteAlert(id: string) {
    return this.prisma.alertSubscription.delete({ where: { id } });
  }

  // Admin: get all alerts
  async getAllAlerts(q: any) {
    const { type, page = 1, limit = 50 } = q;
    const where: any = {};
    if (type) where.alert_type = type;
    const [items, total] = await Promise.all([
      this.prisma.alertSubscription.findMany({ where, orderBy: { created_at: 'desc' }, skip: (Number(page)-1)*Number(limit), take: Number(limit) }),
      this.prisma.alertSubscription.count({ where }),
    ]);
    return { items, total };
  }

  // Trigger check: find matching alerts for a new/updated vehicle
  async checkAndNotify(vehicleId: string, eventType: 'new' | 'price_drop' | 'available') {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return;

    const alerts = await this.prisma.alertSubscription.findMany({
      where: { is_active: true, alert_type: { in: eventType === 'new' ? ['new_vehicle', 'brand', 'model'] : ['price_drop', 'availability'] } },
    });

    const triggered = [];
    for (const alert of alerts) {
      const f = alert.filters as any;
      if (f.make && f.make !== vehicle.make) continue;
      if (f.model && !vehicle.model.toLowerCase().includes(f.model.toLowerCase())) continue;
      if (f.price_max && Number(vehicle.price_aed) > f.price_max) continue;
      if (f.export_eligible && !vehicle.export_eligible) continue;

      // Create notification record
      const notif = await this.prisma.alertNotification.create({
        data: {
          alert_id: alert.id, vehicle_id: vehicleId,
          title: eventType === 'new' ? `New ${vehicle.year} ${vehicle.make} ${vehicle.model} listed` : `Price drop: ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          message: `AED ${Number(vehicle.price_aed).toLocaleString()} · ${vehicle.mileage_km === 0 ? 'New' : vehicle.mileage_km.toLocaleString() + ' km'}`,
          channel: (alert.channel as string[])[0] || 'email',
        },
      });
      triggered.push(notif);

      // Update trigger count
      await this.prisma.alertSubscription.update({ where: { id: alert.id }, data: { trigger_count: { increment: 1 }, last_triggered: new Date() } });
    }
    return triggered;
  }

  async getStats() {
    const [total, active, byType] = await Promise.all([
      this.prisma.alertSubscription.count(),
      this.prisma.alertSubscription.count({ where: { is_active: true } }),
      this.prisma.alertSubscription.groupBy({ by: ['alert_type'], _count: true }),
    ]);
    return { total, active, by_type: byType };
  }
}

@Controller('alerts')
export class AlertsController {
  constructor(private svc: AlertsService) {}

  @Post('subscribe')   subscribe(@Body() b: any) { return this.svc.subscribe(b); }
  @Get('my')           my(@Query('email') e: string) { return this.svc.getMyAlerts(e); }
  @Patch(':id/toggle') toggle(@Param('id') id: string, @Body() b: any) { return this.svc.toggleAlert(id, b.active); }
  @Delete(':id')       del(@Param('id') id: string) { return this.svc.deleteAlert(id); }
  @Roles('admin')
  @Get('admin/all')    all(@Query() q: any) { return this.svc.getAllAlerts(q); }
  @Roles('admin')
  @Get('admin/stats')  stats() { return this.svc.getStats(); }
  @Roles('admin')
  @Post('trigger/:id') trigger(@Param('id') id: string, @Body() b: any) { return this.svc.checkAndNotify(id, b.event); }
}

@Module({ controllers: [AlertsController], providers: [AlertsService], exports: [AlertsService] })
export class AlertsModule {}
