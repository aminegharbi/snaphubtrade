import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  dealerId?: string;
  brokerId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET must be set to a strong random value of at least 32 characters. ' +
        'Refusing to start with an insecure or missing secret.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    // Re-check the user still exists / isn't disabled on every request
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User no longer exists');
    if ((user as any).status === 'disabled' || (user as any).status === 'banned') {
      throw new UnauthorizedException('Account disabled');
    }
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      dealerId: payload.dealerId,
      brokerId: payload.brokerId,
    };
  }
}
