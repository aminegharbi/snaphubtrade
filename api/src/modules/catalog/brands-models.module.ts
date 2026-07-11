import { Module, Controller, Get, Param, Query, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Public } from '../../shared/auth/public.decorator';

let _catalogReady: boolean | null = null;

async function isCatalogReady(prisma: PrismaService): Promise<boolean> {
  if (_catalogReady) return true;
  try {
    const rows = await (prisma as any).$queryRawUnsafe(
      `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='brands') AS brands_ok,
              EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='models') AS models_ok`
    ) as any[];
    _catalogReady = rows[0]?.brands_ok === true && rows[0]?.models_ok === true;
    return _catalogReady ?? false;
  } catch { return false; }
}

async function raw(prisma: PrismaService, sql: string, ...params: any[]): Promise<any[]> {
  try {
    const rows = (await (prisma as any).$queryRawUnsafe(sql, ...params)) as any[];
    return rows.map(row => {
      const clean: any = {};
      for (const [k, v] of Object.entries(row)) {
        clean[k] = typeof v === 'bigint' ? Number(v) : v;
      }
      return clean;
    });
  } catch {
    return [];
  }
}

@Injectable()
export class BrandsModelsService {
  constructor(private prisma: PrismaService) {}

  async getBrands(filters: { region?: string; powertrain?: string; country?: string }) {
    if (!await isCatalogReady(this.prisma)) return [];
    const conditions: string[] = ['b.active = true'];
    const params: any[] = [];
    let p = 1;
    if (filters.region) { conditions.push(`b.region = $${p++}`); params.push(filters.region); }
    if (filters.country) { conditions.push(`b.country ILIKE $${p++}`); params.push(`%${filters.country}%`); }
    const where = conditions.join(' AND ');
    const ptFilter = filters.powertrain ? `AND m.powertrain = '${filters.powertrain.replace(/'/g, '')}'` : '';
    return raw(this.prisma, `
      SELECT b.id, b.name, b.slug, b.country, b.region, b.parent_group, b.founded_year,
        COUNT(m.id) AS model_count,
        COUNT(CASE WHEN m.powertrain IN ('BEV','FCEV') THEN 1 END) AS ev_models,
        COUNT(CASE WHEN m.powertrain = 'PHEV' THEN 1 END) AS phev_models,
        COUNT(CASE WHEN m.powertrain = 'REEV' THEN 1 END) AS reev_models,
        COUNT(CASE WHEN m.powertrain IN ('HEV','MHEV') THEN 1 END) AS hybrid_models,
        COUNT(CASE WHEN m.powertrain = 'ICE' THEN 1 END) AS ice_models,
        MIN(m.price_aed_min) AS entry_price_aed,
        MAX(m.price_aed_max) AS top_price_aed
      FROM brands b
      LEFT JOIN models m ON m.brand_id = b.id AND m.active = true ${ptFilter}
      WHERE ${where}
      GROUP BY b.id, b.name, b.slug, b.country, b.region, b.parent_group, b.founded_year
      ORDER BY b.region, b.name
    `, ...params);
  }

  async getBrandBySlug(slug: string) {
    const rows = await raw(this.prisma, `
      SELECT b.*,
        COUNT(m.id) AS model_count,
        COUNT(CASE WHEN m.powertrain IN ('BEV','FCEV') THEN 1 END) AS ev_models,
        COUNT(CASE WHEN m.powertrain = 'PHEV' THEN 1 END) AS phev_models,
        COUNT(CASE WHEN m.powertrain = 'REEV' THEN 1 END) AS reev_models
      FROM brands b
      LEFT JOIN models m ON m.brand_id = b.id AND m.active = true
      WHERE b.slug = $1 GROUP BY b.id
    `, slug);
    if (!rows.length) return null;
    const brand = rows[0];
    const models = await raw(this.prisma, `
      SELECT id, name, slug, body_type, segment, powertrain, fuel_type,
        engine_options, battery_kwh, range_km, year_from, year_to,
        price_aed_min, price_aed_max, export_popular, notes
      FROM models WHERE brand_id = $1 AND active = true ORDER BY segment, name
    `, brand.id);
    return { ...brand, models };
  }

