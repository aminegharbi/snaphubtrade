import {
  Module, Controller, Get, Post, Patch, Body, Param, Query,
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  private genQuoteNumber(): string {
    const y = new Date().getFullYear();
    const r = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `QT-${y}-${r}`;
  }

  private genInvoiceNumber(): string {
    const y = new Date().getFullYear();
    const r = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `INV-${y}-${r}`;
  }

  private calcTotals(items: any[], discountPct = 0, taxPct = 5) {
    const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity || 1), 0);
    const discount = Math.round(subtotal * discountPct / 100 * 100) / 100;
    const taxBase  = subtotal - discount;
    const tax      = Math.round(taxBase * taxPct / 100 * 100) / 100;
    const total    = Math.round((taxBase + tax) * 100) / 100;
    return { subtotal, discount, tax, total };
  }

  // ── Quotes ─────────────────────────────────────────────────────────────────

  async createQuote(data: any) {
    if (!data.dealer_id) throw new BadRequestException('dealer_id is required');
    if (!data.buyer_name) throw new BadRequestException('buyer_name is required');
    const items: any[] = data.items || [];
    if (!items.length) throw new BadRequestException('At least one line item is required');

    // Default currency/VAT to the dealer's actual country rather than
    // hardcoded UAE values (AED / 5%) — still overridable via the request
    // body for one-off cases (e.g. an export deal quoted in USD).
    const dealer = await this.prisma.dealer.findUnique({
      where: { id: data.dealer_id },
      include: { country: true },
    });
    const defaultCurrency = dealer?.country?.currency_code || 'AED';
    const defaultTaxPct = dealer?.country ? Number(dealer.country.vat_rate) * 100 : 5;

    const { subtotal, discount, tax, total } = this.calcTotals(items, data.discount_pct || 0, data.tax_pct ?? defaultTaxPct);

    return this.prisma.quote.create({
      data: {
        dealer_id:     data.dealer_id,
        broker_id:     data.broker_id || null,
        vehicle_id:    data.vehicle_id || null,
        buyer_name:    data.buyer_name,
        buyer_email:   data.buyer_email || null,
        buyer_phone:   data.buyer_phone || null,
        buyer_country: data.buyer_country || null,
        quote_number:  this.genQuoteNumber(),
        currency:      data.currency || defaultCurrency,
        subtotal_aed:  subtotal,
        discount_pct:  data.discount_pct || 0,
        discount_aed:  discount,
        tax_pct:       data.tax_pct ?? defaultTaxPct,
        tax_aed:       tax,
        total_aed:     total,
        valid_until:   data.valid_until ? new Date(data.valid_until) : new Date(Date.now() + 30 * 86400000),
        notes:         data.notes || null,
        terms:         data.terms || null,
        items: {
          create: items.map((it: any) => ({
            description: it.description,
            quantity:    Number(it.quantity) || 1,
            unit_price:  Number(it.unit_price),
            total:       Number(it.unit_price) * (Number(it.quantity) || 1),
          })),
        },
      },
      include: {
        items: true,
        vehicle: { select: { id: true, make: true, model: true, year: true } },
      },
    });
  }

  async listQuotes(dealerId: string, q: any = {}) {
    if (!dealerId) return [];
    const where: any = { dealer_id: dealerId };
    if (q.status) where.status = q.status;
    if (q.broker_id) where.broker_id = q.broker_id;

    return this.prisma.quote.findMany({
      where,
      include: {
        items: true,
        vehicle: { select: { id: true, make: true, model: true, year: true } },
        invoice: { select: { id: true, invoice_number: true, status: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async getQuote(id: string) {
    const q = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        items: true,
        vehicle: { select: { id: true, make: true, model: true, year: true, price_aed: true } },
        invoice: { select: { id: true, invoice_number: true, status: true, total_aed: true, paid_at: true } },
        dealer:  { select: { id: true, company_name: true, email: true, phone: true, address: true } },
      },
    });
    if (!q) throw new NotFoundException('Quote not found');
    return q;
  }

  async updateQuote(id: string, data: any) {
    const q = await this.prisma.quote.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Quote not found');
    if (['converted', 'paid'].includes(q.status)) throw new BadRequestException('Cannot edit a converted quote');

    const upd: any = { updated_at: new Date() };
    ['buyer_name','buyer_email','buyer_phone','buyer_country','notes','terms','broker_id','vehicle_id'].forEach(k => {
      if (data[k] !== undefined) upd[k] = data[k];
    });
    if (data.valid_until) upd.valid_until = new Date(data.valid_until);

    if (data.items?.length) {
      const { subtotal, discount, tax, total } = this.calcTotals(data.items, data.discount_pct ?? q.discount_pct, data.tax_pct ?? q.tax_pct);
      Object.assign(upd, {
        subtotal_aed: subtotal, discount_pct: data.discount_pct ?? q.discount_pct,
        discount_aed: discount, tax_pct: data.tax_pct ?? q.tax_pct, tax_aed: tax, total_aed: total,
      });
      await this.prisma.quoteLineItem.deleteMany({ where: { quote_id: id } });
      await this.prisma.quoteLineItem.createMany({
        data: data.items.map((it: any) => ({
          quote_id: id, description: it.description,
          quantity: Number(it.quantity) || 1, unit_price: Number(it.unit_price),
          total: Number(it.unit_price) * (Number(it.quantity) || 1),
        })),
      });
    }

    return this.prisma.quote.update({ where: { id }, data: upd, include: { items: true } });
  }

  async sendQuote(id: string) {
    const q = await this.prisma.quote.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Quote not found');
    if (q.status !== 'draft') throw new BadRequestException('Only draft quotes can be sent');
    return this.prisma.quote.update({ where: { id }, data: { status: 'sent', sent_at: new Date() } });
  }

  async convertQuote(id: string, extra: any = {}) {
    const q = await this.prisma.quote.findUnique({ where: { id }, include: { items: true } });
    if (!q) throw new NotFoundException('Quote not found');
    if (q.status === 'converted') throw new BadRequestException('Quote already converted');
    if (!['draft', 'sent', 'accepted'].includes(q.status))
      throw new BadRequestException(`Quote in status '${q.status}' cannot be converted`);

    const invoice = await this.prisma.invoice.create({
      data: {
        dealer_id:     q.dealer_id,
        broker_id:     q.broker_id,
        vehicle_id:    q.vehicle_id,
        quote_id:      id,
        buyer_name:    q.buyer_name,
        buyer_email:   q.buyer_email,
        buyer_phone:   q.buyer_phone,
        buyer_country: q.buyer_country,
        invoice_number: this.genInvoiceNumber(),
        currency:      q.currency,
        subtotal_aed:  q.subtotal_aed,
        discount_aed:  q.discount_aed,
        tax_aed:       q.tax_aed,
        total_aed:     q.total_aed,
        due_date:      extra.due_date ? new Date(extra.due_date) : new Date(Date.now() + 30 * 86400000),
        notes:         extra.notes || q.notes,
        terms:         extra.terms || q.terms,
        status:        'draft',
        items: {
          create: q.items.map(it => ({
            description: it.description,
            quantity:    it.quantity,
            unit_price:  it.unit_price,
            total:       it.total,
          })),
        },
      },
      include: { items: true },
    });

    await this.prisma.quote.update({ where: { id }, data: { status: 'converted', converted_at: new Date() } });
    return invoice;
  }

  async rejectQuote(id: string) {
    const q = await this.prisma.quote.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Quote not found');
    if (!['draft', 'sent'].includes(q.status)) throw new BadRequestException(`Quote in status '${q.status}' cannot be rejected`);
    return this.prisma.quote.update({ where: { id }, data: { status: 'rejected', rejected_at: new Date() } });
  }

  // ── Invoices ───────────────────────────────────────────────────────────────

  async createInvoice(data: any) {
    if (!data.dealer_id) throw new BadRequestException('dealer_id is required');
    if (!data.buyer_name) throw new BadRequestException('buyer_name is required');

    const dealer = await this.prisma.dealer.findUnique({
      where: { id: data.dealer_id },
      include: { country: true },
    });
    const defaultCurrency = dealer?.country?.currency_code || 'AED';
    const defaultTaxPct = dealer?.country ? Number(dealer.country.vat_rate) * 100 : 5;

    const items: any[] = data.items || [];
    const { subtotal, discount, tax, total } = this.calcTotals(items, data.discount_pct || 0, data.tax_pct ?? defaultTaxPct);

    return this.prisma.invoice.create({
      data: {
        dealer_id:     data.dealer_id,
        broker_id:     data.broker_id || null,
        vehicle_id:    data.vehicle_id || null,
        buyer_name:    data.buyer_name,
        buyer_email:   data.buyer_email || null,
        buyer_phone:   data.buyer_phone || null,
        buyer_country: data.buyer_country || null,
        invoice_number: this.genInvoiceNumber(),
        currency:      data.currency || defaultCurrency,
        subtotal_aed:  subtotal,
        discount_aed:  discount,
        tax_aed:       tax,
        total_aed:     total,
        due_date:      data.due_date ? new Date(data.due_date) : new Date(Date.now() + 30 * 86400000),
        notes:         data.notes || null,
        terms:         data.terms || null,
        status:        'draft',
        items: items.length ? {
          create: items.map((it: any) => ({
            description: it.description,
            quantity:    Number(it.quantity) || 1,
            unit_price:  Number(it.unit_price),
            total:       Number(it.unit_price) * (Number(it.quantity) || 1),
          })),
        } : undefined,
      },
      include: {
        items: true,
        vehicle: { select: { id: true, make: true, model: true, year: true } },
      },
    });
  }

  async listInvoices(dealerId: string, q: any = {}) {
    if (!dealerId) return [];
    // Auto-mark overdue
    await this.prisma.invoice.updateMany({
      where: { dealer_id: dealerId, status: 'sent', due_date: { lt: new Date() } },
      data: { status: 'overdue' },
    });
    const where: any = { dealer_id: dealerId };
    if (q.status) where.status = q.status;
    if (q.broker_id) where.broker_id = q.broker_id;

    return this.prisma.invoice.findMany({
      where,
      include: {
        items: true,
        vehicle: { select: { id: true, make: true, model: true, year: true } },
        quote: { select: { id: true, quote_number: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async getInvoice(id: string) {
    const inv = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        vehicle: { select: { id: true, make: true, model: true, year: true, price_aed: true } },
        quote:   { select: { id: true, quote_number: true } },
        dealer:  { select: { id: true, company_name: true, email: true, phone: true, address: true } },
      },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async sendInvoice(id: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== 'draft') throw new BadRequestException('Only draft invoices can be sent');
    return this.prisma.invoice.update({ where: { id }, data: { status: 'sent', sent_at: new Date() } });
  }

  async markPaid(id: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === 'paid') throw new BadRequestException('Invoice already paid');
    if (inv.status === 'cancelled') throw new BadRequestException('Cancelled invoice cannot be paid');

    const updated = await this.prisma.invoice.update({ where: { id }, data: { status: 'paid', paid_at: new Date() } });

    // If invoice is linked to a vehicle, record the unit sale.
    // Only decrement stock if the vehicle still has stock (avoids double-decrement
    // when auto-invoice was already created by a sale that already decremented stock).
    // But ALWAYS increment sold_units to ensure KPIs track the billing-path sale.
    if (inv.vehicle_id) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: inv.vehicle_id } }).catch(() => null);
      if (vehicle) {
        const hasStock = Number(vehicle.stock_quantity) > 0;
        // Check if this invoice was auto-generated by a sale (notes contain 'Auto-generated')
        const isAutoInvoice = inv.notes && inv.notes.includes('Auto-generated');
        // Auto-invoices: sale already decremented stock + incremented sold_units → only mark paid
        // Manual invoices: need to decrement stock + increment sold_units
        if (!isAutoInvoice) {
          await this.prisma.vehicle.update({
            where: { id: inv.vehicle_id },
            data: {
              sold_units:     { increment: 1 },
              stock_quantity: hasStock ? { decrement: 1 } : undefined,
              status: hasStock && Number(vehicle.stock_quantity) <= 1 ? 'sold' : vehicle.status,
              updated_at: new Date(),
            },
          }).catch(() => {});
        }
      }
    }

    return updated;
  }

  async cancelInvoice(id: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === 'paid') throw new BadRequestException('Paid invoice cannot be cancelled');
    return this.prisma.invoice.update({ where: { id }, data: { status: 'cancelled' } });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getDealerStats(dealerId: string) {
    if (!dealerId) return null;

    const [
      quotesTotal, quotesSent, quotesConverted, quotesRejected,
      invoicesTotal, invoicesPaid, invoicesOutstanding, invoicesOverdue,
      revenueAgg, outstandingAgg,
      thisMonthQuotes, thisMonthInvoices,
    ] = await Promise.all([
      this.prisma.quote.count({ where: { dealer_id: dealerId } }),
      this.prisma.quote.count({ where: { dealer_id: dealerId, status: 'sent' } }),
      this.prisma.quote.count({ where: { dealer_id: dealerId, status: 'converted' } }),
      this.prisma.quote.count({ where: { dealer_id: dealerId, status: 'rejected' } }),
      this.prisma.invoice.count({ where: { dealer_id: dealerId } }),
      this.prisma.invoice.count({ where: { dealer_id: dealerId, status: 'paid' } }),
      this.prisma.invoice.count({ where: { dealer_id: dealerId, status: { in: ['sent', 'overdue'] } } }),
      this.prisma.invoice.count({ where: { dealer_id: dealerId, status: 'overdue' } }),
      this.prisma.invoice.aggregate({ where: { dealer_id: dealerId, status: 'paid' }, _sum: { total_aed: true } }),
      this.prisma.invoice.aggregate({ where: { dealer_id: dealerId, status: { in: ['sent', 'overdue'] } }, _sum: { total_aed: true } }),
      this.prisma.quote.count({ where: { dealer_id: dealerId, created_at: { gte: new Date(new Date().setDate(1)) } } }),
      this.prisma.invoice.count({ where: { dealer_id: dealerId, created_at: { gte: new Date(new Date().setDate(1)) } } }),
    ]);

    const actionable = quotesSent + quotesConverted + quotesRejected;
    const conversionRate = actionable > 0 ? Math.round((quotesConverted / actionable) * 100) : 0;

    return {
      quotes: {
        total: quotesTotal, sent: quotesSent, converted: quotesConverted, rejected: quotesRejected,
        this_month: thisMonthQuotes, conversion_rate_pct: conversionRate,
      },
      invoices: {
        total: invoicesTotal, paid: invoicesPaid, outstanding: invoicesOutstanding,
        overdue: invoicesOverdue, this_month: thisMonthInvoices,
      },
      revenue_collected_aed: Number(revenueAgg._sum.total_aed || 0),
      revenue_outstanding_aed: Number(outstandingAgg._sum.total_aed || 0),
    };
  }

  async getBrokerStats(brokerId: string) {
    const [
      quotesTotal, quotesConverted,
      invoicesTotal, invoicesPaid,
      revenueAgg, outstandingAgg,
      thisMonth,
    ] = await Promise.all([
      this.prisma.quote.count({ where: { broker_id: brokerId } }),
      this.prisma.quote.count({ where: { broker_id: brokerId, status: 'converted' } }),
      this.prisma.invoice.count({ where: { broker_id: brokerId } }),
      this.prisma.invoice.count({ where: { broker_id: brokerId, status: 'paid' } }),
      this.prisma.invoice.aggregate({ where: { broker_id: brokerId, status: 'paid' }, _sum: { total_aed: true } }),
      this.prisma.invoice.aggregate({ where: { broker_id: brokerId, status: { in: ['sent', 'overdue'] } }, _sum: { total_aed: true } }),
      this.prisma.quote.count({ where: { broker_id: brokerId, created_at: { gte: new Date(new Date().setDate(1)) } } }),
    ]);

    const conversionRate = quotesTotal > 0 ? Math.round((quotesConverted / quotesTotal) * 100) : 0;

    return {
      quotes_originated: quotesTotal,
      quotes_converted: quotesConverted,
      conversion_rate_pct: conversionRate,
      invoices_total: invoicesTotal,
      invoices_paid: invoicesPaid,
      revenue_generated_aed: Number(revenueAgg._sum.total_aed || 0),
      revenue_outstanding_aed: Number(outstandingAgg._sum.total_aed || 0),
      quotes_this_month: thisMonth,
    };
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────
// Dealers/brokers can view their own billing; admins see everything.
// NOTE: endpoints below take dealer_id/brokerId as query/path params without
// verifying it matches the authenticated user — see SECURITY_TODO.md (IDOR).
@Roles('admin', 'dealer', 'broker')
@Controller('billing')
export class BillingController {
  constructor(private svc: BillingService) {}

  @Get('stats')
  dealerStats(@Query('dealer_id') dealerId: string) { return this.svc.getDealerStats(dealerId); }

  @Get('stats/broker/:brokerId')
  brokerStats(@Param('brokerId') id: string) { return this.svc.getBrokerStats(id); }

  @Post('quotes')
  createQuote(@Body() body: any) { return this.svc.createQuote(body); }

  @Get('quotes')
  listQuotes(@Query('dealer_id') dealerId: string, @Query() q: any) { return this.svc.listQuotes(dealerId, q); }

  @Get('quotes/:id')
  getQuote(@Param('id') id: string) { return this.svc.getQuote(id); }

  @Patch('quotes/:id')
  updateQuote(@Param('id') id: string, @Body() body: any) { return this.svc.updateQuote(id, body); }

  @Patch('quotes/:id/send')
  sendQuote(@Param('id') id: string) { return this.svc.sendQuote(id); }

  @Patch('quotes/:id/convert')
  convertQuote(@Param('id') id: string, @Body() body: any) { return this.svc.convertQuote(id, body); }

  @Patch('quotes/:id/reject')
  rejectQuote(@Param('id') id: string) { return this.svc.rejectQuote(id); }

  @Post('invoices')
  createInvoice(@Body() body: any) { return this.svc.createInvoice(body); }

  @Get('invoices')
  listInvoices(@Query('dealer_id') dealerId: string, @Query() q: any) { return this.svc.listInvoices(dealerId, q); }

  @Get('invoices/:id')
  getInvoice(@Param('id') id: string) { return this.svc.getInvoice(id); }

  @Patch('invoices/:id/send')
  sendInvoice(@Param('id') id: string) { return this.svc.sendInvoice(id); }

  @Patch('invoices/:id/pay')
  markPaid(@Param('id') id: string) { return this.svc.markPaid(id); }

  @Patch('invoices/:id/cancel')
  cancelInvoice(@Param('id') id: string) { return this.svc.cancelInvoice(id); }
}

// ─── Module ───────────────────────────────────────────────────────────────────
@Module({
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
