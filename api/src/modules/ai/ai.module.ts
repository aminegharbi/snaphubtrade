import { Module, Controller, Post, Body, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { getAIClient, aiModel } from '../../shared/ai/ai-client';

@Injectable()
export class AiService {
  private client = getAIClient();
  private logger = new Logger('AiService');

  constructor(private prisma: PrismaService) {
    this.client = getAIClient();
  }

  async analyzeVehiclePhotos(base64Images: { data: string; mediaType: string }[], dealerId?: string): Promise<any> {
    if (!base64Images.length) throw new Error('No images provided');

    const content: any[] = base64Images.slice(0, 3).map(img => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.data },
    }));

    content.push({
      type: 'text',
      text: `You are an expert automotive AI for the UAE market (Dubai, Abu Dhabi, Sharjah).
Analyze these vehicle photo(s) and extract all visible information.

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{
  "make": "brand name e.g. Toyota",
  "model": "model name e.g. Land Cruiser",
  "year": 2024,
  "trim": "variant e.g. GR Sport or null",
  "body_type": "SUV|Sedan|Pickup|Coupe|Hatchback|Convertible|Van|Wagon",
  "fuel_type": "petrol|diesel|hybrid|electric|phev",
  "transmission": "automatic|manual|cvt|dct",
  "engine": "engine description e.g. 3.5L V6 Twin-Turbo 415hp or null",
  "color_exterior": "color name e.g. White Pearl",
  "color_interior": "guessed interior color or null",
  "doors": 4,
  "seats": 5,
  "country_origin": "Japan|Germany|USA|South Korea|China|UAE",
  "price_suggested_aed": 220000,
  "description": "1-2 sentence description for UAE market listing",
  "confidence": 0.95
}

Rules:
- price_suggested_aed must be realistic for UAE 2024/2025 market
- If you cannot determine a field from the image, use null
- Return ONLY the JSON, no text before or after`,
    });

    const response = await this.client.messages.create({
      model: aiModel('sonnet'),
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleaned);

    // Track AI usage for subscription limits
    if (dealerId) {
      try {
        const now = new Date();
        await (this.prisma as any).$executeRawUnsafe(
          `INSERT INTO subscription_usage (dealer_id, usage_key, period_year, period_month, value, updated_at)
           VALUES ($1, 'ai_scans_monthly', $2, $3, 1, NOW())
           ON CONFLICT (dealer_id, usage_key, period_year, period_month)
           DO UPDATE SET value = subscription_usage.value + 1, updated_at = NOW()`,
          dealerId, now.getFullYear(), now.getMonth() + 1
        );
      } catch { /* non-fatal */ }
    }

    return result;
  }

  async generateDescription(vehicleData: any): Promise<string> {
    const prompt = `Write a compelling 2-sentence vehicle listing description for the UAE market.
Vehicle: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}${vehicleData.trim ? ' ' + vehicleData.trim : ''}
Specs: ${vehicleData.fuel_type || ''} ${vehicleData.transmission || ''} ${vehicleData.engine || ''}
Color: ${vehicleData.color_exterior || ''}
Mileage: ${vehicleData.mileage_km === 0 ? 'Brand new' : vehicleData.mileage_km + ' km'}
Price: AED ${vehicleData.price_aed}

Rules: Be factual, mention export eligibility if SUV/Pickup, use UAE/GCC market language. Return ONLY the description text.`;

    const response = await this.client.messages.create({
      model: aiModel('sonnet'),
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
  }

  async suggestPrice(vehicleData: any): Promise<{ suggested_aed: number; min_aed: number; max_aed: number; reasoning: string }> {
    const prompt = `You are a UAE automotive market expert. Suggest a realistic market price for this vehicle.

Vehicle: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}${vehicleData.trim ? ' ' + vehicleData.trim : ''}
Mileage: ${vehicleData.mileage_km === 0 ? 'Brand new' : vehicleData.mileage_km + ' km'}
Fuel: ${vehicleData.fuel_type || 'petrol'}
Color: ${vehicleData.color_exterior || 'unknown'}

Return ONLY valid JSON:
{"suggested_aed": 220000, "min_aed": 200000, "max_aed": 240000, "reasoning": "brief 1-sentence explanation"}`;

    const response = await this.client.messages.create({
      model: aiModel('sonnet'),
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  }

  async generatePricingReport(portfolio: any[], benchmarks: any[], dealerId: string): Promise<string> {
    const context = portfolio.slice(0, 8).map((v: any) => {
      const bench = benchmarks.find((b: any) =>
        b.make?.toLowerCase() === v.make?.toLowerCase() &&
        b.model?.toLowerCase().includes((v.model || '').split(' ')[0].toLowerCase())
      );
      const mktLine = bench
        ? `, market avg AED ${Number(bench.avg_price_aed).toLocaleString()} (${bench.source}, ${bench.listing_count} listings, ${Number(bench.trend_pct) >= 0 ? '+' : ''}${Number(bench.trend_pct).toFixed(1)}%/mo)`
        : '';
      return `${v.year} ${v.make} ${v.model}: listed AED ${Number(v.current_price_aed || v.price_aed).toLocaleString()}${mktLine}, status: ${v.status || 'available'}, ${v.view_count || 0} views`;
    }).join('\n');

    const totalUnits  = portfolio.length;
    const totalValue  = portfolio.reduce((s: number, v: any) => s + Number(v.current_price_aed || v.price_aed || 0), 0);
    const overpriced  = portfolio.filter((v: any) => v.status === 'overpriced' || v.delta_pct > 6).length;
    const underpriced = portfolio.filter((v: any) => v.status === 'underpriced' || v.delta_pct < -4).length;
    const hasBenchmarks = benchmarks.length > 0;

    const prompt = `You are a senior automotive market analyst for Dubai Free Zone dealers. 
${hasBenchmarks ? `You have LIVE competitor data from Dubizzle/DubiCars (AI web search, refreshed by platform admin).` : `Market benchmark data is not yet available for this dealer — base your analysis on their portfolio data.`}

DEALER PORTFOLIO — ${totalUnits} vehicles, AED ${(totalValue / 1000000).toFixed(1)}M total value:
${context}

PORTFOLIO SIGNALS: ${overpriced} overpriced, ${underpriced} underpriced vs market${hasBenchmarks ? `, ${benchmarks.length} live market benchmarks available` : ''}.

Write a sharp dealer intelligence report. Structure:
**Executive Summary** — 2 sentences: portfolio health vs UAE market.
**Top Action This Week** — single most impactful pricing move with specific AED delta and expected revenue impact.
**Market Signals** — 3 bullet points from the live data: which models move fast, which sit, demand trends.
**Export Opportunity** — which vehicles have strongest Africa/Asia demand and target price.
**Revenue Forecast** — AED impact if all recommendations are applied.

Be direct. Use AED numbers. Max 380 words.`;

    const r = await this.client.messages.create({
      model: aiModel('sonnet'), max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    });
    return r.content[0]?.type === 'text' ? r.content[0].text : '';
  }
}

@Controller('ai')
export class AiController {
  constructor(private svc: AiService) {}

  @Post('analyze-vehicle')
  async analyzeVehicle(@Body() body: { images: { data: string; mediaType: string }[]; dealer_id?: string }) {
    if (!body.images?.length) return { error: 'No images provided' };
    try {
      return await this.svc.analyzeVehiclePhotos(body.images, body.dealer_id);
    } catch (e: any) {
      return { error: e.message || 'AI analysis failed', fallback: true };
    }
  }

  @Post('generate-description')
  async generateDescription(@Body() body: any) {
    try {
      const description = await this.svc.generateDescription(body);
      return { description };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  @Post('suggest-price')
  async suggestPrice(@Body() body: any) {
    try {
      return await this.svc.suggestPrice(body);
    } catch (e: any) {
      return { error: e.message };
    }
  }

  @Post('pricing-report')
  async pricingReport(@Body() body: { portfolio: any[]; benchmarks: any[]; dealer_id: string }) {
    try {
      const report = await this.svc.generatePricingReport(
        body.portfolio || [], body.benchmarks || [], body.dealer_id || ''
      );
      return { report };
    } catch (e: any) {
      return { error: e.message };
    }
  }
}

@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
