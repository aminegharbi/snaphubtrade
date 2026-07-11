import { IsIn } from 'class-validator';

const STATUSES = ['available', 'reserved', 'sold', 'draft', 'archived'];

export class UpdateVehicleStatusDto {
  @IsIn(STATUSES, { message: 'Invalid status' })
  status!: string;
}
