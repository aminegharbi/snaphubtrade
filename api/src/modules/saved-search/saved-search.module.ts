import { Module, Controller, Get, Post, Delete, Body, Param, Query, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class SavedSearchService {
  constructor(private prisma: PrismaService) {}

  // Reuse AlertSubscription table with alert_type='saved_search'
  async save(body: any) {
    return this.prisma.alertSubscription.create({
      data: {
        email: body.email, alert_type: 'saved_search',
        filters: { ...body.filters, label: body.label || 'My Search' },
        channel: body.notify ? ['email'] : [],
      },
    });
  }

  async getMine(email: string) {
    return this.prisma.alertSubscription.findMany({
      where: { email, alert_type: 'saved_search', is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async delete(id: string) {
    return this.prisma.alertSubscription.delete({ where: { id } });
  }
}

@Controller('saved-searches')
export class SavedSearchController {
  constructor(private svc: SavedSearchService) {}
  @Post()        save(@Body() b: any) { return this.svc.save(b); }
  @Get()         mine(@Query('email') e: string) { return this.svc.getMine(e); }
  @Delete(':id') del(@Param('id') id: string) { return this.svc.delete(id); }
}

@Module({ controllers: [SavedSearchController], providers: [SavedSearchService] })
export class SavedSearchModule {}
