import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  private activePromotionWhere(now = new Date()) {
    return {
      active: true,
      starts_at: { lte: now },
      OR: [{ ends_at: null }, { ends_at: { gte: now } }],
    };
  }

  async findAll(query: any) {
    const {
      make, model, year_min, year_max, price_min, price_max,
      fuel_type, transmission, body_type, export_eligible,
      dealer_id, country, status = 'available', sort = 'newest',
      page = 1, limit = 24,
    } = query;

    const where: any = { status };
    if (make) where.make = { equals: make, mode: 'insensitive' };
    if (model) where.model = { equals: model, mode: 'insensitive' };
    if (year_min || year_max) where.year = { gte: year_min ? +year_min : undefined, lte: year_max ? +year_max : undefined };
    if (price_min || price_max) where.price_aed = { gte: price_min ? +price_min : undefined, lte: price_max ? +price_max : undefined };
    if (fuel_type) where.fuel_type = fuel_type;
    if (transmission) where.transmission = transmission;
    if (body_type) where.body_type = { contains: body_type, mode: 'insensitive' };
    if (export_eligible !== undefined) where.export_eligible = export_eligible === 'true';
    if (dealer_id) where.dealer_id = dealer_id;
    // Browse by GCC country (ISO code, e.g. ?country=SA) via the owning dealer —
    // lets the catalog scale beyond UAE without a separate endpoint per market.
    if (country) where.dealer = { country: { code: String(country).toUpperCase() } };

    const sortMap: any = {
      newest: { created_at: 'desc' },
      price_asc: { price_aed: 'asc' },
      price_desc: { price_aed: 'desc' },
      mileage: { mileage_km: 'asc' },
      popular: { view_count: 'desc' },
    };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Math.min(Number(limit), 100);

    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        orderBy: sortMap[sort] || sortMap.newest,
        skip,
        take,
        include: {
          vehicle_images: { where: { is_primary: true }, take: 1 },
          dealer: { select: { id: true, company_name: true, slug: true, verified: true, rating: true, whatsapp: true } },
          promotions: { where: this.activePromotionWhere(), take: 1 },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { items, total, page: +page, limit: take, pages: Math.ceil(total / take) };
  }

  async getFeatured() {
    try {
      return await this.prisma.vehicle.findMany({
        where: { status: 'available' },
        orderBy: [{ view_count: 'desc' }, { created_at: 'desc' }],
        take: 8,
        include: {
          vehicle_images: { where: { is_primary: true }, take: 1 },
          dealer: { select: { company_name: true, slug: true, verified: true, rating: true } },
          promotions: { where: this.activePromotionWhere(), take: 1 },
        },
      });
    } catch {
      return [];
    }
  }

  async getMakes() {
    const result = await this.prisma.vehicle.groupBy({
      by: ['make'],
      where: { status: 'available' },
      _count: { make: true },
      orderBy: { _count: { make: 'desc' } },
    });
    return result.map((r) => ({ make: r.make, count: Number(r._count.make) }));
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        vehicle_images: { orderBy: { position: 'asc' } },
        dealer: {
          select: {
            id: true, company_name: true, slug: true, verified: true,
            rating: true, review_count: true, phone: true, whatsapp: true,
            email: true, languages: true, export_destinations: true,
          },
        },
        price_history: { orderBy: { changed_at: 'desc' }, take: 10 },
        promotions: { where: this.activePromotionWhere(), take: 1 },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    await this.prisma.vehicle.update({ where: { id }, data: { view_count: { increment: 1 } } });
    return vehicle;
  }

  async create(data: any, dealerId?: string) {
    const ALLOWED = [
      'dealer_id','vin','plate_number','specs_origin','make','model','year','generation','trim','body_type',
      'fuel_type','transmission','engine','horsepower','torque','doors','seats',
      'mileage_km','color_exterior','color_interior','wheels','country_origin',
      'specs','features','price_aed','price_min_aed','price_suggested_aed',
      'negotiable','status','export_eligible','title','description','seo_keywords','stock_quantity',
    ];

    const clean: any = {};
    for (const key of ALLOWED) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        clean[key] = data[key];
      }
    }

    clean.dealer_id = dealerId || data.dealer_id;
    clean.status = data.status || 'available';
    clean.price_aed = Number(data.price_aed);
    clean.year = Number(data.year);
    clean.mileage_km = Number(data.mileage_km || 0);

    if (!clean.dealer_id) throw new Error('dealer_id is required');
    if (!clean.make) throw new Error('make is required');
    if (!clean.model) throw new Error('model is required');

    // Denominate the listing in the dealer's actual operating currency (SAR,
    // QAR, BHD, KWD, OMR...) rather than assuming AED — this is what makes
    // `currency` on Vehicle meaningful instead of always defaulting to AED.
    const dealer = await this.prisma.dealer.findUnique({
      where: { id: clean.dealer_id },
      include: { country: true },
    });
    clean.currency = dealer?.country?.currency_code || 'AED';

    const vehicle = await this.prisma.vehicle.create({ data: clean });

    await this.prisma.priceHistory.create({
      data: { vehicle_id: vehicle.id, price_aed: clean.price_aed },
    });

    return vehicle;
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vehicle not found');

    const ALLOWED = [
      // Identity
      'make','model','year','trim','vin','plate_number',
      // Body
      'body_type','doors','seats','color_exterior','color_interior',
      // Powertrain
      'fuel_type','transmission','engine','engine_size','engine_power_hp','horsepower','torque',
      // Commercial
      'mileage_km','price_aed','price_suggested_aed','price_min_aed',
      'export_eligible','negotiable','is_new','stock_quantity','country_origin',
      // Status & content
      'status','title','description','seo_keywords','specs','features','wheels',
    ];
    const clean: any = {};
    for (const key of ALLOWED) {
      if (data[key] !== undefined) clean[key] = data[key];
    }
    // Type coercions for numeric fields
    if (clean.year)            clean.year = Number(clean.year);
    if (clean.mileage_km)      clean.mileage_km = Number(clean.mileage_km);
    if (clean.price_aed)       clean.price_aed = Number(clean.price_aed);
    if (clean.doors)           clean.doors = Number(clean.doors);
    if (clean.seats)           clean.seats = Number(clean.seats);
    if (clean.engine_power_hp) clean.engine_power_hp = Number(clean.engine_power_hp);
    if (clean.stock_quantity)  clean.stock_quantity = Number(clean.stock_quantity);
    clean.updated_at = new Date();

    if (data.price_aed && +data.price_aed !== +existing.price_aed) {
      await this.prisma.priceHistory.create({
        data: { vehicle_id: id, price_aed: data.price_aed },
      });
    }
    return this.prisma.vehicle.update({ where: { id }, data: clean, include: { vehicle_images: true } });
  }

  async updateStatus(id: string, status: string) {
    // If marking as sold, also track the unit sale for KPI counters
    if (status === 'sold') {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
      if (vehicle) {
        return this.prisma.vehicle.update({
          where: { id },
          data: {
            status: 'sold',
            sold_units: { increment: 1 },
            stock_quantity: Number(vehicle.stock_quantity) > 0 ? { decrement: 1 } : undefined,
          },
        });
      }
    }
    return this.prisma.vehicle.update({ where: { id }, data: { status } });
  }

  async remove(id: string) {
    await this.prisma.vehicle.delete({ where: { id } });
  }

  async uploadImages(files: any[], vehicleId: string) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'vehicles');
    fs.mkdirSync(uploadDir, { recursive: true });
    const savedImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = path.extname(file.originalname || '.jpg') || '.jpg';
      const filename = `${crypto.randomUUID()}${ext}`;
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, file.buffer);
      // Use relative URL so it works from any host via nginx proxy
      const cdnUrl = `/static/vehicles/${filename}`;
      const img = await this.prisma.vehicleImage.create({
        data: { vehicle_id: vehicleId, s3_key: `vehicles/${filename}`, cdn_url: cdnUrl, thumb_url: cdnUrl, is_primary: i === 0, position: i },
      });
      savedImages.push(img);
    }
    return savedImages;
  }

  async bulkCreate(vehicles: any[], dealerId: string) {
    const results = await Promise.all(vehicles.map((v) => this.create(v, dealerId)));
    return { created: results.length, items: results };
  }

  async upsertPromotion(vehicleId: string, data: any) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, dealer_id: true, price_aed: true } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const originalPrice = Number(vehicle.price_aed);
    const discountPct = data.discount_pct !== undefined && data.discount_pct !== null && data.discount_pct !== ''
      ? Number(data.discount_pct)
      : null;
    const explicitPromoPrice = data.promo_price !== undefined && data.promo_price !== null && data.promo_price !== ''
      ? Number(data.promo_price)
      : null;

    if (discountPct === null && explicitPromoPrice === null) {
      throw new BadRequestException('Either discount_pct or promo_price is required');
    }

    if (discountPct !== null && (Number.isNaN(discountPct) || discountPct <= 0 || discountPct >= 100)) {
      throw new BadRequestException('discount_pct must be between 0 and 100');
    }

    let promoPrice = explicitPromoPrice;
    if (promoPrice === null && discountPct !== null) {
      promoPrice = Math.round(originalPrice * (1 - (discountPct / 100)) * 100) / 100;
    }
    if (promoPrice === null || Number.isNaN(promoPrice) || promoPrice <= 0 || promoPrice >= originalPrice) {
      throw new BadRequestException('promo_price must be greater than 0 and lower than current vehicle price');
    }

    const startsAt = data.starts_at ? new Date(data.starts_at) : new Date();
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Invalid starts_at');

    let endsAt: Date | null = null;
    if (data.ends_at) {
      endsAt = new Date(data.ends_at);
      if (Number.isNaN(endsAt.getTime())) throw new BadRequestException('Invalid ends_at');
    } else if (data.duration_days !== undefined && data.duration_days !== null && data.duration_days !== '') {
      const days = Number(data.duration_days);
      if (Number.isNaN(days) || days <= 0 || days > 365) {
        throw new BadRequestException('duration_days must be between 1 and 365');
      }
      endsAt = new Date(startsAt.getTime() + days * 86400000);
    }

    if (endsAt && endsAt <= startsAt) throw new BadRequestException('ends_at must be after starts_at');

    await this.prisma.promotion.updateMany({
      where: { vehicle_id: vehicleId, active: true },
      data: { active: false, ends_at: new Date() },
    });

    const promo = await this.prisma.promotion.create({
      data: {
        vehicle_id: vehicleId,
        dealer_id: vehicle.dealer_id,
        original_price: originalPrice,
        promo_price: promoPrice,
        label: data.label || (discountPct ? `-${Math.round(discountPct)}%` : 'Limited offer'),
        starts_at: startsAt,
        ends_at: endsAt,
        active: true,
      },
    });

    return promo;
  }

  async removePromotion(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    const result = await this.prisma.promotion.updateMany({
      where: { vehicle_id: vehicleId, active: true },
      data: { active: false, ends_at: new Date() },
    });
    return { disabled: result.count };
  }
}
