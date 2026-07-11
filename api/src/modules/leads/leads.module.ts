import {
  Module, Controller, Get, Post, Body, Param, Query, Injectable,
  Request, ForbiddenException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';
import { sendEmail } from '../email/email.module';

// ─────────────────────────────────────────────────────────────────────────────
// LEADS — buyer requests received by a dealer, and how the dealer acts on them.
//
// A buyer's "Request this vehicle" (see crm.module.ts → POST /crm/leads)
// currently only fires a notification. This module gives the dealer real
// actions on top of that Lead row:
//   • Accept   — confirms the buyer's offer/request as-is
//   • Counter  — proposes a different price/terms back to the buyer
//   • Reject   — politely declines, with an optional reason
//   • Contact  — logs a call/WhatsApp/email touchpoint and, for WhatsApp/tel,
//                returns a ready-to-use deep link the dealer's browser opens
//
// Every action is logged as a LeadActivity (audit trail / timeline) and, when
// the buyer left an email, triggers a short courteous email so the buyer isn't
// left hanging — this does not require the buyer to have an account.
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_FOR_DECISION: Record<string, string> = {
  accepted: 'negotiating',   // moves the deal forward — dealer still closes it manually
  countered: 'negotiating',
  rejected: 'lost',
};

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  private async getOwnedLead(id: string, dealerId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id }, include: { vehicle: { select: { id: true, make: true, model: true, year: true, price_aed: true } }, dealer: { select: { id: true, company_name: true, phone: true, email: true } } },
    });
    if (!lead) throw new NotFoundException('Request not found');
    if (lead.dealer_id !== dealerId) throw new ForbiddenException('You can only manage your own requests');
    return lead;
  }

  async list(dealerId: string, q: { stage?: string; decision?: string; limit?: number }) {
    const where: any = { dealer_id: dealerId };
    if (q.stage) where.stage = q.stage;
    if (q.decision) where.dealer_decision = q.decision;
    if (q.decision === 'pending') { where.dealer_decision = null; }

    const leads = await this.prisma.lead.findMany({
      where, orderBy: { created_at: 'desc' }, take: Math.min(q.limit || 100, 300),
      include: { vehicle: { select: { id: true, make: true, model: true, year: true, price_aed: true, view_count: true } } },
    });

    const pending = await this.prisma.lead.count({ where: { dealer_id: dealerId, dealer_decision: null, stage: { notIn: ['won', 'lost'] } } });
    return { total: leads.length, pending_action: pending, leads };
  }

  async get(dealerId: string, id: string) {
    const lead = await this.getOwnedLead(id, dealerId);
    const activities = await this.prisma.leadActivity.findMany({
      where: { lead_id: id }, orderBy: { created_at: 'desc' },
      include: { user: { select: { email: true } } },
    });
    return { ...lead, activities };
  }

  // ── Accept ───────────────────────────────────────────────────────────────
  async accept(dealerId: string, id: string, actorId: string | undefined, note?: string) {
    const lead = await this.getOwnedLead(id, dealerId);
    if (lead.dealer_decision) throw new BadRequestException(`This request was already ${lead.dealer_decision}`);

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { dealer_decision: 'accepted', dealer_response_note: note, responded_at: new Date(), responded_by: actorId, stage: STAGE_FOR_DECISION.accepted },
    });
    await this.prisma.leadActivity.create({
      data: { lead_id: id, type: 'accepted', note: note || 'Dealer accepted the request', created_by: actorId },
    });

    await this.notifyBuyer(lead, {
      subject: `Good news — your request has been accepted`,
      body: `${lead.dealer.company_name} has accepted your request${lead.vehicle ? ` for the ${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : ''}${lead.offer_price ? ` at AED ${Number(lead.offer_price).toLocaleString()}` : ''}.${note ? `\n\nMessage from the dealer: "${note}"` : ''}\n\nThe dealer will contact you shortly to finalize the details.`,
    });
    return updated;
  }

  // ── Counter-offer ────────────────────────────────────────────────────────
  async counter(dealerId: string, id: string, actorId: string | undefined, price: number, note?: string) {
    if (!price || price <= 0) throw new BadRequestException('A valid counter price is required');
    const lead = await this.getOwnedLead(id, dealerId);
    if (lead.dealer_decision === 'accepted' || lead.dealer_decision === 'rejected') {
      throw new BadRequestException(`This request was already ${lead.dealer_decision}`);
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { dealer_decision: 'countered', dealer_counter_price: price, dealer_response_note: note, responded_at: new Date(), responded_by: actorId, stage: STAGE_FOR_DECISION.countered },
    });
    await this.prisma.leadActivity.create({
      data: { lead_id: id, type: 'countered', note: `Counter-offer: AED ${price.toLocaleString()}${note ? ` — ${note}` : ''}`, created_by: actorId },
    });

    await this.notifyBuyer(lead, {
      subject: `${lead.dealer.company_name} sent you a counter-offer`,
      body: `Thanks for your interest${lead.vehicle ? ` in the ${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : ''}.\n\n${lead.dealer.company_name} proposes: AED ${price.toLocaleString()}${lead.offer_price ? ` (your original offer was AED ${Number(lead.offer_price).toLocaleString()})` : ''}.${note ? `\n\nMessage from the dealer: "${note}"` : ''}\n\nReply to this email or contact the dealer directly to continue the conversation.`,
    });
    return updated;
  }

  // ── Reject ───────────────────────────────────────────────────────────────
  async reject(dealerId: string, id: string, actorId: string | undefined, note?: string) {
    const lead = await this.getOwnedLead(id, dealerId);
    if (lead.dealer_decision) throw new BadRequestException(`This request was already ${lead.dealer_decision}`);

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { dealer_decision: 'rejected', dealer_response_note: note, responded_at: new Date(), responded_by: actorId, stage: STAGE_FOR_DECISION.rejected },
    });
    await this.prisma.leadActivity.create({
      data: { lead_id: id, type: 'rejected', note: note || 'Dealer declined the request', created_by: actorId },
    });

    await this.notifyBuyer(lead, {
      subject: `Update on your request`,
      body: `Thank you for your interest${lead.vehicle ? ` in the ${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : ''}. Unfortunately ${lead.dealer.company_name} is unable to proceed with this request at this time.${note ? `\n\nMessage from the dealer: "${note}"` : ''}\n\nFeel free to browse similar vehicles on DubaiAuto.`,
    });
    return updated;
  }

  // ── Reopen (undo a decision, e.g. dealer changes their mind) ────────────
  async reopen(dealerId: string, id: string, actorId: string | undefined) {
    await this.getOwnedLead(id, dealerId);
    const updated = await this.prisma.lead.update({
      where: { id },
      data: { dealer_decision: null, dealer_counter_price: null, dealer_response_note: null, responded_at: null, responded_by: null, stage: 'new' },
    });
    await this.prisma.leadActivity.create({ data: { lead_id: id, type: 'reopened', note: 'Dealer reopened the request', created_by: actorId } });
    return updated;
  }

  // ── Direct contact (call / WhatsApp / email) — logs + returns a deep link ─
  async contact(dealerId: string, id: string, actorId: string | undefined, channel: 'call' | 'whatsapp' | 'email', note?: string) {
    const lead = await this.getOwnedLead(id, dealerId);

    await this.prisma.leadActivity.create({
      data: { lead_id: id, type: `contact_${channel}`, note: note || `Dealer contacted buyer via ${channel}`, created_by: actorId },
    });
    if (lead.stage === 'new') {
      await this.prisma.lead.update({ where: { id }, data: { stage: 'contacted' } });
    }

    let deep_link: string | null = null;
    const phone = (lead.buyer_whatsapp || lead.buyer_phone || '').replace(/[^\d+]/g, '');
    if (channel === 'call' && lead.buyer_phone) deep_link = `tel:${lead.buyer_phone.replace(/[^\d+]/g, '')}`;
    if (channel === 'whatsapp' && phone) {
      const text = encodeURIComponent(`Hi ${lead.buyer_name || ''}, this is ${lead.dealer.company_name} regarding your request${lead.vehicle ? ` for the ${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : ''}.`);
      deep_link = `https://wa.me/${phone.replace('+', '')}?text=${text}`;
    }
    if (channel === 'email' && lead.buyer_email) {
      const subject = encodeURIComponent(`Regarding your request${lead.vehicle ? ` — ${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : ''}`);
      deep_link = `mailto:${lead.buyer_email}?subject=${subject}`;
    }

    return { logged: true, deep_link };
  }

  // ── Free-form note (timeline) ───────────────────────────────────────────
  async addNote(dealerId: string, id: string, actorId: string | undefined, note: string) {
    if (!note?.trim()) throw new BadRequestException('Note cannot be empty');
    await this.getOwnedLead(id, dealerId);
    return this.prisma.leadActivity.create({ data: { lead_id: id, type: 'note', note, created_by: actorId } });
  }

  private async notifyBuyer(lead: any, msg: { subject: string; body: string }) {
    if (!lead.buyer_email) return; // best-effort — buyers without an email are still contactable via the dealer's own channels
    try {
      const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <h2 style="color:#111827;margin:0 0 12px;">${msg.subject}</h2>
        <p style="white-space:pre-line;color:#374151;line-height:1.6;font-size:14px;">${msg.body}</p>
        <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">Sent via DubaiAuto on behalf of ${lead.dealer.company_name}.</p>
      </div>`;
      await sendEmail({ to: [{ email: lead.buyer_email, name: lead.buyer_name }], subject: msg.subject, html, from_name: lead.dealer.company_name, reply_to: lead.dealer.email });
    } catch { /* non-blocking — dealer's in-app action already succeeded */ }
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Roles('dealer', 'admin')
@Controller('leads')
export class LeadsController {
  constructor(private svc: LeadsService) {}

  private dealerScope(dealerId: string, req: any) {
    if (req.user?.role === 'admin') return;
    if (req.user?.dealerId !== dealerId) throw new ForbiddenException('You can only access your own requests');
  }

  @Get('dealer/:dealerId')
  list(@Param('dealerId') dealerId: string, @Query() q: any, @Request() req: any) {
    this.dealerScope(dealerId, req);
    return this.svc.list(dealerId, { stage: q.stage, decision: q.decision, limit: q.limit ? +q.limit : undefined });
  }

  @Get('dealer/:dealerId/:id')
  get(@Param('dealerId') dealerId: string, @Param('id') id: string, @Request() req: any) {
    this.dealerScope(dealerId, req);
    return this.svc.get(dealerId, id);
  }

  @Post('dealer/:dealerId/:id/accept')
  accept(@Param('dealerId') dealerId: string, @Param('id') id: string, @Body() b: { note?: string }, @Request() req: any) {
    this.dealerScope(dealerId, req);
    return this.svc.accept(dealerId, id, req.user?.userId, b?.note);
  }

  @Post('dealer/:dealerId/:id/counter')
  counter(@Param('dealerId') dealerId: string, @Param('id') id: string, @Body() b: { price: number; note?: string }, @Request() req: any) {
    this.dealerScope(dealerId, req);
    return this.svc.counter(dealerId, id, req.user?.userId, Number(b?.price), b?.note);
  }

  @Post('dealer/:dealerId/:id/reject')
  reject(@Param('dealerId') dealerId: string, @Param('id') id: string, @Body() b: { note?: string }, @Request() req: any) {
    this.dealerScope(dealerId, req);
    return this.svc.reject(dealerId, id, req.user?.userId, b?.note);
  }

  @Post('dealer/:dealerId/:id/reopen')
  reopen(@Param('dealerId') dealerId: string, @Param('id') id: string, @Request() req: any) {
    this.dealerScope(dealerId, req);
    return this.svc.reopen(dealerId, id, req.user?.userId);
  }

  @Post('dealer/:dealerId/:id/contact')
  contact(@Param('dealerId') dealerId: string, @Param('id') id: string, @Body() b: { channel: 'call' | 'whatsapp' | 'email'; note?: string }, @Request() req: any) {
    this.dealerScope(dealerId, req);
    return this.svc.contact(dealerId, id, req.user?.userId, b.channel, b?.note);
  }

  @Post('dealer/:dealerId/:id/notes')
  addNote(@Param('dealerId') dealerId: string, @Param('id') id: string, @Body() b: { note: string }, @Request() req: any) {
    this.dealerScope(dealerId, req);
    return this.svc.addNote(dealerId, id, req.user?.userId, b?.note);
  }
}

@Module({ controllers: [LeadsController], providers: [LeadsService], exports: [LeadsService] })
export class LeadsModule {}
