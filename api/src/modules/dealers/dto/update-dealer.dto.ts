import {
  IsOptional,
  IsString,
  IsUrl,
  IsEmail,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  Matches,
} from 'class-validator';

export class UpdateDealerDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  company_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid logo URL' })
  logo_url?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid cover image URL' })
  cover_url?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, { message: 'Invalid phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, { message: 'Invalid WhatsApp number' })
  whatsapp?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid website URL' })
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  // A dealer may set their own country/free zone — this is their own business
  // info (where they're licensed to operate), not an admin-controlled field
  // like `verified`. Validated against real rows, not a free enum, so a typo'd
  // ID just fails the FK constraint rather than silently creating garbage data.
  @IsOptional()
  @IsString()
  country_id?: string;

  @IsOptional()
  @IsString()
  free_zone_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  free_zone_license?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  export_destinations?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  certifications?: string[];

  // Explicitly NOT included: verified, verified_at, rating, review_count,
  // subscription_tier, subscription_ends, stripe_customer_id — these are
  // server/admin-controlled fields and must never be settable by a dealer.
}
