import {
  Module, Controller, Get, Post, Patch, Delete,
  Body, Param, Injectable, Query,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { getAIClient, aiModel } from '../../shared/ai/ai-client';
import { Roles } from '../../shared/auth/roles.decorator';

@Injectable()
export class ExecutiveService {
  private ai = getAIClient();
  constructor(private prisma: PrismaService) {}

  private async getMRR() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const prev  = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const [cur, prv] = await Promise.all([
      this.prisma.subscriptionPayment.aggregate({ where:{status:'completed',created_at:{gte:start}}, _sum:{amount:true} }),
      this.prisma.subscriptionPayment.aggregate({ where:{status:'completed',created_at:{gte:prev,lte:prevEnd}}, _sum:{amount:true} }),
    ]);
    const current = Number(cur._sum.amount||0);
    const previous = Number(prv._sum.amount||0);
    return { current, previous, growth_pct: previous>0 ? Math.round(((current-previous)/previous)*100) : 0 };
  }

  private async getDealerStats() {
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const week  = new Date(Date.now()-7*86400000);
    const [total,active,new_month,new_week] = await Promise.all([
      this.prisma.dealer.count(),
      this.prisma.dealer.count({ where:{verified:true} }),
      this.prisma.dealer.count({ where:{created_at:{gte:month}} }),
      this.prisma.dealer.count({ where:{created_at:{gte:week}} }),
    ]);
    return { total, active, new_month, new_week };
  }

  private async getVehicleStats() {
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const [total, available, sold_all, sold_month, listed_month, val, partial_sales] = await Promise.all([
      this.prisma.vehicle.count(),
      this.prisma.vehicle.count({ where:{status:'available'} }),
      this.prisma.vehicle.count({ where:{status:'sold'} }),
      this.prisma.vehicle.count({ where:{status:'sold',updated_at:{gte:month}} }),
      this.prisma.vehicle.count({ where:{created_at:{gte:month}} }),
      this.prisma.vehicle.aggregate({ where:{status:'available'}, _sum:{price_aed:true} }),
      this.prisma.vehicleReservation.count({ where:{status:'converted', vehicle:{status:{not:'sold'}}} }),
    ]);
    return {
      total, available,
      sold_total: Number(sold_all) + Number(partial_sales),
      sold_month, listed_month,
      total_value_aed: Number(val._sum.price_aed||0),
    };
  }

  private async getDealRevenue() {
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const prev  = new Date(month); prev.setMonth(prev.getMonth()-1);
    const [cur,prv,totalDeals] = await Promise.all([
      this.prisma.brokerDeal.aggregate({ where:{created_at:{gte:month}}, _sum:{commission_aed:true}, _count:true }),
      this.prisma.brokerDeal.aggregate({ where:{created_at:{gte:prev,lt:month}}, _sum:{commission_aed:true}, _count:true }),
      this.prisma.brokerDeal.count(),
    ]);
    const cur_rev = Number(cur._sum.commission_aed||0);
    const prv_rev = Number(prv._sum.commission_aed||0);
    return { this_month:cur_rev, last_month:prv_rev, growth_pct:prv_rev>0?Math.round(((cur_rev-prv_rev)/prv_rev)*100):0, deals_this_month:cur._count, total_deals:totalDeals };
  }

  private async getLeadStats() {
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const [total,new_month,converted] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.count({ where:{created_at:{gte:month}} }),
      this.prisma.lead.count({ where:{stage:{in:['converted','closed_won']}} }),
    ]);
    return { total, new_month, conversion_rate:total>0?Math.round((converted/total)*100):0 };
  }

  private async getUserStats() {
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const [total,new_month] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where:{created_at:{gte:month}} }),
    ]);
    return { total, new_month };
  }

  private computeHealthScore(mrr:any, dealers:any, vehicles:any, deals:any, leads:any) {
    const rev = Math.min(100,Math.max(0,50+mrr.growth_pct*2));
    const act = dealers.total>0 ? Math.round((dealers.active/dealers.total)*100) : 50;
    const inv = Math.min(100,Math.max(20,vehicles.total>0?60+(vehicles.listed_month/Math.max(1,vehicles.total))*200:50));
    const vel = Math.min(100,Math.max(0,50+deals.growth_pct*1.5));
    const eng = Math.min(100,Math.max(0,leads.conversion_rate*2));
    const total = Math.round(rev*0.30+act*0.25+inv*0.15+vel*0.20+eng*0.10);
    const grade = total>=80?'excellent':total>=60?'good':total>=40?'at_risk':'critical';
    return { total, grade, components:{ revenue_growth:Math.round(rev), dealer_activity:Math.round(act), inventory_health:Math.round(inv), deal_velocity:Math.round(vel), engagement:Math.round(eng) } };
  }

  private async getCriticalAlerts(mrr:any, dealers:any, deals:any) {
    const alerts:any[] = [];
    if (mrr.growth_pct<-10) alerts.push({ type:'revenue', severity:'critical', msg:`MRR dropped ${Math.abs(mrr.growth_pct)}% vs last month`, action:'Review churned subscriptions' });
    if (mrr.current===0) alerts.push({ type:'revenue', severity:'critical', msg:'No subscription revenue this month', action:'Check Stripe integration' });
    if (dealers.new_month===0) alerts.push({ type:'growth', severity:'warning', msg:'No new dealers this month', action:'Launch acquisition campaign' });
    if (deals.deals_this_month===0) alerts.push({ type:'sales', severity:'warning', msg:'No broker deals closed this month', action:'Check broker activity' });
    try {
      const emptyDealers = await this.prisma.dealer.count({ where:{verified:true,vehicles:{none:{}}} });
      if (emptyDealers>0) alerts.push({ type:'activation', severity:'warning', msg:`${emptyDealers} active dealer(s) with no vehicles`, action:'Trigger onboarding sequence' });
    } catch {}
    return alerts;
  }

  async getMRRChart() {
    const results:any[]=[];
    for (let i=5;i>=0;i--) {
      const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); d.setMonth(d.getMonth()-i);
      const end=new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59);
      const agg=await this.prisma.subscriptionPayment.aggregate({ where:{status:'completed',created_at:{gte:d,lte:end}}, _sum:{amount:true} });
      results.push({ month:d.toLocaleString('en-US',{month:'short',year:'2-digit'}), mrr:Number(agg._sum.amount||0) });
    }
    return results;
  }

  async getDealerGrowthChart() {
    const results:any[]=[];
    for (let i=5;i>=0;i--) {
      const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); d.setMonth(d.getMonth()-i);
      const end=new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59);
      const count=await this.prisma.dealer.count({ where:{created_at:{lte:end}} });
      results.push({ month:d.toLocaleString('en-US',{month:'short',year:'2-digit'}), dealers:count });
    }
    return results;
  }

  async getExecutiveStats() {
    const [mrr,dealers,vehicles,deals,leads,users] = await Promise.all([
      this.getMRR(), this.getDealerStats(), this.getVehicleStats(),
      this.getDealRevenue(), this.getLeadStats(), this.getUserStats(),
    ]);
    const activeSubs = await this.prisma.dealerSubscription.count({ where:{status:{in:['active','trialing']}} });
    const health = this.computeHealthScore(mrr,dealers,vehicles,deals,leads);
    const alerts = await this.getCriticalAlerts(mrr,dealers,deals);
    const arr = mrr.current*12;
    try {
      const today=new Date(); today.setHours(0,0,0,0);
      await this.prisma.kpiSnapshot.upsert({ where:{date:today}, create:{date:today,mrr_aed:mrr.current,arr_aed:arr,active_dealers:dealers.active,new_dealers_month:dealers.new_month,total_vehicles:vehicles.total,deals_month:deals.deals_this_month,revenue_month_aed:deals.this_month,health_score:health.total}, update:{mrr_aed:mrr.current,arr_aed:arr,health_score:health.total,active_dealers:dealers.active,deals_month:deals.deals_this_month} });
    } catch {}
    return { health_score:health, kpis:{ mrr_aed:mrr.current, mrr_growth_pct:mrr.growth_pct, arr_aed:arr, active_subscriptions:activeSubs, deals_revenue_month:deals.this_month, deals_revenue_growth:deals.growth_pct, total_revenue_month:mrr.current+deals.this_month }, dealers, vehicles, leads, users, alerts, generated_at:new Date().toISOString() };
  }

  async getAIRecommendations(stats:any) {
    try {
      const prompt=`AI Growth Copilot for DubaiAuto UAE automotive SaaS.\nPlatform: MRR AED ${stats.kpis.mrr_aed} (${stats.kpis.mrr_growth_pct>0?'+':''}${stats.kpis.mrr_growth_pct}% MoM), ${stats.dealers.active} active dealers, ${stats.vehicles.available} vehicles, health ${stats.health_score.total}/100.\nGenerate 4 high-impact growth recommendations. Return ONLY JSON array:\n[{"type":"revenue|growth|retention|activation","priority":"critical|high|medium","title":"max 7 words","insight":"max 20 words","action":"max 15 words","impact":"max 10 words","effort":"low|medium|high"}]`;
      const r=await this.ai.messages.create({ model:aiModel('sonnet'), max_tokens:700, messages:[{role:'user',content:prompt}] });
      const text=r.content[0]?.type==='text'?r.content[0].text.trim():'[]';
      return JSON.parse(text.replace(/```json|```/g,'').trim());
    } catch {
      return [
        {type:'growth',priority:'high',title:'Launch dealer acquisition campaign',insight:'New signups slowed — high-value zones untapped',action:'Email Dubai Free Zone businesses today',impact:'+5 dealers in 2 weeks',effort:'low'},
        {type:'revenue',priority:'high',title:'Upsell active dealers to Pro',insight:'Starter dealers reaching vehicle limits',action:'Send personalised upgrade email with ROI',impact:'+15% MRR',effort:'low'},
        {type:'retention',priority:'medium',title:'Activate dormant dealers',insight:'Several dealers with 0 activity last 30 days',action:'Trigger win-back WhatsApp sequence',impact:'Recover 20% dormant accounts',effort:'medium'},
        {type:'activation',priority:'medium',title:'Improve onboarding completion',insight:'Empty inventory dealers signal onboarding friction',action:'Add AI vehicle scan tutorial prompt',impact:'+30% activation rate',effort:'medium'},
      ];
    }
  }

  async getTasks(status?:string) { return this.prisma.execTask.findMany({ where:status?{status}:{}, orderBy:[{priority:'desc'},{created_at:'desc'}] }); }
  async createTask(data:any) { return this.prisma.execTask.create({data}); }
  async updateTask(id:string,data:any) { return this.prisma.execTask.update({where:{id},data}); }
  async deleteTask(id:string) { return this.prisma.execTask.delete({where:{id}}); }

  async getMeetings() { return this.prisma.execMeeting.findMany({ where:{date:{gte:new Date()},status:'scheduled'}, orderBy:{date:'asc'}, take:8 }); }
  async createMeeting(data:any) { return this.prisma.execMeeting.create({ data:{...data,date:new Date(data.date)} }); }
  async updateMeeting(id:string,data:any) { return this.prisma.execMeeting.update({where:{id},data}); }

  async getKpiHistory() { return this.prisma.kpiSnapshot.findMany({ orderBy:{date:'asc'}, take:90 }); }
}

