import {
  Module, Controller, Get, Post, Patch, Delete, Body, Param, Query, Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';

@Injectable()
export class MarketingService {
  constructor(private prisma: PrismaService) {}

  // ── Lead generation funnel ────────────────────────────────────────────────
  async getLeadFunnel() {
    const [total,new_,active,qualified,customer,churned] = await Promise.all([
      this.prisma.crmContact.count(),
      this.prisma.crmContact.count({where:{status:'new'}}),
      this.prisma.crmContact.count({where:{status:'active'}}),
      this.prisma.crmContact.count({where:{status:'qualified'}}),
      this.prisma.crmContact.count({where:{status:'customer'}}),
      this.prisma.crmContact.count({where:{status:'churned'}}),
    ]);
    return [
      {stage:'Total Leads',count:total,color:'#60A5FA'},
      {stage:'Active',count:active,color:'#A78BFA'},
      {stage:'Qualified',count:qualified,color:'#FBBF24'},
      {stage:'Customers',count:customer,color:'#34D399'},
      {stage:'Churned',count:churned,color:'#F87171'},
    ];
  }

  // ── Lead sources breakdown ────────────────────────────────────────────────
  async getLeadsBySource() {
    const rows = await this.prisma.crmContact.groupBy({
      by:['source'], _count:{_all:true}, orderBy:{_count:{source:'desc'}},
    });
    return rows.map(r=>({source:r.source||'unknown',count:r._count._all}));
  }

  // ── Lead velocity (new per month, last 6 months) ──────────────────────────
  async getLeadVelocity() {
    const results: any[] = [];
    for (let i=5;i>=0;i--) {
      const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); d.setMonth(d.getMonth()-i);
      const end=new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59);
      const [leads,customers,dealers] = await Promise.all([
        this.prisma.crmContact.count({where:{created_at:{gte:d,lte:end}}}),
        this.prisma.crmContact.count({where:{created_at:{gte:d,lte:end},status:'customer'}}),
        this.prisma.dealer.count({where:{created_at:{gte:d,lte:end}}}),
      ]);
      results.push({month:d.toLocaleString('en-US',{month:'short',year:'2-digit'}),leads,customers,dealers});
    }
    return results;
  }

  // ── Email campaign performance ────────────────────────────────────────────
  async getEmailPerformance() {
    const campaigns = await this.prisma.emailCampaign.findMany({
      where:{status:'sent'}, orderBy:{sent_at:'desc'}, take:10,
      select:{id:true,name:true,subject_a:true,sent_at:true,total_recipients:true,segment:true},
    });
    return Promise.all(campaigns.map(async c=>{
      const [sent,opened,clicked] = await Promise.all([
        this.prisma.emailSend.count({where:{campaign_id:c.id,status:'sent'}}),
        this.prisma.emailSend.count({where:{campaign_id:c.id,opened:true}}),
        this.prisma.emailSend.count({where:{campaign_id:c.id,clicked:true}}),
      ]);
      return {...c, sent, open_rate:sent>0?Math.round((opened/sent)*1000)/10:0, click_rate:sent>0?Math.round((clicked/sent)*1000)/10:0};
    }));
  }

  // ── Revenue metrics ───────────────────────────────────────────────────────
  async getRevenueMetrics() {
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const prev  = new Date(month); prev.setMonth(prev.getMonth()-1);

    const [mrr,prev_mrr,activeSubs,totalDealers,newDealersMonth] = await Promise.all([
      this.prisma.subscriptionPayment.aggregate({where:{status:'completed',created_at:{gte:month}},_sum:{amount:true}}),
      this.prisma.subscriptionPayment.aggregate({where:{status:'completed',created_at:{gte:prev,lt:month}},_sum:{amount:true}}),
      this.prisma.dealerSubscription.count({where:{status:{in:['active','trialing']}}}),
      this.prisma.dealer.count({where:{verified:true}}),
      this.prisma.dealer.count({where:{created_at:{gte:month}}}),
    ]);
    const mrrVal = Number(mrr._sum.amount||0);
    const prevVal= Number(prev_mrr._sum.amount||0);

    // CAC = Marketing spend / new customers (from MarketingSpend)
    const spendMonth = await this.prisma.marketingSpend.aggregate({
      where:{month:{gte:month}}, _sum:{amount_aed:true},
    });
    const totalSpend = Number(spendMonth._sum.amount_aed||0);
    const cac = newDealersMonth>0?Math.round(totalSpend/newDealersMonth):0;

    // LTV = avg subscription price / monthly churn estimate
    const avgPlan = await this.prisma.subscriptionPlan.aggregate({_avg:{price_monthly:true}});
    const avgMonthly = Number(avgPlan._avg.price_monthly||299);
    const ltv = Math.round(avgMonthly * 18); // assume 18-month avg retention

    return {
      mrr:mrrVal, prev_mrr:prevVal, arr:mrrVal*12,
      mrr_growth_pct:prevVal>0?Math.round(((mrrVal-prevVal)/prevVal)*100):0,
      active_subscriptions:activeSubs, active_dealers:totalDealers,
      new_dealers_month:newDealersMonth,
      marketing_spend_month:totalSpend, cac, ltv,
      roi: totalSpend>0?Math.round(((mrrVal-totalSpend)/totalSpend)*100):0,
      cost_per_lead: (await this.prisma.crmContact.count({where:{created_at:{gte:month}}})) > 0
        ? Math.round(totalSpend/(await this.prisma.crmContact.count({where:{created_at:{gte:month}}})))
        : 0,
    };
  }

  // ── Top channels: dealers + leads combined ────────────────────────────────
  async getTopChannels() {
    const sources = await this.prisma.crmContact.groupBy({
      by:['source'], _count:{_all:true}, orderBy:{_count:{source:'desc'}},
    });
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const monthLeads = await this.prisma.crmContact.groupBy({
      by:['source'],where:{created_at:{gte:month}}, _count:{_all:true},
    });
    const monthMap: Record<string,number>={};
    monthLeads.forEach(r=>monthMap[r.source||'unknown']=r._count._all);
    return sources.map(r=>({
      channel:r.source||'unknown',
      total:r._count._all,
      this_month:monthMap[r.source||'unknown']||0,
    }));
  }

  // ── Push notification analytics ───────────────────────────────────────────
  async getPushStats() {
    const [total,sent_count] = await Promise.all([
      this.prisma.pushCampaign.count(),
      this.prisma.pushCampaign.count({where:{status:'sent'}}),
    ]);
    const agg = await this.prisma.pushCampaign.aggregate({
      where:{status:'sent'}, _sum:{total_sent:true,total_clicked:true},
    });
    return { total_campaigns:total, sent:sent_count, total_reached:agg._sum.total_sent||0, total_clicked:agg._sum.total_clicked||0 };
  }

  // ── Marketing spend CRUD ──────────────────────────────────────────────────
  async getSpend() {
    return this.prisma.marketingSpend.findMany({ orderBy:[{month:'desc'},{channel:'asc'}], take:100 });
  }

  async upsertSpend(data: {month:string;channel:string;amount_aed:number;notes?:string}) {
    const month = new Date(data.month); month.setDate(1); month.setHours(0,0,0,0);
    return this.prisma.marketingSpend.upsert({
      where:{month_channel:{month,channel:data.channel}},
      create:{month,channel:data.channel,amount_aed:data.amount_aed,notes:data.notes},
      update:{amount_aed:data.amount_aed,notes:data.notes},
    });
  }

  async deleteSpend(id: string) { return this.prisma.marketingSpend.delete({where:{id}}); }

  // ── Full dashboard payload ────────────────────────────────────────────────
  async getDashboard() {
    const [funnel,sources,velocity,email,revenue,channels,push] = await Promise.all([
      this.getLeadFunnel(),
      this.getLeadsBySource(),
      this.getLeadVelocity(),
      this.getEmailPerformance(),
      this.getRevenueMetrics(),
      this.getTopChannels(),
      this.getPushStats(),
    ]);
    return { funnel, sources, velocity, email_campaigns:email, revenue, channels, push };
  }
}

@Roles('admin')
@Controller('marketing')
export class MarketingController {
  constructor(private svc: MarketingService) {}
  @Get('dashboard') dashboard() { return this.svc.getDashboard(); }
  @Get('spend')     getSpend()  { return this.svc.getSpend(); }
  @Post('spend')    upsertSpend(@Body() b:any) { return this.svc.upsertSpend(b); }
  @Delete('spend/:id') delSpend(@Param('id') id:string) { return this.svc.deleteSpend(id); }
}

@Module({ controllers:[MarketingController], providers:[MarketingService], exports:[MarketingService] })
export class MarketingModule {}
