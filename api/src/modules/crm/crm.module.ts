import {
  Module, Controller, Get, Post, Patch, Delete,
  Body, Param, Injectable, Query, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { getAIClient, aiModel } from '../../shared/ai/ai-client';
import { Roles } from '../../shared/auth/roles.decorator';
import { Public } from '../../shared/auth/public.decorator';

// ─── Pipeline stage config ─────────────────────────────────────────────────
export const PIPELINE_STAGES = [
  { key:'lead',           label:'Lead',            prob:10,  color:'#6B7280' },
  { key:'qualified',      label:'Qualified',       prob:25,  color:'#60A5FA' },
  { key:'demo_scheduled', label:'Demo Scheduled',  prob:40,  color:'#A78BFA' },
  { key:'demo_completed', label:'Demo Completed',  prob:60,  color:'#FBBF24' },
  { key:'negotiation',    label:'Negotiation',     prob:75,  color:'#FB923C' },
  { key:'trial',          label:'Trial',           prob:85,  color:'#34D399' },
  { key:'won',            label:'Won',             prob:100, color:'#10B981' },
  { key:'lost',           label:'Lost',            prob:0,   color:'#F87171' },
];

@Injectable()
export class CrmService {
  private ai = getAIClient();
  constructor(private prisma: PrismaService) {}

  // ── Contacts ───────────────────────────────────────────────────────────────
  async listContacts(params: {
    search?: string; type?: string; status?: string; owner?: string;
    source?: string; page?: number; limit?: number;
  }) {
    const { search, type, status, owner, source, page=1, limit=40 } = params;
    const where: any = {};
    if (search) where.OR = [
      { full_name:{ contains:search, mode:'insensitive' } },
      { email:    { contains:search, mode:'insensitive' } },
      { company:  { contains:search, mode:'insensitive' } },
      { phone:    { contains:search, mode:'insensitive' } },
    ];
    if (type)   where.type   = type;
    if (status) where.status = status;
    if (owner)  where.owner  = owner;
    if (source) where.source = source;

    const [items, total] = await Promise.all([
      this.prisma.crmContact.findMany({
        where, skip:(page-1)*limit, take:limit,
        orderBy: [{last_activity_at:'desc'},{created_at:'desc'}],
        include: { _count:{select:{activities:true,deals:true}}, deals:{select:{stage:true,value_aed:true},take:1,orderBy:{updated_at:'desc'}} },
      }),
      this.prisma.crmContact.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getContact(id: string) {
    const contact = await this.prisma.crmContact.findUnique({
      where:{ id },
      include: {
        activities: { orderBy:{created_at:'desc'}, take:50 },
        deals:      { orderBy:{updated_at:'desc'} },
      },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async createContact(data: any) {
    return this.prisma.crmContact.create({ data:{
      full_name: data.full_name||'Unknown', type:data.type||'lead',
      email:data.email, phone:data.phone, whatsapp:data.whatsapp,
      company:data.company, country:data.country, city:data.city,
      source:data.source, owner:data.owner, tags:data.tags||[],
      notes:data.notes, status:data.status||'new', score:data.score||0,
      ref_dealer_id:data.ref_dealer_id, ref_broker_id:data.ref_broker_id,
    } });
  }

  async updateContact(id: string, data: any) {
    return this.prisma.crmContact.update({ where:{id}, data:{ ...data, updated_at:new Date() } });
  }

  async deleteContact(id: string) {
    return this.prisma.crmContact.delete({ where:{id} });
  }

  // ── Import existing dealers/brokers as CRM contacts ────────────────────────
  async importFromPlatform() {
    const [dealers, brokers] = await Promise.all([
      this.prisma.dealer.findMany({ select:{id:true,email:true,company_name:true,phone:true,verified:true,created_at:true}, take:500 }),
      this.prisma.broker.findMany({ select:{id:true,email:true,full_name:true,phone:true,country:true,tier:true,created_at:true,status:true}, take:500 }),
    ]);
    let imported = 0;
    for (const d of dealers) {
      const existing = await this.prisma.crmContact.findFirst({ where:{ref_dealer_id:d.id} });
      if (!existing) {
        await this.prisma.crmContact.create({ data:{ full_name:d.company_name, email:d.email, phone:d.phone||undefined, type:'dealer', status:d.verified?'customer':'active', source:'platform', ref_dealer_id:d.id, score:60, created_at:d.created_at } });
        imported++;
      }
    }
    for (const b of brokers) {
      const existing = await this.prisma.crmContact.findFirst({ where:{ref_broker_id:b.id} });
      if (!existing) {
        await this.prisma.crmContact.create({ data:{ full_name:b.full_name, email:b.email, phone:b.phone||undefined, type:'broker', status:b.status==='active'?'customer':'active', source:'platform', country:b.country||undefined, ref_broker_id:b.id, score:50, created_at:b.created_at } });
        imported++;
      }
    }
    return { imported, total_dealers:dealers.length, total_brokers:brokers.length };
  }

  // ── Score contact (AI) ─────────────────────────────────────────────────────
  async scoreContact(id: string) {
    const contact = await this.getContact(id);
    const score = this.computeScore(contact);
    await this.prisma.crmContact.update({ where:{id}, data:{ score } });
    return { score };
  }

  private computeScore(contact: any): number {
    let s = 20;
    if (contact.email)    s += 15;
    if (contact.phone)    s += 10;
    if (contact.whatsapp) s += 5;
    if (contact.company)  s += 10;
    if (contact.country)  s += 5;
    if (contact.type==='dealer')  s += 20;
    if (contact.type==='broker')  s += 15;
    if (contact.activities?.length > 0) s += 5;
    if (contact.activities?.length > 3) s += 5;
    if (contact.deals?.some((d:any)=>d.stage!=='lost')) s += 10;
    return Math.min(100, s);
  }

  // ── Activities ─────────────────────────────────────────────────────────────
  async addActivity(contactId: string, data: any) {
    const activity = await this.prisma.crmActivity.create({ data:{
      contact_id:contactId, type:data.type||'note', title:data.title,
      body:data.body, direction:data.direction, duration_min:data.duration_min,
      outcome:data.outcome, scheduled_at:data.scheduled_at?new Date(data.scheduled_at):undefined,
      completed:data.completed||false, created_by:data.created_by,
    } });
    await this.prisma.crmContact.update({ where:{id:contactId}, data:{ last_activity_at:new Date() } });
    return activity;
  }

  async updateActivity(id: string, data: any) {
    return this.prisma.crmActivity.update({ where:{id}, data:{
      ...( data.completed!==undefined&&{completed:data.completed,completed_at:data.completed?new Date():null}),
      ...( data.body!==undefined&&{body:data.body}),
      ...( data.outcome!==undefined&&{outcome:data.outcome}),
    }});
  }

  async deleteActivity(id: string) { return this.prisma.crmActivity.delete({ where:{id} }); }

  // ── Deals ──────────────────────────────────────────────────────────────────
  async listDeals(stage?: string, owner?: string) {
    return this.prisma.crmDeal.findMany({
      where:{ ...(stage?{stage}:{}), ...(owner?{owner}:{}) },
      include:{ contact:{select:{full_name:true,type:true,company:true,email:true}} },
      orderBy:{ updated_at:'desc' },
    });
  }

  async createDeal(data: any) {
    const stage = PIPELINE_STAGES.find(s=>s.key===data.stage)||PIPELINE_STAGES[0];
    return this.prisma.crmDeal.create({ data:{
      contact_id:data.contact_id, title:data.title, value_aed:Number(data.value_aed||0),
      stage:data.stage||'lead', probability_pct:data.probability_pct||stage.prob,
      expected_close:data.expected_close?new Date(data.expected_close):undefined,
      owner:data.owner, source:data.source, notes:data.notes, plan_interest:data.plan_interest,
    }});
  }

  async updateDeal(id: string, data: any) {
    const updates: any = { updated_at:new Date() };
    if (data.stage!==undefined) {
      updates.stage = data.stage;
      const stageCfg = PIPELINE_STAGES.find(s=>s.key===data.stage);
      if (stageCfg) updates.probability_pct = stageCfg.prob;
      if (data.stage==='won')  { updates.won_at=new Date(); updates.probability_pct=100; }
      if (data.stage==='lost') { updates.lost_at=new Date(); updates.lost_reason=data.lost_reason; updates.probability_pct=0; }
    }
    if (data.title!==undefined)         updates.title=data.title;
    if (data.value_aed!==undefined)     updates.value_aed=Number(data.value_aed);
    if (data.probability_pct!==undefined) updates.probability_pct=Number(data.probability_pct);
    if (data.expected_close!==undefined) updates.expected_close=data.expected_close?new Date(data.expected_close):null;
    if (data.owner!==undefined)         updates.owner=data.owner;
    if (data.notes!==undefined)         updates.notes=data.notes;
    if (data.plan_interest!==undefined) updates.plan_interest=data.plan_interest;
    return this.prisma.crmDeal.update({ where:{id}, data:updates });
  }

  async deleteDeal(id: string) { return this.prisma.crmDeal.delete({ where:{id} }); }

  // ── Pipeline analytics ─────────────────────────────────────────────────────
  async getPipelineStats() {
    const deals = await this.prisma.crmDeal.findMany({
      include:{ contact:{select:{full_name:true,company:true,type:true}} },
    });
    const byStage: Record<string,{count:number;value:number;weighted:number;deals:any[]}> = {};
    PIPELINE_STAGES.forEach(s=>{ byStage[s.key]={count:0,value:0,weighted:0,deals:[]}; });

    let totalPipeline=0, totalWeighted=0, wonThisMonth=0, wonValue=0;
    const now = new Date(); const monthStart = new Date(now.getFullYear(),now.getMonth(),1);

    for (const d of deals) {
      const val = Number(d.value_aed);
      const weighted = val * (d.probability_pct/100);
      if (byStage[d.stage]) {
        byStage[d.stage].count++;
        byStage[d.stage].value  += val;
        byStage[d.stage].weighted += weighted;
        byStage[d.stage].deals.push(d);
      }
      if (d.stage!=='lost') { totalPipeline+=val; totalWeighted+=weighted; }
      if (d.stage==='won' && d.won_at && new Date(d.won_at)>=monthStart) { wonThisMonth++; wonValue+=val; }
    }

    const closingThisMonth = deals.filter(d=> d.expected_close && new Date(d.expected_close)>=monthStart && new Date(d.expected_close)<new Date(now.getFullYear(),now.getMonth()+1,1) && d.stage!=='won' && d.stage!=='lost').length;

    return {
      by_stage: PIPELINE_STAGES.map(s=>({...s,...(byStage[s.key]||{count:0,value:0,weighted:0,deals:[]})})),
      total_pipeline_aed: totalPipeline,
      weighted_forecast_aed: totalWeighted,
      won_this_month: wonThisMonth,
      won_value_this_month_aed: wonValue,
      closing_this_month: closingThisMonth,
      total_deals: deals.length,
    };
  }

  // ── CRM overview stats ─────────────────────────────────────────────────────
  async getOverviewStats() {
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const [total,new_month,by_type,by_status,activities_today] = await Promise.all([
      this.prisma.crmContact.count(),
      this.prisma.crmContact.count({ where:{created_at:{gte:month}} }),
      this.prisma.crmContact.groupBy({ by:['type'], _count:{_all:true} }),
      this.prisma.crmContact.groupBy({ by:['status'], _count:{_all:true} }),
      this.prisma.crmActivity.count({ where:{created_at:{gte:new Date(Date.now()-86400000)}} }),
    ]);
    return {
      total_contacts: total, new_this_month: new_month,
      by_type: by_type.map(r=>({type:r.type,count:r._count._all})),
      by_status: by_status.map(r=>({status:r.status,count:r._count._all})),
      activities_last_24h: activities_today,
    };
  }

  // ── AI contact suggestions ─────────────────────────────────────────────────
  async getContactInsights(id: string) {
    const contact = await this.getContact(id);
    const prompt = `CRM AI for DubaiAuto UAE automotive SaaS.

Contact: ${contact.full_name} · ${contact.type} · ${contact.company||'—'} · ${contact.country||'—'} · Score: ${contact.score}/100
Status: ${contact.status} · Source: ${contact.source||'—'} · Activities: ${contact.activities?.length||0}
Last deal stage: ${contact.deals?.[0]?.stage||'none'} · Deal value: AED ${contact.deals?.[0]?.value_aed||0}

Generate 3 specific, actionable insights. Return ONLY JSON array:
[{"type":"action|risk|opportunity","insight":"one sentence","action":"specific next step today","urgency":"now|this_week|this_month"}]`;

    try {
      const r = await this.ai.messages.create({ model:aiModel('haiku'), max_tokens:400, messages:[{role:'user',content:prompt}] });
      const text = r.content[0]?.type==='text'?r.content[0].text.trim():'[]';
      return JSON.parse(text.replace(/```json|```/g,'').trim());
    } catch {
      return [
        {type:'action',insight:`Follow up with ${contact.full_name} — ${contact.activities?.length||0} past touchpoints`,action:'Send personalised WhatsApp today',urgency:'now'},
        {type:'opportunity',insight:'High-score contact with active pipeline',action:'Schedule a demo call this week',urgency:'this_week'},
      ];
    }
  }

  // ── Buyer vehicle inquiries ("Request this vehicle" on the marketplace) ────
  // Distinct from the internal admin CRM contacts above: this creates a row in
  // the per-dealer `Lead` model (same one the Dealer Dashboard / AI Twin read
  // from) so a buyer's request immediately shows up as a lead for that dealer.
  async createVehicleLead(data: {
    dealer_id?: string; vehicle_id?: string;
    buyer_name?: string; buyer_email?: string; buyer_phone?: string; buyer_whatsapp?: string;
    offer_price?: number; notes?: string; channel?: string;
  }) {
    if (!data.dealer_id) throw new BadRequestException('dealer_id is required');
    if (!data.buyer_name || !(data.buyer_email || data.buyer_phone)) {
      throw new BadRequestException('Buyer name and an email or phone number are required');
    }

    const dealer = await this.prisma.dealer.findUnique({ where: { id: data.dealer_id }, select: { id: true } });
    if (!dealer) throw new NotFoundException('Dealer not found');

    if (data.vehicle_id) {
      const vehicle = await this.prisma.vehicle.findFirst({ where: { id: data.vehicle_id, dealer_id: data.dealer_id } });
      if (!vehicle) throw new NotFoundException('Vehicle not found for this dealer');
    }

    const lead = await this.prisma.lead.create({
      data: {
        dealer_id: data.dealer_id,
        vehicle_id: data.vehicle_id,
        buyer_name: data.buyer_name,
        buyer_email: data.buyer_email,
        buyer_phone: data.buyer_phone,
        buyer_whatsapp: data.buyer_whatsapp,
        offer_price: data.offer_price,
        notes: data.notes,
        channel: data.channel || 'website',
        stage: 'new',
      },
      include: { vehicle: { select: { make: true, model: true, year: true } } },
    });

    await this.prisma.leadActivity.create({
      data: { lead_id: lead.id, type: 'created', note: 'Buyer request submitted from the marketplace' },
    });

    try {
      await this.prisma.notification.create({
        data: {
          dealer_id: data.dealer_id, type: 'new_lead', category: 'lead',
          title: `🔔 New buyer request${lead.vehicle ? ` — ${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : ''}`,
          body: `${data.buyer_name} is interested${data.offer_price ? ` — offer AED ${Number(data.offer_price).toLocaleString()}` : ''}.`,
          data: { lead_id: lead.id, vehicle_id: data.vehicle_id },
        },
      });
    } catch { /* non-blocking */ }

    return lead;
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────
@Roles('admin')
@Controller('crm')
export class CrmController {
  constructor(private svc: CrmService) {}

  // Stats
  @Get('stats') stats() { return this.svc.getOverviewStats(); }

  // Buyer vehicle inquiry ("Request this vehicle") — public, guests included.
  // Overrides the controller's @Roles('admin') via @Public() (bypasses the
  // roles check entirely, same as any other public/guest-facing endpoint).
  @Public()
  @Post('leads')
  createLead(@Body() b: any) { return this.svc.createVehicleLead(b); }

  // Contacts
  @Get('contacts') list(@Query() q: any) {
    return this.svc.listContacts({ search:q.search, type:q.type, status:q.status, owner:q.owner, source:q.source, page:q.page?+q.page:1, limit:q.limit?+q.limit:40 });
  }
  @Post('contacts')    create(@Body() b: any) { return this.svc.createContact(b); }
  @Get('contacts/:id') get(@Param('id') id: string) { return this.svc.getContact(id); }
  @Patch('contacts/:id') update(@Param('id') id: string, @Body() b: any) { return this.svc.updateContact(id, b); }
  @Delete('contacts/:id') del(@Param('id') id: string) { return this.svc.deleteContact(id); }

  @Post('contacts/import') import() { return this.svc.importFromPlatform(); }
  @Post('contacts/:id/score') score(@Param('id') id: string) { return this.svc.scoreContact(id); }
  @Get('contacts/:id/insights') insights(@Param('id') id: string) { return this.svc.getContactInsights(id); }

  // Activities
  @Post('contacts/:id/activities') addActivity(@Param('id') id: string, @Body() b: any) { return this.svc.addActivity(id, b); }
  @Patch('activities/:id') updateActivity(@Param('id') id: string, @Body() b: any) { return this.svc.updateActivity(id, b); }
  @Delete('activities/:id') delActivity(@Param('id') id: string) { return this.svc.deleteActivity(id); }

  // Deals / Pipeline
  @Get('deals')     listDeals(@Query('stage') s?: string, @Query('owner') o?: string) { return this.svc.listDeals(s, o); }
  @Post('deals')    createDeal(@Body() b: any) { return this.svc.createDeal(b); }
  @Patch('deals/:id') updateDeal(@Param('id') id: string, @Body() b: any) { return this.svc.updateDeal(id, b); }
  @Delete('deals/:id') deleteDeal(@Param('id') id: string) { return this.svc.deleteDeal(id); }
  @Get('pipeline') pipeline() { return this.svc.getPipelineStats(); }
}

@Module({ controllers:[CrmController], providers:[CrmService], exports:[CrmService] })
export class CrmModule {}
