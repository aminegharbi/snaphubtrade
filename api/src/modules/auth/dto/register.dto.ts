import {
  IsEmail,
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  MinLength,
  MaxLength,
  Matches,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';

const ROLES = ['buyer', 'dealer', 'broker'] as const;

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  // Password is optional (social/magic-link signup), but if provided it must be strong.
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72) // bcrypt input limit
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain an uppercase letter, a lowercase letter, and a digit',
  })
  password?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  full_name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, { message: 'Invalid phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, { message: 'Invalid WhatsApp number' })
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  // Only meaningful when role=dealer — sets the new Dealer record's operating
  // country. Optional and defaults to UAE in the service if omitted, so
  // existing frontend forms that don't send it yet keep working.
  @IsOptional()
  @IsString()
  country_id?: string;

  @IsOptional()
  @IsString()
  free_zone_id?: string;

  @IsOptional()
  @IsString()
  @IsIn(['en', 'fr', 'ar'])
  preferred_lang?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(30)
  budget_aed?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  referral_code?: string;

  @IsOptional()
  @IsIn(ROLES, { message: 'Invalid role' })
  role?: (typeof ROLES)[number];

  // Never trust client-supplied verification/role-elevation flags.
  // Explicitly NOT accepted here — stripped by whitelist:true in the global ValidationPipe.
}
