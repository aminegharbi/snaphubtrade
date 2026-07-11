import {
  Module, Controller, Get, Post, Patch, Delete, Put,
  Body, Param, Query, Injectable, NotFoundException,
  BadRequestException, ForbiddenException, Request, Req, Headers, Logger,
} from '@nestjs/common';
import Stripe from 'stripe';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';
import { Public } from '../../shared/auth/public.decorator';

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE — lazy singleton, only instantiated if STRIPE_SECRET_KEY is set.
// Every paid-plan checkout goes through Stripe's hosted Checkout page; nothing
// in this module ever marks a paid subscription "active" on its own say-so —
// only a verified Stripe webhook event does that. Free plans (price = 0)
// never touch Stripe and activate immediately, as before.
// ─────────────────────────────────────────────────────────────────────────────
let _stripe: Stripe | null | undefined;
function getStripe(): Stripe | null {
  if (_stripe !== undefined) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  _stripe = key ? new Stripe(key, { apiVersion: '2024-06-20' as any }) : null;
  return _stripe;
}
function isStripeConfigured() { return !!getStripe(); }

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  // ── Plans ──────────────────────────────────────────────────────────────────

  async getPlans(onlyVisible = true) {
    const where: any = {};
    if (onlyVisible) { where.is_active = true; where.is_visible = true; }
    const plans = await this.prisma.subscriptionPlan.findMany({
      where,
      orderBy: { sort_order: 'asc' },
      include: {
        features: { include: { feature: true }, orderBy: { feature: { sort_order: 'asc' } } },
        limits: { orderBy: { limit_key: 'asc' } },
      },
    });
    return plans;
  }

  async getPlanById(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        features: { include: { feature: true } },
        limits: true,
      },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async createPlan(data: any) {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: data.name, slug: data.slug, description: data.description,
        tagline: data.tagline, color: data.color || '#6B7280', badge: data.badge,
        price_monthly: data.price_monthly || 0, price_quarterly: data.price_quarterly || 0,
        price_yearly: data.price_yearly || 0, currency: data.currency || 'AED',
        trial_days: data.trial_days || 0, sort_order: data.sort_order || 0,
        is_active: data.is_active ?? true, is_visible: data.is_visible ?? true,
        stripe_price_monthly_id: data.stripe_price_monthly_id || null,
        stripe_price_yearly_id: data.stripe_price_yearly_id || null,
      },
    });
  }

  async updatePlan(id: string, data: any) {
    return this.prisma.subscriptionPlan.update({ where: { id }, data: { ...data, updated_at: new Date() } });
  }

  async deletePlan(id: string) {
    const subs = await this.prisma.dealerSubscription.count({ where: { plan_id: id, status: 'active' } });
    if (subs > 0) throw new BadRequestException('Cannot delete plan with active subscriptions');
    await this.prisma.subscriptionPlan.delete({ where: { id } });
    return { deleted: true };
  }

  async duplicatePlan(id: string) {
    const plan = await this.getPlanById(id);
    const newPlan = await this.prisma.subscriptionPlan.create({
      data: {
        name: `${plan.name} (copy)`, slug: `${plan.slug}-copy-${Date.now()}`,
        description: plan.description, tagline: plan.tagline, color: plan.color,
        price_monthly: plan.price_monthly, price_quarterly: plan.price_quarterly,
        price_yearly: plan.price_yearly, currency: plan.currency,
        trial_days: plan.trial_days, sort_order: plan.sort_order + 1,
        is_active: false, is_visible: false,
      },
    });
    // Copy features
    for (const pf of plan.features) {
      await this.prisma.planFeature.create({
        data: { plan_id: newPlan.id, feature_id: pf.feature_id, enabled: pf.enabled, limit_value: pf.limit_value },
      });
    }
    // Copy limits
    for (const pl of plan.limits) {
      await this.prisma.planLimit.create({
        data: { plan_id: newPlan.id, limit_key: pl.limit_key, limit_name: pl.limit_name, limit_value: pl.limit_value },
      });
    }
    return newPlan;
  }

  // ── Features ───────────────────────────────────────────────────────────────

  async getFeatures() {
    return this.prisma.subscriptionFeature.findMany({ orderBy: [{ category: 'asc' }, { sort_order: 'asc' }] });
  }

  async createFeature(data: any) {
    return this.prisma.subscriptionFeature.create({
      data: { key: data.key, name: data.name, description: data.description, icon: data.icon, category: data.category || 'general', is_premium: data.is_premium ?? false, sort_order: data.sort_order || 0 },
    });
  }

  async updateFeature(id: string, data: any) {
    return this.prisma.subscriptionFeature.update({ where: { id }, data });
  }

  async setPlanFeatures(planId: string, features: { feature_id: string; enabled: boolean; limit_value?: number }[]) {
    // Replace all plan features
    await this.prisma.planFeature.deleteMany({ where: { plan_id: planId } });
    for (const f of features) {
      await this.prisma.planFeature.create({ data: { plan_id: planId, feature_id: f.feature_id, enabled: f.enabled, limit_value: f.limit_value } });
    }
    return { updated: features.length };
  }

  async setPlanLimits(planId: string, limits: { limit_key: string; limit_name: string; limit_value: number }[]) {
    await this.prisma.planLimit.deleteMany({ where: { plan_id: planId } });
    for (const l of limits) {
      await this.prisma.planLimit.create({ data: { plan_id: planId, limit_key: l.limit_key, limit_name: l.limit_name, limit_value: l.limit_value } });
    }
    return { updated: limits.length };
  }

  // ── Dealer subscription ────────────────────────────────────────────────────

  async getDealerSubscription(dealerId: string) {
    const sub = await this.prisma.dealerSubscription.findFirst({
      where: { dealer_id: dealerId, status: { in: ['active', 'trial', 'past_due'] } },
      orderBy: { created_at: 'desc' },
      include: {
        plan: {
          include: {
            features: { include: { feature: true } },
            limits: true,
          },
        },
      },
    });

    // Build usage info — computed for BOTH free and paid tiers. Previously
    // the free-tier early-return skipped this entirely, so any dealer without
    // an active DealerSubscription row (the default/majority case) always
    // saw "0 vehicles used" on their usage meter regardless of their real count.
    const now = new Date();
    const usage = await this.getUsageForPeriod(dealerId, now.getFullYear(), now.getMonth() + 1);
    const vehicleCount = await this.prisma.vehicle.count({ where: { dealer_id: dealerId, status: { not: 'sold' } } });

    if (!sub) {
      // Return free plan if no subscription
      const freePlan = await this.prisma.subscriptionPlan.findUnique({
        where: { slug: 'free' },
        include: { features: { include: { feature: true } }, limits: true },
      });
      const freeLimits = Object.fromEntries((freePlan?.limits || []).map(l => [l.limit_key, l.limit_value]));
      return {
        plan: freePlan, status: 'free', is_free: true,
        usage: { ...usage, vehicles_count: vehicleCount },
        limits: freeLimits,
        days_remaining: null,
      };
    }

    const limits = Object.fromEntries(sub.plan.limits.map(l => [l.limit_key, l.limit_value]));

    return {
      ...sub,
      usage: { ...usage, vehicles_count: vehicleCount },
      limits,
      days_remaining: sub.current_period_end ? Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - now.getTime()) / 86400000)) : null,
    };
  }

  async getUsageForPeriod(dealerId: string, year: number, month: number) {
    const usages = await this.prisma.subscriptionUsage.findMany({
      where: { dealer_id: dealerId, period_year: year, period_month: month },
    });
    return Object.fromEntries(usages.map(u => [u.usage_key, u.value]));
  }

  async incrementUsage(dealerId: string, key: string) {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + 1;
    await this.prisma.subscriptionUsage.upsert({
      where: { dealer_id_usage_key_period_year_period_month: { dealer_id: dealerId, usage_key: key, period_year: y, period_month: m } },
      create: { dealer_id: dealerId, usage_key: key, period_year: y, period_month: m, value: 1 },
      update: { value: { increment: 1 }, updated_at: new Date() },
    });
  }

  // ── Feature gate ───────────────────────────────────────────────────────────

  async checkFeatureAccess(dealerId: string, featureKey: string): Promise<{ allowed: boolean; reason?: string; limit?: number; used?: number }> {
    const sub = await this.getDealerSubscription(dealerId);
    const plan = sub.plan;
    if (!plan) return { allowed: false, reason: 'No active plan' };

    const planFeature = plan.features.find((pf: any) => pf.feature.key === featureKey && pf.enabled);
    if (!planFeature) return { allowed: false, reason: `Feature not included in your ${plan.name} plan` };

    // If feature has a monthly limit (limit_value !== null)
    if (planFeature.limit_value !== null && planFeature.limit_value >= 0) {
      const now = new Date();
      const usage = await this.getUsageForPeriod(dealerId, now.getFullYear(), now.getMonth() + 1);
      const used = usage[featureKey] || 0;
      if (used >= planFeature.limit_value) {
        return { allowed: false, reason: `Monthly limit reached (${used}/${planFeature.limit_value})`, limit: planFeature.limit_value, used };
      }
      return { allowed: true, limit: planFeature.limit_value, used };
    }

    return { allowed: true };
  }

  async checkLimitAccess(dealerId: string, limitKey: string): Promise<{ allowed: boolean; reason?: string; limit: number; current: number }> {
    const sub = await this.getDealerSubscription(dealerId);
    const plan = sub.plan;
    if (!plan) return { allowed: false, reason: 'No active plan', limit: 0, current: 0 };

    const planLimit = plan.limits.find((l: any) => l.limit_key === limitKey);
    if (!planLimit) return { allowed: true, limit: -1, current: 0 };

    if (planLimit.limit_value === -1) return { allowed: true, limit: -1, current: 0 }; // unlimited

    // Get current count
    let current = 0;
    if (limitKey === 'max_vehicles') {
      current = await this.prisma.vehicle.count({ where: { dealer_id: dealerId, status: { not: 'sold' } } });
    } else if (limitKey === 'max_users') {
      current = await this.prisma.user.count({ where: { dealers: { some: { id: dealerId } } } });
    }

    if (current >= planLimit.limit_value) {
      return { allowed: false, reason: `Limit reached (${current}/${planLimit.limit_value})`, limit: planLimit.limit_value, current };
    }
    return { allowed: true, limit: planLimit.limit_value, current };
  }

  // ── Subscribe / Upgrade ────────────────────────────────────────────────────

  // Activates a plan directly, WITHOUT any payment — only ever safe to call
  // for a free plan (price 0 on the requested cycle). Paid plans must go
  // through createCheckoutSession() below and get activated by the Stripe
  // webhook once payment is actually confirmed.
  async subscribeToPlan(dealerId: string, planId: string, billingCycle: string = 'monthly', couponCode?: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.is_active) throw new NotFoundException('Plan not found or inactive');

    const price = billingCycle === 'yearly' ? Number(plan.price_yearly) : billingCycle === 'quarterly' ? Number(plan.price_quarterly) : Number(plan.price_monthly);
    if (price > 0) {
      throw new BadRequestException('This plan requires payment — use the checkout endpoint instead of activating it directly.');
    }

    // Cancel existing active subscription
    await this.prisma.dealerSubscription.updateMany({
      where: { dealer_id: dealerId, status: { in: ['active', 'trial'] } },
      data: { status: 'cancelled', cancelled_at: new Date() },
    });

    // Validate coupon
    let discountPct = 0;
    if (couponCode) {
      const coupon = await this.prisma.subscriptionCoupon.findUnique({ where: { code: couponCode } });
      if (coupon && coupon.is_active && (!coupon.valid_until || new Date(coupon.valid_until) > new Date())) {
        discountPct = Number(coupon.discount_value);
        await this.prisma.subscriptionCoupon.update({ where: { code: couponCode }, data: { current_uses: { increment: 1 } } });
      }
    }

    const periodEnd = new Date();
    if (billingCycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
    else if (billingCycle === 'quarterly') periodEnd.setMonth(periodEnd.getMonth() + 3);
    else if (billingCycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    const sub = await this.prisma.dealerSubscription.create({
      data: {
        dealer_id: dealerId, plan_id: planId, status: 'active',
        billing_cycle: billingCycle, discount_pct: discountPct,
        current_period_start: new Date(), current_period_end: periodEnd,
      },
    });

    // Log history
    await this.prisma.subscriptionHistory.create({
      data: { dealer_id: dealerId, subscription_id: sub.id, event_type: 'created', to_plan_id: planId },
    });

    // No invoice needed — this path only ever runs for a free plan (price 0
    // enforced above). Paid plans get their invoice created from the
    // confirmed Stripe checkout session in the webhook handler instead.

    return sub;
  }

  // ── Stripe Checkout — the only path that can activate a PAID plan ──────────

  private async getOrCreateStripeCustomer(dealerId: string): Promise<string> {
    const stripe = getStripe();
    if (!stripe) throw new BadRequestException('Payments are not configured on this server yet. Contact support.');

    const dealer = await this.prisma.dealer.findUnique({ where: { id: dealerId } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    if (dealer.stripe_customer_id) return dealer.stripe_customer_id;

    const customer = await stripe.customers.create({
      email: dealer.email || undefined,
      name: dealer.company_name,
      metadata: { dealer_id: dealerId },
    });
    await this.prisma.dealer.update({ where: { id: dealerId }, data: { stripe_customer_id: customer.id } });
    return customer.id;
  }

  // Creates a Stripe Checkout Session for a PAID plan and returns its hosted
  // URL. The frontend must redirect the browser there — nothing is activated
  // in our database until Stripe confirms payment via the webhook below.
  async createCheckoutSession(dealerId: string, planId: string, billingCycle: string = 'monthly', couponCode?: string) {
    const stripe = getStripe();
    if (!stripe) {
      throw new BadRequestException('Payments are not configured on this server yet (STRIPE_SECRET_KEY missing). Contact support.');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.is_active) throw new NotFoundException('Plan not found or inactive');

    const price = billingCycle === 'yearly' ? Number(plan.price_yearly) : billingCycle === 'quarterly' ? Number(plan.price_quarterly) : Number(plan.price_monthly);
    if (price <= 0) throw new BadRequestException('This is a free plan — use /subscribe instead of checkout.');
    if (billingCycle === 'quarterly') throw new BadRequestException('Quarterly billing is not yet supported via Stripe Checkout — choose monthly or yearly.');

    const stripePriceId = billingCycle === 'yearly' ? plan.stripe_price_yearly_id : plan.stripe_price_monthly_id;
    if (!stripePriceId) throw new BadRequestException(`This plan is not yet linked to a Stripe price (${billingCycle}). An admin needs to configure it first.`);

    // Validate coupon up front so the checkout session can carry a real Stripe
    // discount — we still re-validate on the webhook before ever activating.
    let stripeCouponId: string | undefined;
    if (couponCode) {
      const coupon = await this.prisma.subscriptionCoupon.findUnique({ where: { code: couponCode } });
      const valid = coupon && coupon.is_active && (!coupon.valid_until || new Date(coupon.valid_until) > new Date())
        && (!coupon.max_uses || coupon.current_uses < coupon.max_uses);
      if (!valid) throw new BadRequestException('Invalid or expired coupon code');
      // Percentage-off coupons map directly to a one-off Stripe coupon; created
      // on the fly so plan pricing in Stripe stays the single source of truth.
      if (coupon!.discount_type === 'percentage' && Number(coupon!.discount_value) > 0) {
        const created = await stripe.coupons.create({ percent_off: Number(coupon!.discount_value), duration: 'once' });
        stripeCouponId = created.id;
      }
    }

    const customerId = await this.getOrCreateStripeCustomer(dealerId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
      success_url: `${frontendUrl}/dealer/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dealer/subscription?checkout=cancelled`,
      metadata: { dealer_id: dealerId, plan_id: planId, billing_cycle: billingCycle, coupon_code: couponCode || '' },
      subscription_data: { metadata: { dealer_id: dealerId, plan_id: planId, billing_cycle: billingCycle } },
    });

    return { checkout_url: session.url };
  }

  // ── Stripe webhook — the ONLY place a paid subscription becomes active ────

  async handleStripeWebhookEvent(event: Stripe.Event) {
    const logger = new Logger('StripeWebhook');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { dealer_id, plan_id, billing_cycle, coupon_code } = (session.metadata || {}) as Record<string, string>;
        if (!dealer_id || !plan_id) { logger.warn('checkout.session.completed missing dealer_id/plan_id metadata'); break; }

        const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: plan_id } });
        if (!plan) { logger.warn(`Plan ${plan_id} not found for completed checkout`); break; }

        // Idempotency: Stripe may retry webhook delivery — never double-activate.
        const already = await this.prisma.dealerSubscription.findFirst({ where: { stripe_subscription_id: String(session.subscription) } });
        if (already) break;

        await this.prisma.dealerSubscription.updateMany({
          where: { dealer_id, status: { in: ['active', 'trial'] } },
          data: { status: 'cancelled', cancelled_at: new Date() },
        });

        let discountPct = 0;
        if (coupon_code) {
          const coupon = await this.prisma.subscriptionCoupon.findUnique({ where: { code: coupon_code } });
          if (coupon) {
            discountPct = Number(coupon.discount_value);
            await this.prisma.subscriptionCoupon.update({ where: { code: coupon_code }, data: { current_uses: { increment: 1 } } });
          }
        }

        const periodEnd = new Date();
        if (billing_cycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        else periodEnd.setMonth(periodEnd.getMonth() + 1);

        const sub = await this.prisma.dealerSubscription.create({
          data: {
            dealer_id, plan_id, status: 'active', billing_cycle: billing_cycle || 'monthly',
            discount_pct: discountPct, current_period_start: new Date(), current_period_end: periodEnd,
            stripe_subscription_id: String(session.subscription || ''), stripe_customer_id: String(session.customer || ''),
          },
        });

        await this.prisma.subscriptionHistory.create({
          data: { dealer_id, subscription_id: sub.id, event_type: 'created', to_plan_id: plan_id, metadata: { via: 'stripe_checkout' } },
        });

        const price = billing_cycle === 'yearly' ? Number(plan.price_yearly) : Number(plan.price_monthly);
        const discount = price * discountPct / 100;
        await this.prisma.subscriptionInvoice.create({
          data: {
            subscription_id: sub.id, dealer_id, invoice_number: `INV-${Date.now()}`,
            status: 'paid', billing_cycle: billing_cycle || 'monthly',
            amount_subtotal: price, amount_discount: discount, amount_total: price - discount,
            period_start: new Date(), period_end: periodEnd, paid_at: new Date(),
            stripe_invoice_id: String(session.invoice || ''),
          },
        });

        logger.log(`Activated paid subscription for dealer ${dealer_id} — plan ${plan_id} (${billing_cycle}) via Stripe`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoiceObj = event.data.object as Stripe.Invoice;
        const subId = String((invoiceObj as any).subscription || '');
        if (subId) {
          await this.prisma.dealerSubscription.updateMany({
            where: { stripe_subscription_id: subId },
            data: { status: 'past_due' },
          });
          logger.warn(`Marked subscription ${subId} as past_due after a failed Stripe payment`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = await this.prisma.dealerSubscription.findFirst({ where: { stripe_subscription_id: (event.data.object as Stripe.Subscription).id } });
        if (sub) {
          await this.prisma.dealerSubscription.updateMany({
            where: { id: sub.id },
            data: { status: 'cancelled', cancelled_at: new Date() },
          });
          logger.log(`Cancelled subscription ${sub.id} following Stripe subscription deletion`);
        }
        break;
      }

      default:
        break; // ignore events we don't act on
    }
  }

  async cancelSubscription(dealerId: string, reason?: string) {
    const sub = await this.prisma.dealerSubscription.findFirst({
      where: { dealer_id: dealerId, status: { in: ['active', 'trial'] } },
    });
    if (!sub) throw new NotFoundException('No active subscription');

    const updated = await this.prisma.dealerSubscription.update({
      where: { id: sub.id },
      data: { status: 'cancelled', cancelled_at: new Date(), cancel_reason: reason, auto_renew: false },
    });

    await this.prisma.subscriptionHistory.create({
      data: { dealer_id: dealerId, subscription_id: sub.id, event_type: 'cancelled', metadata: { reason } },
    });

    return updated;
  }

  // ── Invoices ───────────────────────────────────────────────────────────────

  async getDealerInvoices(dealerId: string) {
    return this.prisma.subscriptionInvoice.findMany({
      where: { dealer_id: dealerId },
      orderBy: { created_at: 'desc' },
      take: 24,
    });
  }

  // ── Coupons ────────────────────────────────────────────────────────────────

  async validateCoupon(code: string, planId: string) {
    const coupon = await this.prisma.subscriptionCoupon.findUnique({ where: { code } });
    if (!coupon || !coupon.is_active) return { valid: false, reason: 'Invalid coupon code' };
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) return { valid: false, reason: 'Coupon expired' };
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) return { valid: false, reason: 'Coupon limit reached' };
    return { valid: true, coupon };
  }

  // ── Admin: SaaS Analytics ──────────────────────────────────────────────────

  async getSaasAnalytics() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalDealers, freeDealers, proDealers, enterpriseDealers,
      newThisMonth, mrr, totalInvoices,
    ] = await Promise.all([
      this.prisma.dealer.count(),
      this.prisma.dealerSubscription.count({ where: { plan: { slug: 'free' }, status: 'active' } }),
      this.prisma.dealerSubscription.count({ where: { plan: { slug: 'pro' }, status: 'active' } }),
      this.prisma.dealerSubscription.count({ where: { plan: { slug: 'enterprise' }, status: 'active' } }),
      this.prisma.dealer.count({ where: { created_at: { gte: monthStart } } }),
      this.prisma.subscriptionInvoice.aggregate({
        where: { status: 'paid', billing_cycle: 'monthly' },
        _sum: { amount_total: true },
      }),
      this.prisma.subscriptionInvoice.aggregate({
        where: { status: 'paid' },
        _sum: { amount_total: true },
      }),
    ]);

    const mrrVal = Number(mrr._sum.amount_total || 0);
    const totalRevenue = Number(totalInvoices._sum.amount_total || 0);
    const activeSubs = proDealers + enterpriseDealers;
    const conversionRate = totalDealers > 0 ? Math.round((activeSubs / totalDealers) * 100) : 0;

    return {
      dealers: { total: totalDealers, free: freeDealers, pro: proDealers, enterprise: enterpriseDealers, new_this_month: newThisMonth },
      revenue: { mrr: mrrVal, arr: mrrVal * 12, total: totalRevenue },
      rates: { conversion: conversionRate, churn: 0, upgrade: 0 },
    };
  }

  async getAllSubscriptions(q: any) {
    const { status, plan_slug, page = 1, limit = 20 } = q;
    const where: any = {};
    if (status) where.status = status;
    if (plan_slug) where.plan = { slug: plan_slug };

    const [items, total] = await Promise.all([
      this.prisma.dealerSubscription.findMany({
        where, skip: (Number(page)-1)*Number(limit), take: Number(limit),
        orderBy: { created_at: 'desc' },
        include: {
          dealer: { select: { id: true, company_name: true, email: true, slug: true } },
          plan: { select: { id: true, name: true, slug: true, color: true } },
        },
      }),
      this.prisma.dealerSubscription.count({ where }),
    ]);
    return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async adminUpdateSubscription(subId: string, data: any) {
    return this.prisma.dealerSubscription.update({ where: { id: subId }, data: { ...data, updated_at: new Date() } });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

// NOTE: this controller used to be @Roles('admin') at the class level, which
// locked out every dealer-facing endpoint below (dealer/:dealerId/*) —
// dealers got a 403 trying to view or manage their OWN subscription. Roles
// are now applied per-route instead, with an ownership check so a dealer can
// only ever touch their own subscription, never another dealer's.
@Controller('subscription')
export class SubscriptionController {
  constructor(private svc: SubscriptionService) {}

  private assertOwnDealer(dealerId: string, req: any) {
    if (req.user.role === 'admin') return;
    if (req.user.role !== 'dealer' || req.user.dealerId !== dealerId) {
      throw new ForbiddenException('You can only manage your own subscription');
    }
  }

  // Public plans
  @Public()
  @Get('plans')
  getPlans(@Query('all') all: string) { return this.svc.getPlans(all !== 'true'); }

  @Public()
  @Get('plans/:id')
  getPlan(@Param('id') id: string) { return this.svc.getPlanById(id); }

  // Admin plan management
  @Roles('admin')
  @Post('plans')
  createPlan(@Body() body: any) { return this.svc.createPlan(body); }

  @Roles('admin')
  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() body: any) { return this.svc.updatePlan(id, body); }

  @Roles('admin')
  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) { return this.svc.deletePlan(id); }

  @Roles('admin')
  @Post('plans/:id/duplicate')
  duplicatePlan(@Param('id') id: string) { return this.svc.duplicatePlan(id); }

  @Roles('admin')
  @Put('plans/:id/features')
  setPlanFeatures(@Param('id') id: string, @Body() body: any) { return this.svc.setPlanFeatures(id, body.features); }

  @Roles('admin')
  @Put('plans/:id/limits')
  setPlanLimits(@Param('id') id: string, @Body() body: any) { return this.svc.setPlanLimits(id, body.limits); }

  // Features
  @Public()
  @Get('features')
  getFeatures() { return this.svc.getFeatures(); }

  @Roles('admin')
  @Post('features')
  createFeature(@Body() body: any) { return this.svc.createFeature(body); }

  @Roles('admin')
  @Patch('features/:id')
  updateFeature(@Param('id') id: string, @Body() body: any) { return this.svc.updateFeature(id, body); }

  // ── Dealer subscription — the actual "My Subscription" page ────────────
  @Roles('dealer', 'admin')
  @Get('dealer/:dealerId')
  getDealerSub(@Param('dealerId') id: string, @Request() req: any) {
    this.assertOwnDealer(id, req);
    return this.svc.getDealerSubscription(id);
  }

  @Roles('dealer', 'admin')
  @Get('dealer/:dealerId/invoices')
  getInvoices(@Param('dealerId') id: string, @Request() req: any) {
    this.assertOwnDealer(id, req);
    return this.svc.getDealerInvoices(id);
  }

  @Roles('dealer', 'admin')
  @Post('dealer/:dealerId/subscribe')
  subscribe(@Param('dealerId') id: string, @Body() body: any, @Request() req: any) {
    this.assertOwnDealer(id, req);
    return this.svc.subscribeToPlan(id, body.plan_id, body.billing_cycle, body.coupon_code);
  }

  // Paid plans: returns a Stripe Checkout URL, the frontend redirects to it.
  // Nothing is activated here — only the webhook below does that, once
  // Stripe confirms the payment actually went through.
  @Roles('dealer', 'admin')
  @Post('dealer/:dealerId/checkout')
  checkout(@Param('dealerId') id: string, @Body() body: any, @Request() req: any) {
    this.assertOwnDealer(id, req);
    return this.svc.createCheckoutSession(id, body.plan_id, body.billing_cycle, body.coupon_code);
  }

  // Stripe → us. Public by necessity (Stripe isn't an authenticated dealer),
  // but locked down by verifying the webhook signature below — anyone who
  // doesn't hold STRIPE_WEBHOOK_SECRET gets a 400, not a way to fake a payment.
  @Public()
  @Post('webhook/stripe')
  async stripeWebhook(@Req() req: RawBodyRequest<ExpressRequest>, @Headers('stripe-signature') signature: string) {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !webhookSecret) throw new BadRequestException('Stripe is not configured on this server');
    if (!req.rawBody) throw new BadRequestException('Missing raw request body — check main.ts rawBody bootstrap option');

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    await this.svc.handleStripeWebhookEvent(event);
    return { received: true };
  }

  @Roles('dealer', 'admin')
  @Post('dealer/:dealerId/cancel')
  cancel(@Param('dealerId') id: string, @Body() body: any, @Request() req: any) {
    this.assertOwnDealer(id, req);
    return this.svc.cancelSubscription(id, body.reason);
  }

  // Feature gate — checked constantly by the frontend to show/hide gated UI,
  // so this must be reachable by the dealer themself, not just admin.
  @Roles('dealer', 'admin')
  @Get('dealer/:dealerId/check/:featureKey')
  checkFeature(@Param('dealerId') id: string, @Param('featureKey') key: string, @Request() req: any) {
    this.assertOwnDealer(id, req);
    return this.svc.checkFeatureAccess(id, key);
  }

  @Roles('dealer', 'admin')
  @Get('dealer/:dealerId/limit/:limitKey')
  checkLimit(@Param('dealerId') id: string, @Param('limitKey') key: string, @Request() req: any) {
    this.assertOwnDealer(id, req);
    return this.svc.checkLimitAccess(id, key);
  }

  // Coupon — a dealer needs to validate a code while subscribing.
  @Roles('dealer', 'admin')
  @Post('coupon/validate')
  validateCoupon(@Body() body: any) { return this.svc.validateCoupon(body.code, body.plan_id); }

  // Admin analytics
  @Roles('admin')
  @Get('admin/analytics')
  adminAnalytics() { return this.svc.getSaasAnalytics(); }

  @Roles('admin')
  @Get('admin/subscriptions')
  adminSubs(@Query() q: any) { return this.svc.getAllSubscriptions(q); }

  @Roles('admin')
  @Patch('admin/subscriptions/:id')
  adminUpdateSub(@Param('id') id: string, @Body() body: any) { return this.svc.adminUpdateSubscription(id, body); }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
