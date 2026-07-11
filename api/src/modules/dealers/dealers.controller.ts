import { Controller, Get, Put, Patch, Post, Param, Body, Query, Request, ForbiddenException } from '@nestjs/common';
import { DealersService } from './dealers.service';
import { Public } from '../../shared/auth/public.decorator';
import { Roles } from '../../shared/auth/roles.decorator';
import { UpdateDealerDto } from './dto/update-dealer.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('dealers')
export class DealersController {
  constructor(private readonly service: DealersService) {}

  @Public()
  @Get()
  findAll(@Query() q: any) { return this.service.findAll(q); }

  @Public()
  @Get('zones')
  // ?country=AE filters to one country's free zones; omitted returns all GCC
  // countries grouped with their zones. Replaces the old hardcoded UAE-only list.
  getZones(@Query('country') country?: string) { return this.service.getZones(country); }

  @Public()
  @Get(':id/trust-score')
  trustScore(@Param('id') id: string) { return this.service.getTrustScore(id); }

  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) { return this.service.findBySlug(slug); }

  // Only the owning dealer (matched by req.user.dealerId) or an admin may update.
  @Roles('dealer', 'admin')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateDealerDto, @Request() req: any) {
    if (req.user.role === 'dealer' && req.user.dealerId !== id) {
      throw new ForbiddenException("You can only modify your own dealer profile");
    }
    return this.service.update(id, body);
  }

  // Alias for PATCH — the dealer profile page in the frontend uses PATCH semantics.
  @Roles('dealer', 'admin')
  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: UpdateDealerDto, @Request() req: any) {
    if (req.user.role === 'dealer' && req.user.dealerId !== id) {
      throw new ForbiddenException("You can only modify your own dealer profile");
    }
    return this.service.update(id, body);
  }

  @Public()
  @Get(':id/stats')
  getStats(@Param('id') id: string) { return this.service.getStats(id); }

  @Public()
  @Get(':id/reviews')
  getReviews(@Param('id') id: string) { return this.service.getReviews(id); }

  // Any authenticated buyer can leave a review (default: authenticated, any role).
  @Post(':id/reviews')
  addReview(@Param('id') id: string, @Body() body: CreateReviewDto, @Request() req: any) {
    return this.service.addReview(id, { ...body, user_id: req.user.userId });
  }
}
