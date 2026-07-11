import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { BigIntInterceptor } from './shared/interceptors/bigint.interceptor';
import helmet from 'helmet';
import * as compression from 'compression';

// Fallback: patch BigInt.toJSON so JSON.stringify never throws on BigInt
(BigInt.prototype as any).toJSON = function () { return Number(this); };

async function bootstrap() {
  // Fail fast on missing/weak secrets instead of silently running insecurely.
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET is missing or shorter than 32 characters. Set a strong random value in your .env file.');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true, // needed to verify the Stripe webhook signature (req.rawBody)
  });

  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  }));
  app.use(compression());

  // CORS is restricted to an explicit allow-list. ALLOWED_ORIGINS is a
  // comma-separated list in the environment (e.g. "https://dubaiauto.ae,https://www.dubaiauto.ae").
  // Falling back to reflecting any origin (origin: true) is unsafe once
  // credentials:true is set, since it effectively disables the same-origin
  // protection CORS is meant to provide.
  //
  // Default covers both common local setups: nginx fronting everything on
  // port 80 (docker-compose default — browser origin is http://localhost
  // with no port) and hitting the Next.js dev server directly on :3000.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost,http://localhost:3000,http://127.0.0.1,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow same-origin/non-browser requests (no Origin header) through.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Reject WITHOUT throwing: passing an Error here makes it bubble up as
      // an unhandled 500 through Nest's exception filter. Returning
      // callback(null, false) makes the cors middleware simply omit the
      // CORS headers, so the browser blocks it cleanly (and non-browser
      // clients get a normal response, not a crash).
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.setGlobalPrefix('api/v1');

  // Convert BigInt and Prisma Decimal to plain numbers in all responses
  app.useGlobalInterceptors(new BigIntInterceptor());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,          // silently strip unknown fields (prevents mass-assignment attacks)
    // NOTE: kept permissive (not forbidNonWhitelisted) because several existing
    // frontend forms send fields that don't map 1:1 to backend DTOs yet
    // (e.g. vehicle edit modal sends `engine_power_hp`/`is_new`, dealer profile
    // sends `trade_license`/`trn`/`zone`/... not yet in the Dealer schema).
    // See SECURITY_TODO.md — tightening this further requires reconciling
    // those forms with the Prisma schema first, otherwise saves will start
    // failing with 400s. whitelist:true already strips the unknown fields
    // safely, which is the important security property.
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) => {
      const messages = errors.map((e) => Object.values(e.constraints || {}).join(', '));
      return new BadRequestException({ message: messages, error: 'Bad Request', statusCode: 400 });
    },
  }));

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 DubaiAuto API running on port ${port}`);
}

bootstrap();
