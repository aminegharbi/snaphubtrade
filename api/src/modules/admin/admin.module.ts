import { Module, Controller, Get, Patch, Post, Body, Param, Query, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminUpdateDealerDto } from './dto/admin-update-dealer.dto';
import { AdminUpdateBrokerDto } from './dto/admin-update-broker.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── Users ──────────────────────────────────────────────────────────────
  async getUsers(q: any) {
    const { search, role, page = 1, limit = 20 } = q;
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { full_name: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take: Number(limit),
        orderBy: { created_at: 'desc' },
        select: {
          id: true, email: true, full_name: true, phone: true,
          role: true, email_verified: true, last_login_at: true, created_at: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, full_name: true, phone: true,
        role: true, email_verified: true, last_login_at: true, created_at: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const [dealer, broker] = await Promise.all([
      this.prisma.dealer.findFirst({ where: { user_id: id } }),
      this.prisma.broker.findFirst({ where: { user_id: id } }),
    ]);
    return { ...user, dealer, broker };
  }

  async updateUser(id: string, data: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id }, data });
  }

  // Admin-set password reset — no email flow exists yet, so this is a direct,
  // audited override. The new password goes through the exact same bcrypt
  // policy as self-registration (cost factor 12).
  async resetPassword(id: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id }, data: { password_hash } });
    return { success: true };
  }

  // ── Dealers ────────────────────────────────────────────────────────────
  async getDealers(q: any) {
    const { search, verified, subscription_tier, page = 1, limit = 20 } = q;
    const where: any = {};
    if (verified !== undefined) where.verified = verified === 'true';
    if (subscription_tier) where.subscription_tier = subscription_tier;
    if (search) {
      where.OR = [
        { company_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.prisma.dealer.findMany({ where, skip, take: Number(limit), orderBy: { created_at: 'desc' } }),
      this.prisma.dealer.count({ where }),
    ]);
    return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async getDealer(id: string) {
    const dealer = await this.prisma.dealer.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, full_name: true, role: true, last_login_at: true } } } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    return dealer;
  }

  async updateDealer(id: string, data: AdminUpdateDealerDto) {
    const dealer = await this.prisma.dealer.findUnique({ where: { id } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    const patch: any = { ...data };
    // Setting verified=true stamps verified_at; unsetting clears it.
    if (data.verified === true && !dealer.verified) patch.verified_at = new Date();
    if (data.verified === false) patch.verified_at = null;
    return this.prisma.dealer.update({ where: { id }, data: patch });
  }

  // ── Brokers ────────────────────────────────────────────────────────────
  async getBrokers(q: any) {
    const { search, status, page = 1, limit = 20 } = q;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { affiliate_code: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.prisma.broker.findMany({ where, skip, take: Number(limit), orderBy: { created_at: 'desc' } }),
      this.prisma.broker.count({ where }),
    ]);
    return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async getBroker(id: string) {
    const broker = await this.prisma.broker.findUnique({ where: { id } });
    if (!broker) throw new NotFoundException('Broker not found');
    // Broker.user_id is a plain string column, not a Prisma relation (unlike
    // Dealer.user) — fetch the linked account separately instead of `include`.
    const user = broker.user_id
      ? await this.prisma.user.findUnique({
          where: { id: broker.user_id },
          select: { id: true, email: true, full_name: true, role: true, last_login_at: true },
        })
      : null;
    return { ...broker, user };
  }

  async updateBroker(id: string, data: AdminUpdateBrokerDto) {
    const broker = await this.prisma.broker.findUnique({ where: { id } });
    if (!broker) throw new NotFoundException('Broker not found');
    return this.prisma.broker.update({ where: { id }, data });
  }

  // ── Misc (unchanged) ───────────────────────────────────────────────────
  async getAlerts(q: any) {
    try {
      const { page = 1, limit = 50 } = q;
      const [items, total] = await Promise.all([
        this.prisma.alertSubscription.findMany({
          orderBy: { created_at: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        this.prisma.alertSubscription.count(),
      ]);
      return { items, total };
    } catch { return { items: [], total: 0 }; }
  }

  async getPlatformStats() {
    try {
      const [users, dealers, vehicles, leads, available, vehiclesSold, brokerDeals, partialSales] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.dealer.count(),
        this.prisma.vehicle.count(),
        this.prisma.lead.count(),
        this.prisma.vehicle.count({ where: { status: 'available' } }),
        this.prisma.vehicle.count({ where: { status: 'sold' } }),
        this.prisma.brokerDeal.count(),
        this.prisma.vehicleReservation.count({ where: { status: 'converted', vehicle: { status: { not: 'sold' } } } }),
      ]);
      return {
        users, dealers, vehicles, leads,
        available_vehicles: available,
        vehicles_sold: Number(vehiclesSold) + Number(partialSales),
        broker_deals: brokerDeals,
      };
    } catch { return { users: 0, dealers: 0, vehicles: 0, leads: 0, available_vehicles: 0, vehicles_sold: 0, broker_deals: 0 }; }
  }
}

@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private service: AdminService) {}

  @Get('stats')
  stats() { return this.service.getPlatformStats(); }

  // ── Users ──────────────────────────────────────────────────────────────
  @Get('users')
  users(@Query() q: any) { return this.service.getUsers(q); }

  @Get('users/:id')
  user(@Param('id') id: string) { return this.service.getUser(id); }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: AdminUpdateUserDto) { return this.service.updateUser(id, body); }

  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: AdminResetPasswordDto) {
    return this.service.resetPassword(id, body.new_password);
  }

  // ── Dealers ────────────────────────────────────────────────────────────
  @Get('dealers')
  dealers(@Query() q: any) { return this.service.getDealers(q); }

  @Get('dealers/:id')
  dealer(@Param('id') id: string) { return this.service.getDealer(id); }

  @Patch('dealers/:id')
  updateDealer(@Param('id') id: string, @Body() body: AdminUpdateDealerDto) { return this.service.updateDealer(id, body); }

  // ── Brokers ────────────────────────────────────────────────────────────
  @Get('brokers')
  brokers(@Query() q: any) { return this.service.getBrokers(q); }

  @Get('brokers/:id')
  broker(@Param('id') id: string) { return this.service.getBroker(id); }

  @Patch('brokers/:id')
  updateBroker(@Param('id') id: string, @Body() body: AdminUpdateBrokerDto) { return this.service.updateBroker(id, body); }

  @Get('alerts')
  alerts(@Query() q: any) { return this.service.getAlerts(q); }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
