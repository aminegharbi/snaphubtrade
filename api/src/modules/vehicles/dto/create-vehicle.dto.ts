import {
  IsString,
  IsInt,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

const CURRENT_YEAR = new Date().getFullYear();
const FUEL_TYPES = ['petrol', 'diesel', 'hybrid', 'electric', 'phev', 'ev'];
const TRANSMISSIONS = ['automatic', 'manual', 'cvt', 'dct'];
const STATUSES = ['available', 'reserved', 'sold', 'draft', 'archived'];

export class CreateVehicleDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-HJ-NPR-Z0-9]{11,17}$/i, { message: 'Invalid VIN' })
  vin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  plate_number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9999)
  stock_quantity?: number;

  @IsOptional()
  @IsString()
  @IsIn(['GCC', 'US', 'EU', 'Japan', 'Korea', 'China', 'Other'])
  specs_origin?: string;

  @IsString()
  @MaxLength(60)
  make!: string;

  @IsString()
  @MaxLength(80)
  model!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(CURRENT_YEAR + 1)
  year!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  generation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  trim?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  body_type?: string;

  @IsOptional()
  @IsIn(FUEL_TYPES)
  fuel_type?: string;

  @IsOptional()
  @IsIn(TRANSMISSIONS)
  transmission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  engine?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5000)
  horsepower?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  torque?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  doors?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  seats?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000)
  mileage_km?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color_exterior?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color_interior?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  wheels?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  country_origin?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  features?: string[];

  // Decimal fields: accept number or numeric string (frontend forms send both
  // depending on the page), coerced to a number and range-checked.
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price cannot be negative' })
  @Max(100_000_000, { message: 'Price looks incorrect' })
  price_aed!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Minimum price must be a number' })
  @Min(0)
  @Max(100_000_000)
  price_min_aed?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Suggested price must be a number' })
  @Min(0)
  @Max(100_000_000)
  price_suggested_aed?: number;

  @IsOptional()
  @IsBoolean()
  negotiable?: boolean;

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;

  @IsOptional()
  @IsBoolean()
  export_eligible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  seo_keywords?: string;

  // dealer_id, ai_confidence, ai_raw_result, duplicate_hash, view_count,
  // favorite_count, es_indexed_at are server-controlled and intentionally
  // excluded — dealer_id is derived from the authenticated dealer's JWT.
}
