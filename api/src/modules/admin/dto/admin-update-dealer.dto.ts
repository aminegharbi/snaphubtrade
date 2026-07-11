import {
  IsOptional,
  IsString,
  IsUrl,
  IsEmail,
  IsArray,
  IsBoolean,
  IsIn,
  IsDateString,
  MaxLength,
  ArrayMaxSize,
  Matches,
} from 'class-validator';

const SUBSCRIPTION_TIERS = ['free', 'starter', 'pro', 'enterprise'];

// Superset of the dealer self-service UpdateDealerDto: admins may additionally
// set verification status and subscription tier — fields a dealer must never
// be able to set on themselves.
export class AdminUpdateDealerDto {
  @IsOptional() @IsString() @MaxLength(150) company_name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsUrl({}, { message: 'Invalid logo URL' }) logo_url?: string;
  @IsOptional() @IsUrl({}, { message: 'Invalid cover image URL' }) cover_url?: string;
  @IsOptional() @IsString() @Matches(/^\+?[0-9\s\-()]{6,20}$/) phone?: string;
  @IsOptional() @IsString() @Matches(/^\+?[0-9\s\-()]{6,20}$/) whatsapp?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsUrl() website?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() country_id?: string;
  @IsOptional() @IsString() free_zone_id?: string;
  @IsOptional() @IsString() @MaxLength(100) free_zone_license?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) export_destinations?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) certifications?: string[];

  // ── Admin-only ──────────────────────────────────────────────────────────
  @IsOptional() @IsBoolean() verified?: boolean;
  @IsOptional() @IsIn(SUBSCRIPTION_TIERS) subscription_tier?: string;
  @IsOptional() @IsDateString() subscription_ends?: string;
}
