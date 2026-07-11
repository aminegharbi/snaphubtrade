import { IsOptional, IsString, IsEmail, IsBoolean, IsIn, MaxLength, Matches } from 'class-validator';

const ROLES = ['buyer', 'dealer', 'broker', 'admin'];
const STATUSES = ['active', 'disabled', 'banned'];

// Admin-only: unlike self-registration, an admin MAY promote a user to any
// role including 'admin' — that's the intended, audited path for creating
// additional admin accounts (never via public /auth/register).
export class AdminUpdateUserDto {
  @IsOptional() @IsString() @MaxLength(120) full_name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Matches(/^\+?[0-9\s\-()]{6,20}$/) phone?: string;
  @IsOptional() @IsIn(ROLES) role?: string;
  @IsOptional() @IsBoolean() email_verified?: boolean;
  @IsOptional() @IsIn(STATUSES) status?: string;
  // password_hash is intentionally absent — password changes go through the
  // dedicated POST /admin/users/:id/reset-password endpoint only.
}
