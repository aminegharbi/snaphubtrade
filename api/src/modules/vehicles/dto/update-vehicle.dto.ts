import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleDto } from './create-vehicle.dto';

// All fields optional for PATCH/PUT — same validation rules apply per-field
// when present, via PartialType's re-use of CreateVehicleDto's decorators.
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
