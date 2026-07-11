import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { sendEmail } from '../email/email.module';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private signToken(user: { id: string; email: string; role: string }, dealerId?: string, brokerId?: string) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      dealerId,
      brokerId,
    });
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account already exists with this email');

    const hash = dto.password ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS) : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash: hash,
        full_name: dto.full_name,
        phone: dto.phone || dto.whatsapp,
        // Admin role can NEVER be set through public registration.
        role: dto.role === 'dealer' || dto.role === 'broker' ? dto.role : 'buyer',
        // Real email verification must go through a verification flow, not be client-supplied.
        email_verified: false,
      },
    });

    let dealer = null;
    if (dto.role === 'dealer') {
      const slug =
        dto.full_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now();
      dealer = await this.prisma.dealer.create({
        data: {
          user_id: user.id,
          company_name: dto.full_name,
          slug,
          email: dto.email,
          phone: dto.phone,
          city: dto.city,
          // Defaults to UAE ('country_ae', seeded in postgres-seeds/06_gcc_countries.sql)
          // when the frontend doesn't send a country yet — keeps existing
          // registration forms working while they're updated to add a country selector.
          country_id: dto.country_id || 'country_ae',
          free_zone_id: dto.free_zone_id,
        },
      });
    }

    let broker = null;
    if (dto.role === 'broker') {
      const code =
        dto.full_name.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5) +
        '-' +
        Date.now().toString(36).toUpperCase().slice(-4);
      broker = await this.prisma.broker.create({
        data: {
          user_id: user.id,
          full_name: dto.full_name,
          email: dto.email,
          phone: dto.phone || dto.whatsapp,
          whatsapp: dto.whatsapp,
          affiliate_code: code,
        },
      });
    }

    const { password_hash, ...safe } = user;

    // ── Referral tracking ──────────────────────────────────────────────────
    // A broker's referral link carries their affiliate_code as ?ref=CODE.
    // If a valid one was submitted, credit that broker with this signup —
    // this is the write side of what the broker dashboard already reads
    // (brokerReferral.count({ status: 'active' })), which until now had
    // nothing populating it: every "refer a dealer/broker" link was silently
    // going nowhere.
    if (dto.referral_code) {
      await this.creditReferral(dto.referral_code, dto.role === 'dealer' || dto.role === 'broker' ? dto.role : 'buyer', dealer?.id || broker?.id || user.id);
    }

    const access_token = this.signToken(user, dealer?.id, broker?.id);
    return { access_token, user: safe, dealer, broker };
  }

  // Shared by both entry points that can carry a referral code: the general
  // /auth/register flow (dealer/broker/buyer) and BrokerService.registerBroker
  // (a broker referring another broker). Never throws on a bad/unknown code —
  // a mistyped referral link should never block someone from signing up.
  async creditReferral(referralCode: string, referredType: 'dealer' | 'broker' | 'buyer', referredId: string) {
    const referrer = await this.prisma.broker.findUnique({ where: { affiliate_code: referralCode } });
    if (!referrer) return null;
    return this.prisma.brokerReferral.create({
      data: {
        broker_id: referrer.id,
        referred_type: referredType,
        referred_id: referredId,
        referral_code: referralCode,
        status: 'active',
      },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.password_hash) {
      // Run a dummy bcrypt compare so response timing doesn't reveal
      // whether the account exists (mitigates user enumeration).
      await bcrypt.compare(dto.password, '$2a$12$invalidsaltinvalidsaltinvalidsal');
      throw new UnauthorizedException('Incorrect email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Incorrect email or password');

    if ((user as any).status === 'disabled' || (user as any).status === 'banned') {
      throw new UnauthorizedException('This account has been disabled');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const [dealer, broker] = await Promise.all([
      this.prisma.dealer.findFirst({ where: { user_id: user.id } }),
      this.prisma.broker.findUnique({ where: { email: dto.email } }),
    ]);

    const profile_type = dealer ? 'dealer' : broker ? 'broker' : user.role === 'admin' ? 'admin' : 'buyer';

    const { password_hash, ...safe } = user;
    const access_token = this.signToken(user, dealer?.id, broker?.id);
    return { access_token, user: safe, dealer, broker, profile_type };
  }

  // ── Password reset (works for every account type — dealer, broker, buyer,
  // admin — since they all share the same User table and password_hash) ──────

  // Always returns the same generic success response whether or not the
  // email exists, so this endpoint can't be used to enumerate accounts.
  async requestPasswordReset(email: string) {
    const generic = { message: 'If an account exists for this email, a reset link has been sent.' };
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return generic;

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password_reset_token: token, password_reset_expires: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:28px;color:#111827;">
      <div style="margin-bottom:20px;font-size:1.15rem;font-weight:800;">SnapHub<span style="color:#C1272D;">Trade.com</span></div>
      <p style="font-size:14px;line-height:1.6;color:#374151;">Hi ${user.full_name || ''},</p>
      <p style="font-size:14px;line-height:1.6;color:#374151;">We received a request to reset your password. This link expires in 1 hour and can only be used once.</p>
      <a href="${resetLink}" style="display:inline-block;margin-top:14px;padding:12px 26px;background:#C1272D;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Reset my password</a>
      <p style="margin-top:22px;font-size:12px;color:#9CA3AF;">If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
    </div>`;
    await sendEmail({ to: [{ email: user.email, name: user.full_name }], subject: 'Reset your SnapHubTrade.com password', html, from_name: 'SnapHubTrade.com' });

    return generic;
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) throw new BadRequestException('Token and new password are required');
    if (newPassword.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    const user = await this.prisma.user.findUnique({ where: { password_reset_token: token } });
    if (!user || !user.password_reset_expires || user.password_reset_expires < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired — request a new one.');
    }

    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password_hash, password_reset_token: null, password_reset_expires: null },
    });
    return { message: 'Password updated — you can now sign in.' };
  }

  // ── Google Sign-In ────────────────────────────────────────────────────────────
  // Frontend uses Google Identity Services to get an ID token client-side;
  // we verify its signature against Google's own keys (never trust the
  // client-decoded payload) before trusting the email/name it carries.
  async googleSignIn(idToken: string) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new BadRequestException('Google Sign-In is not configured on this server');
    }
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google sign-in token');
    }
    if (!payload?.email) throw new UnauthorizedException('Google account has no verified email');
    if (!payload.email_verified) throw new UnauthorizedException('Google email is not verified');

    const email = payload.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      // Link the Google identity to the existing account if not already linked.
      if (!(user as any).google_id) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: { google_id: payload.sub, email_verified: true } });
      }
    } else {
      // New account via Google — created with no password (password_hash
      // null); the person can set one later via "forgot password" if they
      // ever want to also sign in with email/password.
      user = await this.prisma.user.create({
        data: {
          email, full_name: payload.name || email.split('@')[0], role: 'buyer',
          google_id: payload.sub, email_verified: true, avatar_url: payload.picture || undefined,
        },
      });
    }

    if ((user as any).status === 'disabled' || (user as any).status === 'banned') {
      throw new UnauthorizedException('This account has been disabled');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });

    const [dealer, broker] = await Promise.all([
      this.prisma.dealer.findFirst({ where: { user_id: user.id } }),
      this.prisma.broker.findUnique({ where: { email } }),
    ]);
    const profile_type = dealer ? 'dealer' : broker ? 'broker' : user.role === 'admin' ? 'admin' : 'buyer';

    const { password_hash, ...safe } = user;
    const access_token = this.signToken(user, dealer?.id, broker?.id);
    return { access_token, user: safe, dealer, broker, profile_type };
  }
}
