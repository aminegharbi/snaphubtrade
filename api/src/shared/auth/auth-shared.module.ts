import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';

// Global module providing the JWT strategy + signing config to the whole app,
// so every feature module can inject JwtService/guards without re-declaring config.
@Global()
@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET must be set (>=32 chars) in environment variables.');
        }
        return {
          secret,
          // No refresh-token rotation exists yet, so default errs toward a
          // usable session length. Set JWT_EXPIRES_IN=2h (or shorter) once a
          // refresh flow is added for tighter security.
          signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
        };
      },
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthSharedModule {}
