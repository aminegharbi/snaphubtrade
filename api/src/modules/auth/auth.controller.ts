import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../shared/auth/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  // Strict throttle on registration to slow down mass-account-creation / spam.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Public()
  // Strict throttle on login to blunt brute-force / credential-stuffing attempts.
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Public()
  // Strict throttle to blunt reset-spam / enumeration attempts.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body?.email || '');
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body?.token, body?.password);
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleSignIn(@Body() body: { id_token: string }) {
    return this.authService.googleSignIn(body?.id_token);
  }

  @Public()
  @Get()
  info() {
    return { endpoints: ['POST /auth/register', 'POST /auth/login', 'POST /auth/forgot-password', 'POST /auth/reset-password', 'POST /auth/google'], version: '1.0' };
  }
}
