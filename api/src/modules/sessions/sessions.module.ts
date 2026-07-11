import { Module, Controller, Get, Post, Body, Query, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';

// A session is considered "online" if it heartbeated in the last 90 seconds.
// The frontend SessionProvider pings every 30s, so 90s gives 2 missed beats of grace.
const ONLINE_WINDOW_MS = 90 * 1000;

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  // Called on login / page load to establish or refresh a session.
  async open(data: {
    session_token?: string; profile_type: string; profile_id?: string;
    display_name: string; email?: string; current_page?: string;
  }) {
    const token = data.session_token || randomBytes(16).toString('hex');
    const avatar = (data.display_name || '?').trim().charAt(0).toUpperCase();

    const session = await this.prisma.activeSession.upsert({
      where: { session_token: token },
      create: {
        session_token: token,
        profile_type: data.profile_type,
        profile_id: data.profile_id,
        display_name: data.display_name,
        avatar_label: avatar,
        email: data.email,
        current_page: data.current_page,
      },
      update: {
        profile_type: data.profile_type,
        profile_id: data.profile_id,
        display_name: data.display_name,
        avatar_label: avatar,
        email: data.email,
        current_page: data.current_page,
        last_seen_at: new Date(),
      },
    });
    return session;
  }

  // Lightweight heartbeat — just bumps last_seen_at and optionally the current page.
  async heartbeat(token: string, currentPage?: string) {
    try {
      return await this.prisma.activeSession.update({
        where: { session_token: token },
        data: { last_seen_at: new Date(), ...(currentPage ? { current_page: currentPage } : {}) },
      });
    } catch {
      // Session row was pruned or never existed — caller should re-open.
      return null;
    }
  }

  async close(token: string) {
    try { await this.prisma.activeSession.delete({ where: { session_token: token } }); }
    catch { /* already gone */ }
    return { ok: true };
  }

  // Periodically called (and on every read) to drop stale rows.
  private async prune() {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000); // keep table bounded, hard cap 24h
    await this.prisma.activeSession.deleteMany({ where: { last_seen_at: { lt: cutoff } } });
  }

  // ── Admin: who's currently online ───────────────────────────────────────────

  async getOnline(q: { profile_type?: string } = {}) {
    await this.prune();
    const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
    const where: any = { last_seen_at: { gte: cutoff } };
    if (q.profile_type) where.profile_type = q.profile_type;

    const sessions = await this.prisma.activeSession.findMany({
      where, orderBy: { last_seen_at: 'desc' }, take: 200,
    });

    const byType: Record<string, number> = { broker: 0, dealer: 0, buyer: 0, admin: 0 };
    for (const s of sessions) byType[s.profile_type] = (byType[s.profile_type] || 0) + 1;

    return {
      total_online: sessions.length,
      by_type: byType,
      sessions: sessions.map(s => ({
        id: s.id, profile_type: s.profile_type, profile_id: s.profile_id,
        display_name: s.display_name, avatar_label: s.avatar_label, email: s.email,
        current_page: s.current_page, last_seen_at: s.last_seen_at,
        seconds_ago: Math.round((Date.now() - s.last_seen_at.getTime()) / 1000),
      })),
    };
  }

  async getStats() {
    await this.prune();
    const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
    const [total, byType] = await Promise.all([
      this.prisma.activeSession.count({ where: { last_seen_at: { gte: cutoff } } }),
      this.prisma.activeSession.groupBy({
        by: ['profile_type'],
        where: { last_seen_at: { gte: cutoff } },
        _count: true,
      }),
    ]);
    return { total_online: total, by_type: byType.map(b => ({ type: b.profile_type, count: b._count })) };
  }
}

@Roles('admin')
@Controller('sessions')
export class SessionsController {
  constructor(private svc: SessionsService) {}

  @Post('open')
  open(@Body() body: any) { return this.svc.open(body); }

  @Post('heartbeat')
  heartbeat(@Body() body: { session_token: string; current_page?: string }) {
    return this.svc.heartbeat(body.session_token, body.current_page);
  }

  @Post('close')
  close(@Body() body: { session_token: string }) { return this.svc.close(body.session_token); }

  @Get('online')
  online(@Query() q: any) { return this.svc.getOnline(q); }

  @Get('stats')
  stats() { return this.svc.getStats(); }
}

@Module({
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