  async getModels(f: {
    powertrain?: string; region?: string; body_type?: string; segment?: string;
    min_price?: number; max_price?: number; min_range?: number;
    export_popular?: boolean; search?: string; sort?: string;
    page?: number; limit?: number;
  }) {
    const conds: string[] = ['m.active = true', 'b.active = true'];
    const params: any[] = [];
    let p = 1;
    if (f.powertrain) { conds.push(`m.powertrain = $${p++}`); params.push(f.powertrain); }
    if (f.region) { conds.push(`b.region = $${p++}`); params.push(f.region); }
    if (f.body_type) { conds.push(`m.body_type ILIKE $${p++}`); params.push(`%${f.body_type}%`); }
    if (f.segment) { conds.push(`m.segment = $${p++}`); params.push(f.segment); }
    if (f.min_price) { conds.push(`m.price_aed_max >= $${p++}`); params.push(f.min_price); }
    if (f.max_price) { conds.push(`m.price_aed_min <= $${p++}`); params.push(f.max_price); }
    if (f.min_range) { conds.push(`m.range_km >= $${p++}`); params.push(f.min_range); }
    if (f.export_popular !== undefined) { conds.push(`m.export_popular = $${p++}`); params.push(f.export_popular); }
    if (f.search) { conds.push(`(m.name ILIKE $${p} OR b.name ILIKE $${p})`); params.push(`%${f.search}%`); p++; }
    const sorts: Record<string, string> = {
      name: 'b.name, m.name', price_asc: 'm.price_aed_min ASC',
      price_desc: 'm.price_aed_max DESC', range: 'm.range_km DESC NULLS LAST', newest: 'm.year_from DESC',
    };
    const orderBy = sorts[f.sort || 'name'] || 'b.name, m.name';
    const page = f.page || 1;
    const limit = Math.min(f.limit || 50, 200);
    const offset = (page - 1) * limit;
    const where = conds.join(' AND ');
    const [items, counts] = await Promise.all([
      raw(this.prisma, `
        SELECT m.id, m.name, m.slug, m.body_type, m.segment, m.powertrain, m.fuel_type,
          m.engine_options, m.battery_kwh, m.range_km, m.year_from, m.year_to,
          m.price_aed_min, m.price_aed_max, m.export_popular, m.notes,
          b.name AS brand_name, b.slug AS brand_slug, b.country, b.region
        FROM models m JOIN brands b ON b.id = m.brand_id
        WHERE ${where} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}
      `, ...params),
      raw(this.prisma, `
        SELECT COUNT(*) AS total FROM models m JOIN brands b ON b.id = m.brand_id WHERE ${where}
      `, ...params),
    ]);
    const total = Number(counts[0]?.total || 0);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getTechnologies() {
    if (!await isCatalogReady(this.prisma)) return [];
    const techs = await raw(this.prisma, `
      SELECT pt.*, COUNT(m.id) AS model_count,
        array_agg(DISTINCT b.name ORDER BY b.name) FILTER (WHERE b.name IS NOT NULL) AS example_brands,
        ROUND(AVG(m.range_km) FILTER (WHERE m.range_km IS NOT NULL)) AS avg_range_km,
        ROUND(AVG(m.battery_kwh) FILTER (WHERE m.battery_kwh IS NOT NULL), 1) AS avg_battery_kwh,
        MIN(m.price_aed_min) AS min_price_aed, MAX(m.price_aed_max) AS max_price_aed
      FROM powertrain_technologies pt
      LEFT JOIN models m ON m.powertrain = pt.code AND m.active = true
      LEFT JOIN brands b ON b.id = m.brand_id AND b.active = true
      GROUP BY pt.code, pt.name, pt.full_name, pt.description, pt.electric_range_type, pt.co2_category
      ORDER BY CASE pt.code WHEN 'ICE' THEN 1 WHEN 'MHEV' THEN 2 WHEN 'HEV' THEN 3
        WHEN 'PHEV' THEN 4 WHEN 'REEV' THEN 5 WHEN 'BEV' THEN 6 WHEN 'FCEV' THEN 7 END
    `);
    const comps = await raw(this.prisma, `SELECT * FROM powertrain_comparison ORDER BY powertrain_code, attribute`);
    return techs.map((t) => ({ ...t, attributes: comps.filter((c) => c.powertrain_code === t.code) }));
  }

  async getStats() {
    const [byRegion, byPowertrain, exportPop, mktStats] = await Promise.all([
      raw(this.prisma, `SELECT b.region, COUNT(DISTINCT b.id) AS brands, COUNT(m.id) AS models FROM brands b LEFT JOIN models m ON m.brand_id = b.id AND m.active = true WHERE b.active = true GROUP BY b.region ORDER BY models DESC`),
      raw(this.prisma, `SELECT m.powertrain, pt.name AS tech_name, COUNT(m.id) AS models, MIN(m.price_aed_min) AS min_price, MAX(m.price_aed_max) AS max_price FROM models m JOIN powertrain_technologies pt ON pt.code = m.powertrain WHERE m.active = true GROUP BY m.powertrain, pt.name ORDER BY models DESC`),
      raw(this.prisma, `SELECT b.name AS brand, b.country, m.name AS model, m.powertrain, m.price_aed_min, m.price_aed_max FROM models m JOIN brands b ON b.id = m.brand_id WHERE m.export_popular = true AND m.active = true ORDER BY b.region, b.name LIMIT 50`),
      raw(this.prisma, `SELECT stat_name, value, unit, year, source, context FROM market_stats ORDER BY id`),
    ]);
    return { by_region: byRegion, by_powertrain: byPowertrain, top_export_models: exportPop, market_stats: mktStats };
  }
}

@Public()
@Controller('catalog')
export class BrandsModelsController {
  constructor(private service: BrandsModelsService) {}

