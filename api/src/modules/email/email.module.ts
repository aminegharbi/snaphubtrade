import {
  Module, Controller, Get, Post, Patch, Delete, Body, Param, Query,
  Injectable, NotFoundException, Res, Req, OnModuleInit, OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { getAIClient, aiModel } from '../../shared/ai/ai-client';
import { Roles } from '../../shared/auth/roles.decorator';

// ─── Types ────────────────────────────────────────────────────────────────────
type BlockType = 'header'|'text'|'button'|'image'|'divider'|'stats'|'footer'|'spacer';
interface EmailBlock { type: BlockType; [key: string]: any; }

// ─── Email Renderer ───────────────────────────────────────────────────────────
function renderBlocksToHTML(blocks: EmailBlock[], trackingBase: string, trackingId: string): string {
  const rows = blocks.map(b => {
    switch (b.type) {
      case 'header': return `
        <tr><td style="background:${b.bg||'#111827'};padding:40px 32px;text-align:center;">
          ${b.logo?`<img src="${b.logo}" alt="Logo" height="36" style="margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;">`:'<div style="font-size:22px;font-weight:900;color:white;margin-bottom:16px;">DubaiAuto</div>'}
          <h1 style="color:${b.headline_color||'white'};font-size:26px;font-weight:800;margin:0 0 8px;line-height:1.3;">${b.headline||''}</h1>
          ${b.subtitle?`<p style="color:rgba(255,255,255,0.65);font-size:15px;margin:0;">${b.subtitle}</p>`:''}
        </td></tr>`;
      case 'text': return `
        <tr><td style="padding:28px 32px;text-align:${b.align||'left'};">
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">${(b.content||'content').replace(/\n/g,'<br>')}</p>
        </td></tr>`;
      case 'button': return `
        <tr><td style="padding:8px 32px 28px;text-align:${b.align||'center'};">
          <a href="${b.url||'#'}" style="display:inline-block;background:${b.color||'#C1272D'};color:white;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">${b.text||'Learn more'}</a>
        </td></tr>`;
      case 'image': return `
        <tr><td style="padding:${b.padding||'0'};">
          <img src="${b.url||''}" alt="${b.alt||''}" style="width:100%;display:block;${b.rounded?'border-radius:12px;':''}" />
        </td></tr>`;
      case 'divider': return `
        <tr><td style="padding:16px 32px;"><div style="height:1px;background:${b.color||'#E5E7EB'};"></div></td></tr>`;
      case 'spacer': return `<tr><td style="height:${b.height||32}px;"></td></tr>`;
      case 'stats': {
        const items = b.items||[];
        const cells = items.map((it:any)=>`<td style="text-align:center;padding:0 16px;"><p style="font-size:28px;font-weight:900;color:#C1272D;margin:0 0 4px;">${it.value}</p><p style="font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.05em;margin:0;">${it.label}</p></td>`).join('<td style="width:1px;background:#F3F4F6;"></td>');
        return `<tr><td style="padding:28px 32px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table></td></tr>`;
      }
      case 'footer': return `
        <tr><td style="background:#F9FAFB;padding:24px 32px;text-align:center;">
          <p style="color:#9CA3AF;font-size:12px;margin:0 0 8px;">${b.content||'DubaiAuto · Dubai Free Zone, UAE'}</p>
          <a href="${trackingBase}/email/unsubscribe/{{unsubscribe_token}}" style="color:#9CA3AF;font-size:12px;">Unsubscribe</a>
        </td></tr>`;
      default: return '';
    }
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>Email</title></head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<img src="${trackingBase}/email/open/${trackingId}" width="1" height="1" style="display:none;" alt="">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;">
  <tr><td align="center" style="padding:24px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      ${rows}
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ─── Email Provider ───────────────────────────────────────────────────────────
export async function sendEmail(opts: {
  to: {email:string; name?:string}[];
  subject: string; html: string;
  from_name?: string; from_email?: string; reply_to?: string;
}): Promise<{success:boolean; provider_id?:string; error?:string}> {
  const provider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
  const from = `${opts.from_name||'DubaiAuto'} <${opts.from_email||process.env.EMAIL_FROM||'noreply@dubaiauto.ae'}>`;

  if (provider === 'resend' && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method:'POST', headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ from, to: opts.to.map(r=>`${r.name||''} <${r.email}>`), subject: opts.subject, html: opts.html, ...(opts.reply_to?{reply_to:opts.reply_to}:{}) }),
      });
      const data: any = await res.json();
      return res.ok ? { success:true, provider_id:data.id } : { success:false, error:data.message||'Resend error' };
    } catch(e:any) { return { success:false, error:e.message }; }
  }

  if (provider === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method:'POST', headers:{ Authorization:`Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ personalizations:[{to:opts.to.map(r=>({email:r.email,name:r.name}))}], from:{email:opts.from_email||'noreply@dubaiauto.ae',name:opts.from_name||'DubaiAuto'}, subject:opts.subject, content:[{type:'text/html',value:opts.html}] }),
      });
      return res.ok ? {success:true} : {success:false,error:`SendGrid ${res.status}`};
    } catch(e:any) { return {success:false,error:e.message}; }
  }

  // Console fallback (dev/test)
  console.log(`[EmailProvider:console] TO:${opts.to.map(r=>r.email).join(',')} SUBJECT:"${opts.subject}"`);
  return { success:true, provider_id:`dev-${Date.now()}` };
}

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private ai = getAIClient();
  private baseUrl = process.env.FRONTEND_URL || 'https://dubaiauto.ae';
  private weeklyTimer: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Hourly check for "is it Monday and haven't run this week yet" — same
    // no-external-cron pattern already used by AI Twin's nightly brief.
    this.weeklyTimer = setInterval(() => this.maybeRunWeeklyAutomations().catch(()=>{}), 60*60*1000);
  }
  onModuleDestroy() {
    if (this.weeklyTimer) clearInterval(this.weeklyTimer);
  }

  // ── Audience resolution ────────────────────────────────────────────────────
  async resolveSegment(segment: string, customFilters?: any): Promise<{email:string;name:string;unsubscribe_token?:string}[]> {
    if (segment === 'custom') return this.resolveAdvancedFilters(customFilters);
    const unsubs = await this.prisma.emailUnsubscribe.findMany({ select:{email:true} });
    const unsubEmails = new Set(unsubs.map(u=>u.email.toLowerCase()));
    const filter = (arr:{email:string;name:string}[]) => arr.filter(r=>!unsubEmails.has(r.email.toLowerCase()));

    if (segment==='all_dealers'||segment==='active_dealers') {
      const where:any = {verified:true};
      if (segment==='active_dealers') where.user={last_login_at:{gte:new Date(Date.now()-30*86400000)}};
      const dealers = await this.prisma.dealer.findMany({ where, select:{email:true,company_name:true} });
      return filter(dealers.filter(d=>d.email).map(d=>({email:d.email!,name:d.company_name})));
    }
    if (segment==='inactive_dealers') {
      const dealers = await this.prisma.dealer.findMany({ where:{verified:true}, select:{email:true,company_name:true} });
      return filter(dealers.map(d=>({email:d.email,name:d.company_name})));
    }
    if (segment==='all_brokers') {
      const brokers = await this.prisma.broker.findMany({ where:{status:'active'}, select:{email:true,full_name:true} });
      return filter(brokers.map(b=>({email:b.email,name:b.full_name})));
    }
    if (segment==='all_buyers') {
      const users = await this.prisma.user.findMany({ select:{email:true,full_name:true} });
      return filter(users.map(u=>({email:u.email,name:u.full_name||'Customer'})));
    }
    if (segment==='all') {
      const [dealers,brokers,users] = await Promise.all([
        this.prisma.dealer.findMany({ where:{verified:true}, select:{email:true,company_name:true} }),
        this.prisma.broker.findMany({ where:{status:'active'}, select:{email:true,full_name:true} }),
        this.prisma.user.findMany({ select:{email:true,full_name:true} }),
      ]);
      const all = [
        ...dealers.map(d=>({email:d.email,name:d.company_name})),
        ...brokers.map(b=>({email:b.email,name:b.full_name})),
        ...users.map(u=>({email:u.email,name:u.full_name||'Customer'})),
      ];
      const seen = new Set<string>();
      return filter(all.filter(r=>{ if(seen.has(r.email)) return false; seen.add(r.email); return true; }));
    }
    return [];
  }

  // ── Advanced segmentation (GCC-specific criteria) ────────────────────────────
  // The named segments above (all_dealers, active_dealers, ...) stay as quick
  // presets. This adds real multi-criteria targeting: country, region, free
  // zone, activity type, vehicle count, makes, subscription plan, recent
  // activity, language, verified status — combined with AND. Used when a
  // campaign's segment === 'custom' and custom_filters is set.
  async resolveAdvancedFilters(filters: any = {}): Promise<{email:string;name:string}[]> {
    const f = filters || {};
    const unsubs = await this.prisma.emailUnsubscribe.findMany({ select:{email:true} });
    const unsubEmails = new Set(unsubs.map(u=>u.email.toLowerCase()));

    if (f.audience === 'broker') {
      const where: any = { status: 'active' };
      if (f.country_id) where.country_id = f.country_id;
      const brokers = await this.prisma.broker.findMany({ where, select:{ email:true, full_name:true } });
      return brokers.filter(b=>b.email && !unsubEmails.has(b.email.toLowerCase())).map(b=>({email:b.email!,name:b.full_name}));
    }

    const where: any = {};
    if (f.country_id) where.country_id = f.country_id;
    if (f.free_zone_id) where.free_zone_id = f.free_zone_id;
    if (f.subscription_tier) where.subscription_tier = f.subscription_tier;
    if (f.verified_only) where.verified = true;
    if (f.language) where.languages = { has: f.language };
    if (f.makes?.length) where.vehicles = { some: { make: { in: f.makes } } };

    let dealers = await this.prisma.dealer.findMany({
      where, select:{ id:true, company_name:true, email:true, user_id:true, _count:{ select:{ vehicles:true } } },
    });

    if (f.min_vehicles) dealers = dealers.filter(d => d._count.vehicles >= f.min_vehicles);

    if (f.inactive_days || f.active_days) {
      const userIds = dealers.map(d=>d.user_id).filter(Boolean) as string[];
      const users = userIds.length ? await this.prisma.user.findMany({ where:{id:{in:userIds}}, select:{id:true,last_login_at:true} }) : [];
      const uMap = new Map(users.map(u=>[u.id,u] as const));
      const now = Date.now();
      dealers = dealers.filter(d => {
        const u = d.user_id ? uMap.get(d.user_id) : null;
        const days = u?.last_login_at ? (now - u.last_login_at.getTime()) / 86400000 : Infinity;
        if (f.inactive_days && days < f.inactive_days) return false;
        if (f.active_days && days > f.active_days) return false;
        return true;
      });
    }

    return dealers.filter(d=>d.email && !unsubEmails.has(d.email!.toLowerCase())).map(d=>({email:d.email!,name:d.company_name}));
  }

  async previewAdvancedFilters(filters: any) {
    const recipients = await this.resolveAdvancedFilters(filters);
    return { count: recipients.length, sample: recipients.slice(0, 10) };
  }

  async getSegmentCount(segment: string, customFilters?: any): Promise<number> {
    const r = await this.resolveSegment(segment, customFilters);
    return r.length;
  }

  // ── Campaigns ──────────────────────────────────────────────────────────────
  async listCampaigns(status?: string) {
    const campaigns = await this.prisma.emailCampaign.findMany({
      where: status?{status}:{},
      orderBy: {created_at:'desc'}, take: 100,
      include: { _count:{select:{sends:true}} },
    });

    // Enrich with real analytics
    return Promise.all(campaigns.map(async c => {
      const [sent,opened,clicked,bounced,unsub] = await Promise.all([
        this.prisma.emailSend.count({ where:{campaign_id:c.id,status:'sent'} }),
        this.prisma.emailSend.count({ where:{campaign_id:c.id,opened:true} }),
        this.prisma.emailSend.count({ where:{campaign_id:c.id,clicked:true} }),
        this.prisma.emailSend.count({ where:{campaign_id:c.id,bounced:true} }),
        this.prisma.emailSend.count({ where:{campaign_id:c.id,unsubscribed:true} }),
      ]);
      return {
        ...c, blocks: undefined,
        stats: {
          sent, opened, clicked, bounced, unsubscribed: unsub,
          open_rate:  sent>0?Math.round((opened/sent)*1000)/10:0,
          click_rate: sent>0?Math.round((clicked/sent)*1000)/10:0,
          bounce_rate:sent>0?Math.round((bounced/sent)*1000)/10:0,
        },
      };
    }));
  }

  async getCampaign(id: string) {
    const c = await this.prisma.emailCampaign.findUnique({ where:{id} });
    if (!c) throw new NotFoundException('Campaign not found');
    const [sent,opened,clicked,bounced,unsub] = await Promise.all([
      this.prisma.emailSend.count({ where:{campaign_id:id,status:'sent'} }),
      this.prisma.emailSend.count({ where:{campaign_id:id,opened:true} }),
      this.prisma.emailSend.count({ where:{campaign_id:id,clicked:true} }),
      this.prisma.emailSend.count({ where:{campaign_id:id,bounced:true} }),
      this.prisma.emailSend.count({ where:{campaign_id:id,unsubscribed:true} }),
    ]);
    const [recipientCount, lastSends] = await Promise.all([
      this.getSegmentCount(c.segment, c.custom_filters),
      this.prisma.emailSend.findMany({ where:{campaign_id:id}, orderBy:{created_at:'desc'}, take:50 }),
    ]);
    return { ...c, recipientCount, stats:{sent,opened,clicked,bounced,unsubscribed:unsub,open_rate:sent>0?Math.round((opened/sent)*1000)/10:0,click_rate:sent>0?Math.round((clicked/sent)*1000)/10:0,bounce_rate:sent>0?Math.round((bounced/sent)*1000)/10:0}, lastSends };
  }

  async createCampaign(data: any) {
    return this.prisma.emailCampaign.create({ data: { name:data.name, subject_a:data.subject_a, subject_b:data.subject_b, preview_text:data.preview_text, from_name:data.from_name||'DubaiAuto', from_email:data.from_email||'noreply@dubaiauto.ae', reply_to:data.reply_to, segment:data.segment||'all_dealers', custom_filters:data.custom_filters||undefined, blocks:data.blocks||[], ab_test:data.ab_test||false, ab_split_pct:data.ab_split_pct||50, tags:data.tags||[], scheduled_at:data.scheduled_at?new Date(data.scheduled_at):undefined } });
  }

  async updateCampaign(id: string, data: any) {
    return this.prisma.emailCampaign.update({ where:{id}, data: { ...(data.name!==undefined&&{name:data.name}), ...(data.subject_a!==undefined&&{subject_a:data.subject_a}), ...(data.subject_b!==undefined&&{subject_b:data.subject_b}), ...(data.preview_text!==undefined&&{preview_text:data.preview_text}), ...(data.from_name!==undefined&&{from_name:data.from_name}), ...(data.from_email!==undefined&&{from_email:data.from_email}), ...(data.reply_to!==undefined&&{reply_to:data.reply_to}), ...(data.segment!==undefined&&{segment:data.segment}), ...(data.custom_filters!==undefined&&{custom_filters:data.custom_filters}), ...(data.blocks!==undefined&&{blocks:data.blocks}), ...(data.ab_test!==undefined&&{ab_test:data.ab_test}), ...(data.ab_split_pct!==undefined&&{ab_split_pct:data.ab_split_pct}), ...(data.tags!==undefined&&{tags:data.tags}), ...(data.scheduled_at!==undefined&&{scheduled_at:data.scheduled_at?new Date(data.scheduled_at):null}), updated_at:new Date() } });
  }

  async deleteCampaign(id: string) {
    const c = await this.prisma.emailCampaign.findUnique({ where:{id} });
    if (!c) throw new NotFoundException();
    if (c.status==='sent') throw new Error('Cannot delete sent campaign');
    return this.prisma.emailCampaign.delete({ where:{id} });
  }

  // ── Sending ────────────────────────────────────────────────────────────────
  async sendCampaign(id: string, testEmail?: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({ where:{id} });
    if (!campaign) throw new NotFoundException();

    const recipients = testEmail ? [{email:testEmail,name:'Test Recipient'}] : await this.resolveSegment(campaign.segment, campaign.custom_filters);
    const totalRecipients = recipients.length;

    if (!testEmail) {
      await this.prisma.emailCampaign.update({ where:{id}, data:{status:'sending',total_recipients:totalRecipients} });
    }

    let sentCount = 0; let failCount = 0;
    const BATCH = 10; // send in batches of 10

    for (let i=0; i<recipients.length; i+=BATCH) {
      const batch = recipients.slice(i, i+BATCH);
      await Promise.all(batch.map(async recipient => {
        const variant = campaign.ab_test && i >= Math.floor(totalRecipients*(campaign.ab_split_pct/100)) ? 'b' : 'a';
        const subject = variant==='b' && campaign.subject_b ? campaign.subject_b : campaign.subject_a;

        // Create send record first (to get tracking_id)
        const sendRecord = await this.prisma.emailSend.create({ data:{ campaign_id:id, recipient_email:recipient.email, recipient_name:recipient.name, subject, variant } });

        const html = renderBlocksToHTML(campaign.blocks as EmailBlock[], `${this.baseUrl}/api/v1`, sendRecord.tracking_id)
          .replace(/{{recipient_name}}/g, recipient.name||'Friend')
          .replace(/{{unsubscribe_token}}/g, sendRecord.tracking_id);

        const result = await sendEmail({ to:[recipient], subject, html, from_name:campaign.from_name, from_email:campaign.from_email, reply_to:campaign.reply_to||undefined });

        await this.prisma.emailSend.update({ where:{id:sendRecord.id}, data:{ status:result.success?'sent':'failed', provider_id:result.provider_id, sent_at:result.success?new Date():undefined } });

        if (result.success) sentCount++; else failCount++;
      }));

      // Small delay between batches to respect rate limits
      if (i+BATCH < recipients.length) await new Promise(r=>setTimeout(r,100));
    }

    if (!testEmail) {
      await this.prisma.emailCampaign.update({ where:{id}, data:{status:'sent',sent_at:new Date()} });
    }

    return { sent:sentCount, failed:failCount, total:totalRecipients, test:!!testEmail };
  }

  // ── Tracking ───────────────────────────────────────────────────────────────
  async trackOpen(trackingId: string) {
    try {
      const send = await this.prisma.emailSend.findUnique({ where:{tracking_id:trackingId} });
      if (send && !send.opened) {
        await this.prisma.emailSend.update({ where:{id:send.id}, data:{opened:true,opened_at:new Date(),open_count:{increment:1}} });
      } else if (send) {
        await this.prisma.emailSend.update({ where:{id:send.id}, data:{open_count:{increment:1}} });
      }
    } catch {}
  }

  async trackClick(trackingId: string, linkId: string): Promise<string> {
    try {
      const [send, link] = await Promise.all([
        this.prisma.emailSend.findUnique({ where:{tracking_id:trackingId} }),
        this.prisma.emailLink.findFirst({ where:{tracking_id:trackingId,link_id:linkId} }),
      ]);
      if (send) await this.prisma.emailSend.update({ where:{id:send.id}, data:{clicked:true,clicked_at:new Date(),click_count:{increment:1}} });
      if (link) await this.prisma.emailLink.update({ where:{id:link.id}, data:{clicks:{increment:1}} });
      return link?.original_url || 'https://dubaiauto.ae';
    } catch { return 'https://dubaiauto.ae'; }
  }

  async unsubscribe(token: string) {
    const send = await this.prisma.emailSend.findUnique({ where:{tracking_id:token} });
    if (send) {
      await Promise.all([
        this.prisma.emailSend.update({ where:{id:send.id}, data:{unsubscribed:true} }),
        this.prisma.emailUnsubscribe.upsert({ where:{email:send.recipient_email}, create:{email:send.recipient_email,reason:'user_request'}, update:{} }),
      ]);
      return { success:true, email:send.recipient_email };
    }
    return { success:false };
  }

  // ── AI Generator ───────────────────────────────────────────────────────────
  async generateEmailWithAI(params: { goal: string; audience: string; tone: string; brand_facts?: string }) {
    const prompt = `You are an expert email copywriter for DubaiAuto, a luxury UAE automotive SaaS marketplace.

CAMPAIGN BRIEF:
- Goal: ${params.goal}
- Audience: ${params.audience}
- Tone: ${params.tone}
- Key facts: ${params.brand_facts||'DubaiAuto: 35+ verified dealers, AED 2B+ inventory GMV, Dubai Free Zone, 40 countries'}

Generate a complete email campaign. Return ONLY valid JSON (no markdown):
{
  "subject_a": "Subject line A (compelling, max 60 chars)",
  "subject_b": "Subject line B for A/B test (different angle, max 60 chars)",
  "preview_text": "Preview text shown in inbox (max 90 chars)",
  "blocks": [
    {"type":"header","headline":"Main headline","subtitle":"Subtitle text","bg":"#111827","headline_color":"#FFFFFF"},
    {"type":"text","content":"Opening paragraph that hooks the reader...\n\nSecond paragraph with value proposition."},
    {"type":"stats","items":[{"label":"Dealers","value":"35+"},{"label":"Inventory","value":"AED 2B"},{"label":"Countries","value":"40"}]},
    {"type":"button","text":"CTA button text","url":"https://dubaiauto.ae","color":"#C1272D","align":"center"},
    {"type":"text","content":"Closing paragraph with urgency or next steps."},
    {"type":"footer","content":"DubaiAuto · Dubai Free Zone, UAE"}
  ]
}`;

    const r = await this.ai.messages.create({
      model: aiModel('sonnet'), max_tokens: 1500,
      messages: [{ role:'user', content:prompt }],
    });
    const text = r.content[0]?.type==='text' ? r.content[0].text.trim() : '{}';
    return JSON.parse(text.replace(/```json|```/g,'').trim());
  }

  // ── Templates ──────────────────────────────────────────────────────────────
  async listTemplates() { return this.prisma.emailTemplate.findMany({ orderBy:[{is_system:'desc'},{usage_count:'desc'}] }); }
  async createTemplate(data: any) { return this.prisma.emailTemplate.create({data}); }
  async deleteTemplate(id: string) { return this.prisma.emailTemplate.delete({where:{id}}); }

  // Seeds the requested professional template catalog (acquisition,
  // engagement, commercial, loyalty, reports) using the same block format
  // the drag-and-drop editor already renders — so every seeded template
  // opens straight into the existing editor, no separate format needed.
  async ensureTemplateLibrarySeeded() {
    const existing = await this.prisma.emailTemplate.count({ where: { is_system: true } });
    if (existing > 0) return { seeded: false };

    const header = (headline: string, subtitle = '') => ({ type:'header', headline, subtitle, bg:'#111827', headline_color:'#FFFFFF' });
    const text = (content: string) => ({ type:'text', content });
    const button = (text: string, url = 'https://snaphubtrade.com') => ({ type:'button', text, url, color:'#C1272D', align:'center' });
    const footer = { type:'footer', content:'SnapHubTrade.com · Dubai Free Zone, UAE' };

    const LIB: Array<{ name:string; category:string; description:string; blocks:any[] }> = [
      { name:'Bienvenue Dealer', category:'dealer', description:'Acquisition — welcome a new dealer', blocks:[header('Welcome to SnapHubTrade.com, {{recipient_name}}!','Your dealer account is live'), text('Start by adding your first vehicles — TwinOS auto-fills specs and suggests competitive prices as you type.'), button('Add my first vehicle','https://snaphubtrade.com/dealer/inventory/new'), footer] },
      { name:'Bienvenue Broker', category:'broker', description:'Acquisition — welcome a new broker', blocks:[header('Welcome to the network, {{recipient_name}}!','Your broker account is active'), text('Share your referral code to start earning, and browse shared inventory from dealers in your network.'), button('Go to my dashboard','https://snaphubtrade.com/broker/dashboard'), footer] },
      { name:'Activation du compte', category:'dealer', description:'Acquisition — activate account', blocks:[header('One step left, {{recipient_name}}'), text('Confirm your account to unlock your dashboard.'), button('Activate my account'), footer] },
      { name:'Invitation à compléter son stock', category:'dealer', description:'Acquisition — complete stock', blocks:[header('Finish setting up your stock'), text('Dealers with 10+ listings get 3x more buyer inquiries. Add more vehicles today.'), button('Add vehicles'), footer] },
      { name:'Invitation à découvrir TwinOS', category:'dealer', description:'Acquisition — discover TwinOS', blocks:[header('Meet TwinOS','Your AI sales assistant'), text('Daily briefs, pricing suggestions, and lead recommendations — always on, in your dashboard.'), button('Open TwinOS'), footer] },
      { name:'Présentation des fonctionnalités Premium', category:'marketing', description:'Acquisition — premium features', blocks:[header('Unlock Premium'), text('AI Pricing Intelligence, Global Trade Intelligence, and priority placement.'), button('See Premium plans','https://snaphubtrade.com/pricing'), footer] },

      { name:'Dealer inactif', category:'dealer', description:'Engagement — inactive dealer', blocks:[header('We miss you, {{recipient_name}}'), text("It's been a while since your last visit. Your stock is still live — come check your new leads."), button('Back to dashboard'), footer] },
      { name:'Broker inactif', category:'broker', description:'Engagement — inactive broker', blocks:[header('New opportunities are waiting'), text('New shared inventory and referrals have appeared since your last visit.'), button('Take a look'), footer] },
      { name:'Ajoutez vos nouveaux véhicules', category:'dealer', description:'Engagement — add new vehicles', blocks:[header('Add your latest arrivals'), text('Fresh stock sells faster and ranks higher in buyer searches.'), button('Add a vehicle'), footer] },
      { name:'Découvrez les nouvelles fonctionnalités', category:'marketing', description:'Engagement — new features', blocks:[header("What's new on SnapHubTrade.com"), text("Here's what's new this month on the platform."), button('See what changed'), footer] },
      { name:'Invitation à une démonstration', category:'marketing', description:'Engagement — book a demo', blocks:[header('Book a free walkthrough'), text('Get the most out of SnapHubTrade.com with a 15-minute walkthrough.'), button('Book my slot'), footer] },
      { name:'Conseils IA de la semaine', category:'newsletter', description:'Engagement — weekly AI tips', blocks:[header("This week's AI tip"), text('{{ai_tip}}'), footer] },

      { name:'Passage au plan Premium', category:'marketing', description:'Commercial — upgrade to Premium', blocks:[header('Grow faster with Premium'), text('Unlock advanced AI tools and priority visibility.'), button('Upgrade now','https://snaphubtrade.com/pricing'), footer] },
      { name:"Renouvellement d'abonnement", category:'transactional', description:'Commercial — renewal reminder', blocks:[header('Your subscription renews soon'), text('No action needed to continue enjoying full access.'), footer] },
      { name:'Offre promotionnelle', category:'marketing', description:'Commercial — promo offer', blocks:[header('A special offer for you, {{recipient_name}}'), text('{{offer_details}}'), button('Claim offer'), footer] },
      { name:'Offre de lancement', category:'marketing', description:'Commercial — launch offer', blocks:[header('Launch offer — get started today'), text('Special launch pricing is live. Lock in your rate now.'), button('Get started'), footer] },
      { name:'Offre limitée', category:'marketing', description:'Commercial — limited offer', blocks:[header('Limited-time offer'), text("This offer ends soon — don't miss out."), button('Claim now'), footer] },
      { name:'Nouveaux services disponibles', category:'marketing', description:'Commercial — new services', blocks:[header('New services now available'), text('We added new services to help you sell faster and export smarter.'), footer] },

      { name:'Merci pour votre confiance', category:'general', description:'Fidélisation — thank you', blocks:[header('Thank you, {{recipient_name}}'), text("We're glad to have you as part of the SnapHubTrade.com network."), footer] },
      { name:"Anniversaire d'inscription", category:'general', description:'Fidélisation — signup anniversary', blocks:[header('Happy anniversary!'), text('Thank you for being part of the journey since you joined.'), footer] },
      { name:'Succès du mois', category:'dealer', description:'Fidélisation — monthly success', blocks:[header('Your results this month, {{recipient_name}}'), text('{{monthly_summary}}'), footer] },
      { name:'Classement des meilleurs dealers', category:'newsletter', description:'Fidélisation — top dealers', blocks:[header("This week's top dealers"), text('{{ranking}}'), footer] },
      { name:'Classement des meilleurs brokers', category:'newsletter', description:'Fidélisation — top brokers', blocks:[header("This week's top brokers"), text('{{ranking}}'), footer] },
    ];

    for (const t of LIB) {
      await this.prisma.emailTemplate.create({ data: { name: t.name, category: t.category, description: t.description, blocks: t.blocks, is_system: true } });
    }
    return { seeded: true, count: LIB.length };
  }

  // ── Weekly automated reports ─────────────────────────────────────────────────
  // Unlike blast campaigns (one block set → whole segment), these are
  // genuinely personalized per recipient (their own stock, their own
  // country's trends), so they're sent directly via sendEmail() rather than
  // through the segment-blast pipeline — but every send is still logged as
  // an EmailSend row against a shared 'automated' EmailCampaign record per
  // run, so it shows up in the existing campaign history and analytics.

  private weekRangeLabel() {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 86400000);
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    return `${fmt(start)} – ${fmt(end)}`;
  }

  private async buildDealerReportBlocks(dealer: { id:string; company_name:string }) {
    const vehicles = await this.prisma.vehicle.findMany({ where:{ dealer_id: dealer.id }, select:{ make:true } });
    const makes = [...new Set(vehicles.map(v=>v.make))];
    const since = new Date(Date.now() - 30*86400000);
    const snaps = makes.length ? await this.prisma.marketSnapshot.findMany({ where:{ make:{in:makes}, captured_at:{gte:since} }, orderBy:{captured_at:'desc'}, take:200 }) : [];
    const byModel = new Map<string, any[]>();
    for (const s of snaps) { const k = `${s.make} ${s.model}`; if (!byModel.has(k)) byModel.set(k,[]); byModel.get(k)!.push(s); }
    const trendText = [...byModel.entries()].slice(0,5).map(([name,list]) => {
      const avg = list.reduce((s,x)=>s+(x.avg_price_aed||0),0)/list.length;
      const trendPct = list.length>1 ? Number((((list[0].avg_price_aed-list[list.length-1].avg_price_aed)/list[list.length-1].avg_price_aed)*100).toFixed(1)) : 0;
      return `${name}: avg AED ${Math.round(avg).toLocaleString()} (${trendPct>=0?'+':''}${trendPct}% vs 30d ago)`;
    }).join('\n');

    let gtiText = '';
    const access = await this.prisma.dealerGtiAccess.findUnique({ where:{dealer_id:dealer.id} }).catch(()=>null);
    if (access?.enabled) {
      const opps = await this.prisma.tradeOpportunity.findMany({ where:{ active:true, ...(makes.length?{make:{in:makes}}:{}) }, orderBy:{profitability_score:'desc'}, take:3 });
      if (opps.length) gtiText = '\n\nExport opportunities:\n' + opps.map(o=>`• ${o.headline} — profitability ${o.profitability_score}/100`).join('\n');
    }

    return [
      { type:'header', headline:`Your weekly market report`, subtitle:this.weekRangeLabel(), bg:'#111827', headline_color:'#FFFFFF' },
      { type:'text', content:`Hi {{recipient_name}}, here's your personalized market report for ${this.weekRangeLabel()}.` },
      { type:'text', content:`Price trends on your makes:\n${trendText || 'Not enough recent data yet for your stock makes.'}${gtiText}` },
      { type:'button', text:'Open my dashboard', url:'https://snaphubtrade.com/dealer/dashboard', color:'#C1272D', align:'center' },
      { type:'footer', content:'SnapHubTrade.com · Dubai Free Zone, UAE' },
    ];
  }

  private async buildBrokerReportBlocks(broker: { id:string; full_name:string }) {
    const monthStart = new Date(); monthStart.setDate(1);
    const [newDealers, deals, referrals] = await Promise.all([
      this.prisma.dealer.count({ where:{ created_at:{ gte: new Date(Date.now()-7*86400000) } } }),
      this.prisma.brokerDeal.findMany({ where:{ broker_id: broker.id, created_at:{gte:monthStart} } }).catch(()=>[] as any[]),
      this.prisma.brokerReferral.count({ where:{ broker_id: broker.id, status:'active' } }),
    ]);
    const commissionEst = (deals as any[]).reduce((s: number, d: any) => s + Number(d.commission_aed || 0), 0);
    return [
      { type:'header', headline:'Your weekly broker report', subtitle:this.weekRangeLabel(), bg:'#111827', headline_color:'#FFFFFF' },
      { type:'text', content:`Hi {{recipient_name}}, here's what happened this week.` },
      { type:'stats', items:[ {label:'New dealers',value:String(newDealers)}, {label:'Deals this month',value:String(deals.length)}, {label:'Active referrals',value:String(referrals)} ] },
      { type:'text', content:`Estimated commission this month: AED ${commissionEst.toLocaleString()}.` },
      { type:'button', text:'Open my dashboard', url:'https://snaphubtrade.com/broker/dashboard', color:'#C1272D', align:'center' },
      { type:'footer', content:'SnapHubTrade.com · Dubai Free Zone, UAE' },
    ];
  }

  async runDealerWeeklyReports() {
    const campaign = await this.prisma.emailCampaign.create({ data: { name:`Dealer Market Report — ${this.weekRangeLabel()}`, subject_a:`Your weekly market report — ${this.weekRangeLabel()}`, segment:'all_dealers', type:'automated', status:'sending', blocks:[] } });
    const dealers = await this.prisma.dealer.findMany({ where:{ email:{not:null}, verified:true }, select:{ id:true, company_name:true, email:true } });
    let sent = 0;
    for (const d of dealers) {
      const blocks = await this.buildDealerReportBlocks(d);
      const sendRecord = await this.prisma.emailSend.create({ data:{ campaign_id:campaign.id, recipient_email:d.email!, recipient_name:d.company_name, subject:campaign.subject_a } });
      const html = renderBlocksToHTML(blocks as EmailBlock[], `${this.baseUrl}/api/v1`, sendRecord.tracking_id).replace(/{{recipient_name}}/g, d.company_name).replace(/{{unsubscribe_token}}/g, sendRecord.tracking_id);
      const result = await sendEmail({ to:[{email:d.email!,name:d.company_name}], subject:campaign.subject_a, html, from_name:'SnapHubTrade.com' });
      await this.prisma.emailSend.update({ where:{id:sendRecord.id}, data:{ status:result.success?'sent':'failed', sent_at:result.success?new Date():undefined } });
      if (result.success) sent++;
    }
    await this.prisma.emailCampaign.update({ where:{id:campaign.id}, data:{ status:'sent', sent_at:new Date(), total_recipients:dealers.length } });
    return { sent, total: dealers.length, campaign_id: campaign.id };
  }

  async runBrokerWeeklyReports() {
    const campaign = await this.prisma.emailCampaign.create({ data: { name:`Broker Weekly Report — ${this.weekRangeLabel()}`, subject_a:`Your weekly broker report — ${this.weekRangeLabel()}`, segment:'all_brokers', type:'automated', status:'sending', blocks:[] } });
    const brokers = await this.prisma.broker.findMany({ where:{ status:'active', email:{not:null} }, select:{ id:true, full_name:true, email:true } });
    let sent = 0;
    for (const b of brokers) {
      const blocks = await this.buildBrokerReportBlocks(b);
      const sendRecord = await this.prisma.emailSend.create({ data:{ campaign_id:campaign.id, recipient_email:b.email!, recipient_name:b.full_name, subject:campaign.subject_a } });
      const html = renderBlocksToHTML(blocks as EmailBlock[], `${this.baseUrl}/api/v1`, sendRecord.tracking_id).replace(/{{recipient_name}}/g, b.full_name).replace(/{{unsubscribe_token}}/g, sendRecord.tracking_id);
      const result = await sendEmail({ to:[{email:b.email!,name:b.full_name}], subject:campaign.subject_a, html, from_name:'SnapHubTrade.com' });
      await this.prisma.emailSend.update({ where:{id:sendRecord.id}, data:{ status:result.success?'sent':'failed', sent_at:result.success?new Date():undefined } });
      if (result.success) sent++;
    }
    await this.prisma.emailCampaign.update({ where:{id:campaign.id}, data:{ status:'sent', sent_at:new Date(), total_recipients:brokers.length } });
    return { sent, total: brokers.length, campaign_id: campaign.id };
  }

  // ── Automations (welcome flows, weekly reports, re-engagement) ──────────────
  async ensureAutomationsSeeded() {
    const defs = [
      { key:'weekly_dealer_report', name:'Dealer Market Report', trigger_type:'scheduled_weekly' },
      { key:'weekly_broker_report', name:'Broker Weekly Report', trigger_type:'scheduled_weekly' },
      { key:'re_engage_inactive', name:'Re-engage inactive dealers', trigger_type:'inactivity_days', config:{inactivity_days:30} },
    ];
    for (const d of defs) await this.prisma.emailAutomation.upsert({ where:{key:d.key}, create:d as any, update:{} });
    return { seeded: defs.length };
  }
  listAutomations() { return this.prisma.emailAutomation.findMany({ orderBy:{name:'asc'} }); }
  setAutomationEnabled(id: string, enabled: boolean) { return this.prisma.emailAutomation.update({ where:{id}, data:{enabled} }); }

  async maybeRunWeeklyAutomations() {
    const now = new Date();
    if (now.getUTCDay() !== 1) return { skipped: 'not_monday' }; // Monday only
    const autos = await this.prisma.emailAutomation.findMany({ where:{ enabled:true, key:{in:['weekly_dealer_report','weekly_broker_report']} } });
    const ran: string[] = [];
    for (const a of autos) {
      if (a.last_run_at && now.getTime() - a.last_run_at.getTime() < 6*86400000) continue;
      if (a.key === 'weekly_dealer_report') await this.runDealerWeeklyReports();
      if (a.key === 'weekly_broker_report') await this.runBrokerWeeklyReports();
      await this.prisma.emailAutomation.update({ where:{id:a.id}, data:{last_run_at:now} });
      ran.push(a.key);
    }
    return { ran };
  }
  async getAnalyticsOverview() {
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const [totalCampaigns,sentMonth,totalSent,totalOpened,totalClicked,unsubCount,recentSends] = await Promise.all([
      this.prisma.emailCampaign.count(),
      this.prisma.emailCampaign.count({ where:{status:'sent',sent_at:{gte:month}} }),
      this.prisma.emailSend.count({ where:{status:'sent'} }),
      this.prisma.emailSend.count({ where:{status:'sent',opened:true} }),
      this.prisma.emailSend.count({ where:{status:'sent',clicked:true} }),
      this.prisma.emailUnsubscribe.count(),
      this.prisma.emailSend.findMany({ where:{created_at:{gte:month},status:'sent'}, select:{opened:true,clicked:true,sent_at:true}, take:2000 }),
    ]);
    return {
      total_campaigns: totalCampaigns, sent_this_month: sentMonth,
      total_sent: totalSent, total_opened: totalOpened, total_clicked: totalClicked,
      avg_open_rate:  totalSent>0?Math.round((totalOpened/totalSent)*1000)/10:0,
      avg_click_rate: totalSent>0?Math.round((totalClicked/totalSent)*1000)/10:0,
      unsubscribes: unsubCount,
    };
  }

  async getSegmentCounts() {
    const segments = ['all_dealers','active_dealers','inactive_dealers','all_brokers','all_buyers','all'];
    const counts = await Promise.all(segments.map(s=>this.getSegmentCount(s).then(c=>({segment:s,count:c}))));
    return counts;
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────
@Roles('admin')
@Controller('email')
export class EmailController {
  constructor(private svc: EmailService) {}

  // Analytics
  @Get('analytics') overview() { return this.svc.getAnalyticsOverview(); }
  @Get('segments')  segments() { return this.svc.getSegmentCounts(); }

  // Campaigns
  @Get('campaigns')     list(@Query('status') s?: string) { return this.svc.listCampaigns(s); }
  @Post('campaigns')    create(@Body() b: any) { return this.svc.createCampaign(b); }
  @Get('campaigns/:id') get(@Param('id') id: string) { return this.svc.getCampaign(id); }
  @Patch('campaigns/:id') update(@Param('id') id: string, @Body() b: any) { return this.svc.updateCampaign(id, b); }
  @Delete('campaigns/:id') del(@Param('id') id: string) { return this.svc.deleteCampaign(id); }
  @Post('campaigns/:id/send') send(@Param('id') id: string) { return this.svc.sendCampaign(id); }
  @Post('campaigns/:id/test') test(@Param('id') id: string, @Body() b: {email:string}) { return this.svc.sendCampaign(id, b.email); }

  // AI
  @Post('ai/generate') generate(@Body() b: any) { return this.svc.generateEmailWithAI(b); }

  // Templates
  @Get('templates')     listTemplates() { return this.svc.listTemplates(); }
  @Post('templates')    createTemplate(@Body() b: any) { return this.svc.createTemplate(b); }
  @Delete('templates/:id') delTemplate(@Param('id') id: string) { return this.svc.deleteTemplate(id); }
  @Post('templates/seed') seedTemplates() { return this.svc.ensureTemplateLibrarySeeded(); }

  // Advanced GCC segmentation (country, free zone, subscription tier, stock
  // size, makes, language, activity) — complements the named presets above.
  @Post('segments/advanced/preview') previewAdvanced(@Body() b: any) { return this.svc.previewAdvancedFilters(b); }

  // Automations — weekly reports, welcome flows, re-engagement
  @Get('automations')       automations() { return this.svc.listAutomations(); }
  @Patch('automations/:id') setAutomation(@Param('id') id: string, @Body() b: {enabled:boolean}) { return this.svc.setAutomationEnabled(id, !!b.enabled); }
  @Post('automations/seed') seedAutomations() { return this.svc.ensureAutomationsSeeded(); }
  @Post('automations/run-weekly-reports') runWeekly() { return this.svc.maybeRunWeeklyAutomations(); }
  @Post('reports/dealer/run')  runDealerReports() { return this.svc.runDealerWeeklyReports(); }
  @Post('reports/broker/run')  runBrokerReports() { return this.svc.runBrokerWeeklyReports(); }

  // Public tracking (no auth needed)
  @Get('open/:id')
  async trackOpen(@Param('id') id: string, @Res() res: any) {
    await this.svc.trackOpen(id);
    // Return 1x1 transparent GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
    res.setHeader('Content-Type','image/gif');
    res.setHeader('Cache-Control','no-cache,no-store');
    res.send(pixel);
  }

  @Get('click/:trackingId/:linkId')
  async trackClick(@Param('trackingId') tid: string, @Param('linkId') lid: string, @Res() res: any) {
    const url = await this.svc.trackClick(tid, lid);
    res.redirect(302, url);
  }

  @Get('unsubscribe/:token')
  async unsubscribe(@Param('token') token: string) { return this.svc.unsubscribe(token); }
}

// ─── Module ───────────────────────────────────────────────────────────────────
@Module({
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailMarketingModule {}
