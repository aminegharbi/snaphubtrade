import {
  Module, Controller, Get, Post, Patch, Delete, Body, Param, Query,
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';
import { sendEmail } from '../email/email.module';

// ─────────────────────────────────────────────────────────────────────────────
// DEALER PROSPECTS — the outbound funnel for onboarding GCC free-zone dealers.
// Seeded at startup (prisma/seed-market-dataset.ts), completed by the admin
// (emails are never guessed), then invited via a templated mailing that
// carries: platform access link, account-creation link, password-reset link.
// Funnel: prospect → invited → registered (auto-detected by matching email).
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SUBJECT = 'Your dealership on SnapHubTrade.com — The AI Automotive Trade Hub for the GCC';

// {{placeholders}}: company_name, free_zone, access_link, register_link, reset_link, sender_name
const DEFAULT_TEMPLATE = `Dear {{company_name}} team,

We are onboarding a first wave of established dealers from {{free_zone}} onto SnapHubTrade.com — The AI Automotive Trade Hub for the GCC.

In one platform, you get:
• Your full stock listed and managed in seconds — no more spreadsheets
• An AI sales copilot (AI Twin) that briefs you every morning: pricing, hot buyers, export opportunities
• Real GCC market intelligence: fair market value and demand trends per model
• Every buyer request in one inbox — accept, counter or reject in one click
• A cross-border network of dealers and brokers across the Gulf

Getting started takes two minutes:
→ Create your dealer account: {{register_link}}
→ Already registered? Access the platform: {{access_link}}
→ Forgot your password? Reset it here: {{reset_link}}

We would be glad to set up your dashboard and your first market sync personally.

Best regards,
{{sender_name}}
SnapHubTrade.com — The AI Automotive Trade Hub for the GCC`;

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

@Injectable()
export class ProspectsService {
  private logger = new Logger('Prospects');
  constructor(private prisma: PrismaService) {}

  async list(q: { status?: string; country?: string; free_zone?: string; search?: string; limit?: number }) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.country) where.country = q.country;
    if (q.free_zone) where.free_zone = { contains: q.free_zone, mode: 'insensitive' };
    if (q.search) where.company_name = { contains: q.search, mode: 'insensitive' };

    const [prospects, total, invited, registered, withEmail] = await Promise.all([
      this.prisma.dealerProspect.findMany({ where, orderBy: [{ country: 'asc' }, { free_zone: 'asc' }, { company_name: 'asc' }], take: Math.min(q.limit || 200, 500) }),
      this.prisma.dealerProspect.count(),
      this.prisma.dealerProspect.count({ where: { status: 'invited' } }),
      this.prisma.dealerProspect.count({ where: { status: 'registered' } }),
      this.prisma.dealerProspect.count({ where: { email: { not: null } } }),
    ]);
    return { prospects, stats: { total, invited, registered, with_email: withEmail } };
  }

  async create(data: any) {
    if (!data.company_name) throw new BadRequestException('company_name is required');
    return this.prisma.dealerProspect.create({
      data: {
        company_name: data.company_name, country: data.country || 'AE',
        emirate: data.emirate, free_zone: data.free_zone,
        email: data.email || null, phone: data.phone || null, website: data.website || null,
        specialties: data.specialties, notes: data.notes, source: 'manual',
      },
    });
  }

  async update(id: string, data: any) {
    const allowed: any = {};
    for (const k of ['company_name', 'country', 'emirate', 'free_zone', 'email', 'phone', 'website', 'specialties', 'notes', 'status']) {
      if (data[k] !== undefined) allowed[k] = data[k] === '' ? null : data[k];
    }
    try { return await this.prisma.dealerProspect.update({ where: { id }, data: allowed }); }
    catch { throw new NotFoundException('Prospect not found'); }
  }

  async remove(id: string) {
    try { await this.prisma.dealerProspect.delete({ where: { id } }); return { deleted: true }; }
    catch { throw new NotFoundException('Prospect not found'); }
  }

  // Bulk import — array of rows (parsed CSV on the frontend). Upserts on
  // (company_name, free_zone) so re-importing the same file is safe.
  async import(rows: any[]) {
    if (!Array.isArray(rows) || !rows.length) throw new BadRequestException('rows[] required');
    let created = 0, updated = 0;
    for (const r of rows.slice(0, 1000)) {
      if (!r.company_name) continue;
      const existing = await this.prisma.dealerProspect.findFirst({ where: { company_name: r.company_name, free_zone: r.free_zone || null } });
      if (existing) {
        await this.prisma.dealerProspect.update({ where: { id: existing.id }, data: { email: r.email || existing.email, phone: r.phone || existing.phone, website: r.website || existing.website } });
        updated++;
      } else {
        await this.prisma.dealerProspect.create({
          data: { company_name: r.company_name, country: r.country || 'AE', emirate: r.emirate, free_zone: r.free_zone, email: r.email || null, phone: r.phone || null, website: r.website || null, specialties: r.specialties, source: 'csv_import' },
        });
        created++;
      }
    }
    return { created, updated };
  }

  getTemplate() {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return {
      subject: DEFAULT_SUBJECT,
      body: DEFAULT_TEMPLATE,
      placeholders: ['company_name', 'free_zone', 'access_link', 'register_link', 'reset_link', 'sender_name'],
      links: {
        access_link: frontendUrl,
        register_link: `${frontendUrl}/register-dealer`,
        reset_link: `${frontendUrl}/login?reset=1`,
      },
    };
  }

  // Sends the invitation mailing. target: 'all' (every prospect with an
  // email, never re-inviting 'registered'), or an explicit list of ids.
  // subject/body optional — defaults to the built-in template.
  async invite(opts: { ids?: string[]; all?: boolean; subject?: string; body?: string; sender_name?: string }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const subjectTpl = opts.subject?.trim() || DEFAULT_SUBJECT;
    const bodyTpl = opts.body?.trim() || DEFAULT_TEMPLATE;
    const senderName = opts.sender_name?.trim() || 'The SnapHubTrade.com team';

    const where: any = opts.all
      ? { email: { not: null }, status: { not: 'registered' } }
      : { id: { in: opts.ids || [] } };
    const targets = await this.prisma.dealerProspect.findMany({ where });
    if (!targets.length) throw new BadRequestException(opts.all ? 'No prospects with an email address to invite — complete their contact details first.' : 'No matching prospects');

    const skippedNoEmail = targets.filter(t => !t.email);
    const sendable = targets.filter(t => !!t.email);

    let sent = 0, failed = 0;
    for (const p of sendable) {
      const vars = {
        company_name: p.company_name,
        free_zone: p.free_zone || 'your free zone',
        access_link: frontendUrl,
        register_link: `${frontendUrl}/register-dealer`,
        reset_link: `${frontendUrl}/login?reset=1`,
        sender_name: senderName,
      };
      const bodyText = renderTemplate(bodyTpl, vars);
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:28px;color:#111827;">
        <div style="margin-bottom:20px;font-size:1.15rem;font-weight:800;">SnapHub<span style="color:#C1272D;">Trade.com</span></div>
        <div style="white-space:pre-line;font-size:14px;line-height:1.65;color:#374151;">${bodyText
          .replace(new RegExp(vars.register_link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `<a href="${vars.register_link}" style="color:#C1272D;font-weight:700;">Create your dealer account</a>`)
          .replace(new RegExp(vars.reset_link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `<a href="${vars.reset_link}" style="color:#C1272D;">Reset your password</a>`)
          .replace(new RegExp(`(?<!register-dealer|reset=1)${vars.access_link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!/register-dealer|/login)`, 'g'), `<a href="${vars.access_link}" style="color:#C1272D;">Access the platform</a>`)}</div>
        <a href="${vars.register_link}" style="display:inline-block;margin-top:22px;padding:12px 26px;background:#C1272D;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Create my dealer account →</a>
        <p style="margin-top:26px;font-size:11px;color:#9CA3AF;">You are receiving this because your dealership operates in a GCC automotive trade zone. Reply to this email to be removed from our list.</p>
      </div>`;

      const result = await sendEmail({ to: [{ email: p.email!, name: p.company_name }], subject: renderTemplate(subjectTpl, vars), html, from_name: 'SnapHubTrade.com' });
      if (result.success) {
        sent++;
        await this.prisma.dealerProspect.update({
          where: { id: p.id },
          data: { status: p.status === 'registered' ? 'registered' : 'invited', invited_at: new Date(), invite_count: { increment: 1 } },
        });
      } else {
        failed++;
        this.logger.warn(`Invite to ${p.company_name} <${p.email}> failed: ${result.error}`);
      }
    }

    return { sent, failed, skipped_no_email: skippedNoEmail.length, total_targeted: targets.length };
  }

  // Marks prospects whose email now matches a real registered dealer account.
  async syncRegistered() {
    const prospects = await this.prisma.dealerProspect.findMany({ where: { email: { not: null }, status: { not: 'registered' } } });
    let matched = 0;
    for (const p of prospects) {
      const dealer = await this.prisma.dealer.findFirst({ where: { email: { equals: p.email!, mode: 'insensitive' } } });
      if (dealer) { await this.prisma.dealerProspect.update({ where: { id: p.id }, data: { status: 'registered' } }); matched++; }
    }
    return { matched };
  }
}

// ─── Controller (admin-only) ─────────────────────────────────────────────────

@Roles('admin')
@Controller('prospects')
export class ProspectsController {
  constructor(private svc: ProspectsService) {}

  @Get()                 list(@Query() q: any) { return this.svc.list({ ...q, limit: q.limit ? +q.limit : undefined }); }
  @Get('template')       template() { return this.svc.getTemplate(); }
  @Post()                create(@Body() b: any) { return this.svc.create(b); }
  @Post('import')        import_(@Body() b: { rows: any[] }) { return this.svc.import(b?.rows); }
  @Post('invite')        invite(@Body() b: any) { return this.svc.invite(b); }
  @Post('sync-registered') syncRegistered() { return this.svc.syncRegistered(); }
  @Patch(':id')          update(@Param('id') id: string, @Body() b: any) { return this.svc.update(id, b); }
  @Delete(':id')         remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ controllers: [ProspectsController], providers: [ProspectsService] })
export class ProspectsModule {}