  @Get('brands')
  getBrands(@Query() q: any) {
    return this.service.getBrands({ region: q.region, country: q.country, powertrain: q.powertrain });
  }

  @Get('brands/:slug')
  getBrand(@Param('slug') slug: string) { return this.service.getBrandBySlug(slug); }

  @Get('models/ev')
  getEVModels() {
    return raw(this.service['prisma'], `
      SELECT b.name AS brand, b.country, b.region, m.name AS model, m.body_type,
        m.powertrain, m.battery_kwh, m.range_km, m.engine_options,
        m.price_aed_min, m.price_aed_max, m.year_from, m.export_popular, m.notes
      FROM models m JOIN brands b ON b.id = m.brand_id
      WHERE m.powertrain IN ('BEV','FCEV') AND m.active = true AND b.active = true
      ORDER BY m.range_km DESC NULLS LAST, m.price_aed_min ASC
    `);
  }

  @Get('models/phev')
  getPHEVModels(@Query('include_reev') ir: string) {
    const types = ir !== 'false' ? `('PHEV','REEV')` : `('PHEV')`;
    return raw(this.service['prisma'], `
      SELECT b.name AS brand, b.country, b.region, m.name AS model, m.body_type,
        m.powertrain, m.battery_kwh, m.range_km AS ev_range_km,
        m.engine_options, m.price_aed_min, m.price_aed_max, m.notes
      FROM models m JOIN brands b ON b.id = m.brand_id
      WHERE m.powertrain IN ${types} AND m.active = true AND b.active = true
      ORDER BY m.range_km DESC NULLS LAST
    `);
  }

  @Get('models/compare')
  compareModels(@Query('ids') ids: string) {
    const idList = (ids || '').split(',').map(Number).filter(Boolean);
    if (!idList.length) return Promise.resolve([]);
    const ph = idList.map((_, i) => `$${i + 1}`).join(',');
    return raw(this.service['prisma'], `
      SELECT m.*, b.name AS brand_name, b.country, b.region,
        pt.name AS tech_name, pt.full_name, pt.co2_category
      FROM models m
      JOIN brands b ON b.id = m.brand_id
      JOIN powertrain_technologies pt ON pt.code = m.powertrain
      WHERE m.id = ANY(ARRAY[${ph}]::int[]) AND m.active = true
    `, ...idList);
  }

  @Get('models')
  getModels(@Query() q: any) {
    return this.service.getModels({
      powertrain: q.powertrain, region: q.region, body_type: q.body_type, segment: q.segment,
      min_price: q.min_price ? +q.min_price : undefined,
      max_price: q.max_price ? +q.max_price : undefined,
      min_range: q.min_range ? +q.min_range : undefined,
      export_popular: q.export_popular === 'true' ? true : q.export_popular === 'false' ? false : undefined,
      search: q.search, sort: q.sort,
      page: q.page ? +q.page : 1, limit: q.limit ? +q.limit : 50,
    });
  }

  @Get('technologies')
  getTechnologies() { return this.service.getTechnologies(); }

  @Get('stats')
  getStats() { return this.service.getStats(); }
}

@Module({
  controllers: [BrandsModelsController],
  providers: [BrandsModelsService],
  exports: [BrandsModelsService],
})
export class BrandsModelsModule {}