@Roles('admin')
@Controller('executive')
export class ExecutiveController {
  constructor(private svc:ExecutiveService) {}

  @Get('stats')
  async stats() {
    const s=await this.svc.getExecutiveStats();
    const [ai,mrr_chart,dealer_chart,meetings]=await Promise.all([
      this.svc.getAIRecommendations(s),
      this.svc.getMRRChart(),
      this.svc.getDealerGrowthChart(),
      this.svc.getMeetings(),
    ]);
    return {...s, ai_recommendations:ai, mrr_chart, dealer_chart, meetings};
  }

  @Get('kpi-history') kpiHistory() { return this.svc.getKpiHistory(); }

  @Get('tasks')      getTasks(@Query('status') s?:string) { return this.svc.getTasks(s); }
  @Post('tasks')     createTask(@Body() b:any) { return this.svc.createTask(b); }
  @Patch('tasks/:id') updateTask(@Param('id') id:string,@Body() b:any) { return this.svc.updateTask(id,b); }
  @Delete('tasks/:id') deleteTask(@Param('id') id:string) { return this.svc.deleteTask(id); }

  @Get('meetings')     getMeetings() { return this.svc.getMeetings(); }
  @Post('meetings')    createMeeting(@Body() b:any) { return this.svc.createMeeting(b); }
  @Patch('meetings/:id') updateMeeting(@Param('id') id:string,@Body() b:any) { return this.svc.updateMeeting(id,b); }
}

@Module({ controllers:[ExecutiveController], providers:[ExecutiveService], exports:[ExecutiveService] })
export class ExecutiveModule {}
