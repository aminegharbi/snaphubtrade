import { Module, Controller, Get, Post, Patch, Body, Param, Query, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Public } from '../../shared/auth/public.decorator';
import { Roles } from '../../shared/auth/roles.decorator';

@Injectable()
export class FeatureFlagsService {
  constructor(private prisma: PrismaService) {}

  async getAll(q: any) {
    const { category, enabled, search } = q;
    const where: any = {};
    if (category)          where.category = category;
    if (enabled !== undefined) where.is_enabled = enabled === 'true';
    if (search) where.OR = [
      { key:  { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
    const flags = await this.prisma.featureFlag.findMany({
      where, orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    // Group by category
    const grouped: Record<string, any[]> = {};
    for (const f of flags) {
      if (!grouped[f.category]) grouped[f.category] = [];
      grouped[f.category].push(f);
    }
    return { flags, grouped, total: flags.length, enabled: flags.filter(f => f.is_enabled).length };
  }

  async getPublic() {
    // Only return enabled flags — for frontend to check
    const flags = await this.prisma.featureFlag.findMany({ where: { is_enabled: true } });
    return Object.fromEntries(flags.map(f => [f.key, {
      enabled: f.is_enabled, rollout_pct: f.rollout_pct,
      target_plans: f.target_plans, target_roles: f.target_roles,
    }]));
  }

  async toggle(key: string, body: { enabled: boolean; actor?: string; notes?: string }) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new NotFoundException(`Feature flag '${key}' not found`);

    const old = { is_enabled: flag.is_enabled, rollout_pct: flag.rollout_pct };
    const updated = await this.prisma.featureFlag.update({
      where: { key },
      data: {
        is_enabled: body.enabled,
        enabled_at: body.enabled && !flag.enabled_at ? new Date() : flag.enabled_at,
        notes:      body.notes ?? flag.notes,
        updated_by: body.actor,
      },
    });

    await this.prisma.featureFlagLog.create({ data: {
      flag_id:  flag.id, flag_key: key,
      action:   body.enabled ? 'enabled' : 'disabled',
      old_value: old,
      new_value: { is_enabled: body.enabled },
      actor:    body.actor,
    }});

    return updated;
  }

  async update(key: string, body: any) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new NotFoundException(`Feature '${key}' not found`);

    const old = { is_enabled: flag.is_enabled, rollout_pct: flag.rollout_pct, target_plans: flag.target_plans };

    const data: any = { updated_by: body.actor };
    if (body.is_enabled     !== undefined) data.is_enabled    = body.is_enabled;
    if (body.rollout_pct    !== undefined) data.rollout_pct   = body.rollout_pct;
    if (body.target_plans   !== undefined) data.target_plans  = body.target_plans;
    if (body.target_roles   !== undefined) data.target_roles  = body.target_roles;
    if (body.target_zones   !== undefined) data.target_zones  = body.target_zones;
    if (body.scheduled_on   !== undefined) data.scheduled_on  = body.scheduled_on ? new Date(body.scheduled_on) : null;
    if (body.scheduled_off  !== undefined) data.scheduled_off = body.scheduled_off ? new Date(body.scheduled_off) : null;
    if (body.notes          !== undefined) data.notes         = body.notes;
    if (body.name           !== undefined) data.name          = body.name;
    if (body.description    !== undefined) data.description   = body.description;
    if (body.is_enabled === true && !flag.enabled_at) data.enabled_at = new Date();

    const updated = await this.prisma.featureFlag.update({ where: { key }, data });

    await this.prisma.featureFlagLog.create({ data: {
      flag_id: flag.id, flag_key: key, action: 'updated',
      old_value: old, new_value: data, actor: body.actor,
    }});

    return updated;
  }

  async bulkToggle(keys: string[], enabled: boolean, actor?: string) {
    const results = await Promise.allSettled(keys.map(k => this.toggle(k, { enabled, actor })));
    return { updated: results.filter(r => r.status === 'fulfilled').length, total: keys.length };
  }

  async getLogs(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new NotFoundException();
    return this.prisma.featureFlagLog.findMany({
      where: { flag_id: flag.id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  async checkAccess(key: string, context: { plan?: string; role?: string; zone?: string; userId?: string }): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag || !flag.is_enabled) return false;

    // Rollout percentage check (deterministic by userId)
    if (flag.rollout_pct < 100 && context.userId) {
      const hash = context.userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 100;
      if (hash >= flag.rollout_pct) return false;
    }

    // Plan check
    if (flag.target_plans.length > 0 && context.plan) {
      if (!flag.target_plans.includes(context.plan)) return false;
    }

    // Role check
    if (flag.target_roles.length > 0 && context.role) {
      if (!flag.target_roles.includes(context.role)) return false;
    }

    return true;
  }

  async getStats() {
    const [total, enabled, byCategory] = await Promise.all([
      this.prisma.featureFlag.count(),
      this.prisma.featureFlag.count({ where: { is_enabled: true } }),
      this.prisma.featureFlag.groupBy({ by: ['category'], _count: true, _sum: { rollout_pct: true } }),
    ]);
    return { total, enabled, disabled: total - enabled, by_category: byCategory };
  }
}

@Roles('admin')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private svc: FeatureFlagsService) {}

  @Get()          all(@Query() q: any)        { return this.svc.getAll(q); }
  @Public()
  @Get('public')  pub()                        { return this.svc.getPublic(); }
  @Get('stats')   stats()                      { return this.svc.getStats(); }
  @Get(':key/logs') logs(@Param('key') k: string) { return this.svc.getLogs(k); }
  @Public()
  @Get('check/:key') check(@Param('key') k: string, @Query() q: any) { return this.svc.checkAccess(k, q); }

  @Patch(':key/toggle')
  toggle(@Param('key') k: string, @Body() b: any) { return this.svc.toggle(k, b); }

  @Patch(':key')
  update(@Param('key') k: string, @Body() b: any) { return this.svc.update(k, b); }

  @Post('bulk-toggle')
  bulkToggle(@Body() b: { keys: string[]; enabled: boolean; actor?: string }) {
    return this.svc.bulkToggle(b.keys, b.enabled, b.actor);
  }
}

@Module({ controllers: [FeatureFlagsController], providers: [FeatureFlagsService], exports: [FeatureFlagsService] })
export class FeatureFlagsModule {}
