import {
  Module, Controller, Get, Post, Patch, Delete, Body, Param, Query, Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';

@Injectable()
export class AffiliateService {
  constructor(private prisma: PrismaService) {}

  // ── Leaderboard: top affiliates by earnings ───────────────────────────────
  async getLeaderboard(period: 'month'|'quarter'|'all'='month') {
    const now=new Date();
    let since: Date|undefined;
    if (period==='month')   { since=new Date(now.getFullYear(),now.getMonth(),1); }
    if (period==='quarter') { since=new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3,1); }

    const brokers = await this.prisma.broker.findMany({
      where:{status:'active'},
      include:{
        deals:{
          where:since?{created_at:{gte:since}}:{},
          select:{commission_aed:true,deal_price_aed:true,created_at:true,status:true},
        },
        affiliatePayments:{ select:{status:true,amount_aed:true,paid_at:true} },
      },
    });

    return brokers.map(b=>{
      const deals   = b.deals||[];
      const earnings= deals.reduce((s,d)=>s+Number(d.commission_aed||0),0);
      const volume  = deals.reduce((s,d)=>s+Number(d.deal_price_aed||0),0);
      const pending = (b.affiliatePayments||[]).filter(p=>p.status==='pending').reduce((s,p)=>s+Number(p.amount_aed),0);
      const paid    = (b.affiliatePayments||[]).filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount_aed),0);
      return {
        id:b.id, full_name:b.full_name, email:b.email, tier:b.tier,
        affiliate_code:b.affiliate_code, country:b.country,
        commission_rate:Number(b.commission_rate||0.015),
        deals_count:deals.length, earnings, volume,
        pending_payout:pending, total_paid:paid,
      };
    }).sort((a,b)=>b.earnings-a.earnings);
  }

  // ── Single affiliate detail ───────────────────────────────────────────────
  async getAffiliate(id: string) {
    const broker = await this.prisma.broker.findUnique({
      where:{id},
      include:{
        deals:{orderBy:{created_at:'desc'}, take:50,
          include:{dealer:{select:{company_name:true}}}},
        affiliatePayments:{orderBy:{created_at:'desc'}, take:20},
      },
    });
    if (!broker) throw new Error('Affiliate not found');

    // Monthly earnings last 6 months
    const monthly: any[] = [];
    for (let i=5;i>=0;i--) {
      const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); d.setMonth(d.getMonth()-i);
      const end=new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59);
      const agg = await this.prisma.brokerDeal.aggregate({
        where:{broker_id:id,created_at:{gte:d,lte:end}},
        _sum:{commission_aed:true,deal_price_aed:true}, _count:true,
      });
      monthly.push({ month:d.toLocaleString('en-US',{month:'short',year:'2-digit'}), earnings:Number(agg._sum.commission_aed||0), volume:Number(agg._sum.deal_price_aed||0), deals:agg._count });
    }

    const totalEarnings = broker.deals.reduce((s,d)=>s+Number(d.commission_aed||0),0);
    const pendingPayout = broker.affiliatePayments.filter(p=>p.status==='pending').reduce((s,p)=>s+Number(p.amount_aed),0);
    const totalPaid     = broker.affiliatePayments.filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount_aed),0);

    return { ...broker, totalEarnings, pendingPayout, totalPaid, monthly };
  }

  // ── Payments CRUD ─────────────────────────────────────────────────────────
  async listPayments(status?: string) {
    return this.prisma.affiliatePayment.findMany({
      where:status?{status}:{},
      orderBy:{created_at:'desc'}, take:100,
      include:{broker:{select:{full_name:true,email:true,tier:true,affiliate_code:true}}},
    });
  }

  async createPayment(data: any) {
    return this.prisma.affiliatePayment.create({ data:{
      broker_id:data.broker_id, amount_aed:Number(data.amount_aed),
      deals_count:Number(data.deals_count||0),
      period_start:new Date(data.period_start), period_end:new Date(data.period_end),
      status:data.status||'pending', payment_method:data.payment_method,
      notes:data.notes,
    }});
  }

  async updatePayment(id: string, data: any) {
    const updates: any = {};
    if (data.status!==undefined)          { updates.status=data.status; if(data.status==='paid') updates.paid_at=new Date(); }
    if (data.payment_method!==undefined)  updates.payment_method=data.payment_method;
    if (data.payment_ref!==undefined)     updates.payment_ref=data.payment_ref;
    if (data.notes!==undefined)           updates.notes=data.notes;
    updates.updated_at=new Date();
    return this.prisma.affiliatePayment.update({ where:{id}, data:updates });
  }

  // ── Bulk create pending payouts for all affiliates with unpaid earnings ───
  async createBulkPayouts(period: {start:string;end:string}) {
    const start=new Date(period.start), end=new Date(period.end);
    const brokers = await this.prisma.broker.findMany({where:{status:'active'},select:{id:true}});
    let created=0;
    for (const b of brokers) {
      const agg = await this.prisma.brokerDeal.aggregate({
        where:{broker_id:b.id, created_at:{gte:start,lte:end}, status:{in:['completed','paid']}},
        _sum:{commission_aed:true}, _count:true,
      });
      const amount = Number(agg._sum.commission_aed||0);
      if (amount>0) {
        await this.prisma.affiliatePayment.create({ data:{
          broker_id:b.id, amount_aed:amount, deals_count:agg._count,
          period_start:start, period_end:end, status:'pending',
        }});
        created++;
      }
    }
    return { created };
  }

  // ── Global stats ──────────────────────────────────────────────────────────
  async getStats() {
    const month=new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const [totalBrokers,activeBrokers,dealsMonth,pendingPayouts] = await Promise.all([
      this.prisma.broker.count(),
      this.prisma.broker.count({where:{status:'active'}}),
      this.prisma.brokerDeal.count({where:{created_at:{gte:month}}}),
      this.prisma.affiliatePayment.aggregate({where:{status:'pending'},_sum:{amount_aed:true},_count:true}),
    ]);
    const earningsAgg = await this.prisma.brokerDeal.aggregate({where:{created_at:{gte:month}},_sum:{commission_aed:true}});
    const tierBreakdown = await this.prisma.broker.groupBy({by:['tier'],_count:{_all:true},where:{status:'active'}});
    return {
      total_affiliates:totalBrokers, active_affiliates:activeBrokers,
      deals_this_month:dealsMonth,
      earnings_this_month:Number(earningsAgg._sum.commission_aed||0),
      pending_payout_count:pendingPayouts._count,
      pending_payout_aed:Number(pendingPayouts._sum.amount_aed||0),
      tier_breakdown:tierBreakdown.map(t=>({tier:t.tier,count:t._count._all})),
    };
  }
}

@Roles('admin')
@Controller('affiliates')
export class AffiliateController {
  constructor(private svc: AffiliateService) {}
  @Get('stats')           stats()  { return this.svc.getStats(); }
  @Get('leaderboard')     lb(@Query('period') p:'month'|'quarter'|'all'='month') { return this.svc.getLeaderboard(p); }
  @Get('/:id')            get(@Param('id') id:string) { return this.svc.getAffiliate(id); }
  @Get('payments')        payments(@Query('status') s?:string) { return this.svc.listPayments(s); }
  @Post('payments')       create(@Body() b:any) { return this.svc.createPayment(b); }
  @Patch('payments/:id')  update(@Param('id') id:string,@Body() b:any) { return this.svc.updatePayment(id,b); }
  @Post('payments/bulk')  bulk(@Body() b:any) { return this.svc.createBulkPayouts(b); }
}

@Module({ controllers:[AffiliateController], providers:[AffiliateService], exports:[AffiliateService] })
export class AffiliateModule {}
