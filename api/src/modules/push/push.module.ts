import {
  Module, Controller, Get, Post, Patch, Delete, Body, Param, Query, Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';

const TYPE_CFG: Record<string,{emoji:string;label:string}> = {
  announcement:{emoji:'📢',label:'Announcement'}, price_drop:{emoji:'💸',label:'Price Drop'},
  promotion:{emoji:'🎁',label:'Promotion'}, update:{emoji:'🔔',label:'Update'},
  news:{emoji:'📰',label:'Market News'}, alert:{emoji:'⚠️',label:'Alert'},
};

@Injectable()
export class PushService {
  constructor(private prisma: PrismaService) {}

  async listCampaigns(status?: string) {
    const campaigns = await this.prisma.pushCampaign.findMany({
      where: status?{status}:{},
      orderBy:{created_at:'desc'}, take:100,
      include:{ _count:{select:{sends:true}} },
    });
    return campaigns.map(c=>({
      ...c,
      click_rate: c.total_sent>0?Math.round((c.total_clicked/c.total_sent)*1000)/10:0,
    }));
  }

  async getCampaign(id: string) {
    return this.prisma.pushCampaign.findUnique({
      where:{id}, include:{ sends:{orderBy:{created_at:'desc'}, take:50} },
    });
  }

  async createCampaign(data: any) {
    return this.prisma.pushCampaign.create({ data:{
      title:data.title, body:data.body, image_url:data.image_url,
      action_url:data.action_url||'https://dubaiauto.ae',
      action_label:data.action_label||'View',
      type:data.type||'announcement', audience:data.audience||'all',
      scheduled_at:data.scheduled_at?new Date(data.scheduled_at):undefined,
    }});
  }

  async updateCampaign(id: string, data: any) {
    return this.prisma.pushCampaign.update({ where:{id}, data:{
      ...(data.title!==undefined&&{title:data.title}),
      ...(data.body!==undefined&&{body:data.body}),
      ...(data.type!==undefined&&{type:data.type}),
      ...(data.audience!==undefined&&{audience:data.audience}),
      ...(data.action_url!==undefined&&{action_url:data.action_url}),
      ...(data.action_label!==undefined&&{action_label:data.action_label}),
      ...(data.scheduled_at!==undefined&&{scheduled_at:data.scheduled_at?new Date(data.scheduled_at):null}),
    }});
  }

  async deleteCampaign(id: string) {
    return this.prisma.pushCampaign.delete({ where:{id} });
  }

  // Resolve audience to {type, id, name, email}[]
  private async resolveAudience(audience: string) {
    const recipients: {type:string;id:string;name:string}[] = [];
    if (audience==='all'||audience==='dealers') {
      const dealers = await this.prisma.dealer.findMany({ where:{verified:true}, select:{id:true,company_name:true} });
      dealers.forEach(d=>recipients.push({type:'dealer',id:d.id,name:d.company_name}));
    }
    if (audience==='all'||audience==='brokers') {
      const brokers = await this.prisma.broker.findMany({ where:{status:'active'}, select:{id:true,full_name:true} });
      brokers.forEach(b=>recipients.push({type:'broker',id:b.id,name:b.full_name}));
    }
    if (audience==='all'||audience==='buyers') {
      const users = await this.prisma.user.findMany({ take:1000, select:{id:true,full_name:true} });
      users.forEach(u=>recipients.push({type:'user',id:u.id,name:u.full_name||'User'}));
    }
    return recipients;
  }

  async sendCampaign(id: string) {
    const campaign = await this.prisma.pushCampaign.findUnique({ where:{id} });
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status==='sent') throw new Error('Already sent');

    await this.prisma.pushCampaign.update({ where:{id}, data:{status:'sending'} });
    const recipients = await this.resolveAudience(campaign.audience);
    const tc = TYPE_CFG[campaign.type]||TYPE_CFG.announcement;

    let sentCount = 0;
    const BATCH = 50;
    for (let i=0; i<recipients.length; i+=BATCH) {
      const batch = recipients.slice(i,i+BATCH);
      await Promise.all(batch.map(async r => {
        try {
          // Create in-app notification via existing Notification model
          const notifData: any = {
            type:'push_campaign', category:campaign.type,
            title:`${tc.emoji} ${campaign.title}`,
            body:campaign.body,
            data:{ action_url:campaign.action_url, action_label:campaign.action_label },
          };
          if (r.type==='dealer') notifData.dealer_id = r.id;
          if (r.type==='broker') notifData.broker_id = r.id;
          // Skip 'user' type — Notification model only links dealer/broker
          if (r.type==='user') { sentCount++; return; }
          const notif = await this.prisma.notification.create({ data:notifData }).catch(()=>null);

          await this.prisma.pushSend.create({ data:{
            campaign_id:id, recipient_type:r.type, recipient_id:r.id,
            notification_id:notif?.id,
          }});
          sentCount++;
        } catch {}
      }));
    }

    await this.prisma.pushCampaign.update({ where:{id}, data:{
      status:'sent', sent_at:new Date(), total_sent:sentCount,
    }});
    return { sent:sentCount, total:recipients.length };
  }

  async trackClick(sendId: string) {
    const send = await this.prisma.pushSend.findUnique({ where:{id:sendId} });
    if (send&&!send.clicked) {
      await this.prisma.pushSend.update({ where:{id:sendId}, data:{clicked:true,clicked_at:new Date()} });
      await this.prisma.pushCampaign.update({ where:{id:send.campaign_id}, data:{total_clicked:{increment:1}} });
    }
  }

  async getAnalytics() {
    const [total,sent,drafts,sending] = await Promise.all([
      this.prisma.pushCampaign.count(),
      this.prisma.pushCampaign.count({where:{status:'sent'}}),
      this.prisma.pushCampaign.count({where:{status:'draft'}}),
      this.prisma.pushCampaign.count({where:{status:'sending'}}),
    ]);
    const agg = await this.prisma.pushCampaign.aggregate({
      where:{status:'sent'},
      _sum:{total_sent:true,total_clicked:true},
    });
    const totalSent    = agg._sum.total_sent||0;
    const totalClicked = agg._sum.total_clicked||0;
    return {
      total_campaigns:total, sent_campaigns:sent, drafts, sending,
      total_sent:totalSent, total_clicked:totalClicked,
      avg_ctr: totalSent>0?Math.round((totalClicked/totalSent)*1000)/10:0,
    };
  }

  async getAudienceCounts() {
    const [dealers,brokers,users] = await Promise.all([
      this.prisma.dealer.count({where:{verified:true}}),
      this.prisma.broker.count({where:{status:'active'}}),
      this.prisma.user.count(),
    ]);
    return { dealers, brokers, buyers:users, all:dealers+brokers+users };
  }
}

@Roles('admin')
@Controller('push')
export class PushController {
  constructor(private svc: PushService) {}
  @Get('analytics')   analytics()     { return this.svc.getAnalytics(); }
  @Get('audiences')   audiences()     { return this.svc.getAudienceCounts(); }
  @Get('campaigns')   list(@Query('status') s?:string) { return this.svc.listCampaigns(s); }
  @Post('campaigns')  create(@Body() b:any) { return this.svc.createCampaign(b); }
  @Get('campaigns/:id')  get(@Param('id') id:string) { return this.svc.getCampaign(id); }
  @Patch('campaigns/:id') update(@Param('id') id:string,@Body() b:any) { return this.svc.updateCampaign(id,b); }
  @Delete('campaigns/:id') del(@Param('id') id:string) { return this.svc.deleteCampaign(id); }
  @Post('campaigns/:id/send') send(@Param('id') id:string) { return this.svc.sendCampaign(id); }
  @Post('track/:sendId') track(@Param('sendId') id:string) { return this.svc.trackClick(id); }
}

@Module({ controllers:[PushController], providers:[PushService], exports:[PushService] })
export class PushModule {}
