import { Module, Controller, Get, Param, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Public } from '../../shared/auth/public.decorator';

@Injectable()
export class CountriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const countries = await this.prisma.country.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
    return countries;
  }

  async findFreeZones(code: string) {
    const country = await this.prisma.country.findUnique({
      where: { code: code.toUpperCase() },
      include: { free_zones: { where: { is_active: true }, orderBy: { name: 'asc' } } },
    });
    if (!country) throw new NotFoundException('Country not found');
    return country.free_zones;
  }
}

// Public, read-only reference data (GCC countries + their free zones) — used
// by registration forms, filters, and admin dealer/broker editing across the
// frontend. Deliberately its own small module rather than folded into
// dealers, since brokers/vehicles/leads all need the same list independently
// of any dealer context.
@Public()
@Controller('countries')
export class CountriesController {
  constructor(private service: CountriesService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':code/free-zones')
  findFreeZones(@Param('code') code: string) { return this.service.findFreeZones(code); }
}

@Module({
  controllers: [CountriesController],
  providers: [CountriesService],
  exports: [CountriesService],
})
export class CountriesModule {}
