import { IsOptional, IsString, IsEmail, IsArray, IsIn, IsNumber, Min, Max, MaxLength, ArrayMaxSize, Matches } from 'class-validator';

const BROKER_STATUSES = ['pending', 'active', 'suspended', 'rejected'];
const BROKER_TIERS = ['Starter', 'Silver', 'Gold', 'Platinum'];

export class AdminUpdateBrokerDto {
  @IsOptional() @IsString() @MaxLength(120) full_name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Matches(/^\+?[0-9\s\-()]{6,20}$/) phone?: string;
  @IsOptional() @IsString() @Matches(/^\+?[0-9\s\-()]{6,20}$/) whatsapp?: string;
  @IsOptional() @IsString() @MaxLength(150) company_name?: string;
  @IsOptional() @IsString() @MaxLength(60) country?: string;
  @IsOptional() @IsString() country_id?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) specialties?: string[];

  // ── Admin-only ──────────────────────────────────────────────────────────
  @IsOptional() @IsIn(BROKER_STATUSES) status?: string;
  @IsOptional() @IsIn(BROKER_TIERS) tier?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) commission_rate?: number;
}
