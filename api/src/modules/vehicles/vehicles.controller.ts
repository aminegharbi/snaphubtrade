// ─── vehicles.controller.ts ───────────────────────────────────────────────────
import {
  Controller, Get, Post, Put, Patch, Delete, Body,
  Param, Query, UseInterceptors, UploadedFiles,
  HttpCode, HttpStatus, Request, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VehiclesService } from './vehicles.service';
import { Public } from '../../shared/auth/public.decorator';
import { Roles } from '../../shared/auth/roles.decorator';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { UpdateVehicleStatusDto } from './dto/update-status.dto';

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Public()
  @Get()
  findAll(@Query() query: any) {
    return this.vehiclesService.findAll(query);
  }

  @Public()
  @Get('featured')
  getFeatured() {
    return this.vehiclesService.getFeatured();
  }

  @Public()
  @Get('makes')
  getMakes() {
    return this.vehiclesService.getMakes();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  // Verifies the vehicle belongs to the requesting dealer before allowing
  // a mutation. Admins bypass the ownership check.
  private async assertOwnership(id: string, req: any) {
    if (req.user.role === 'admin') return;
    const vehicle: any = await this.vehiclesService.findOne(id);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.dealer_id !== req.user.dealerId) {
      throw new ForbiddenException("This vehicle does not belong to your account");
    }
  }

  @Roles('dealer', 'admin')
  @Post()
  create(@Body() body: CreateVehicleDto, @Request() req: any) {
    return this.vehiclesService.create(body, req.user?.dealerId);
  }

  @Roles('dealer', 'admin')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateVehicleDto, @Request() req: any) {
    await this.assertOwnership(id, req);
    return this.vehiclesService.update(id, body);
  }

  @Roles('dealer', 'admin')
  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: UpdateVehicleDto, @Request() req: any) {
    await this.assertOwnership(id, req);
    return this.vehiclesService.update(id, body);
  }

  @Roles('dealer', 'admin')
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: UpdateVehicleStatusDto, @Request() req: any) {
    await this.assertOwnership(id, req);
    return this.vehiclesService.updateStatus(id, body.status);
  }

  @Roles('dealer', 'admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.assertOwnership(id, req);
    return this.vehiclesService.remove(id);
  }

  @Roles('dealer', 'admin')
  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
        return cb(new ForbiddenException('Only JPEG, PNG, and WebP files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  uploadImages(@UploadedFiles() files: Express.Multer.File[], @Body() body: { vehicleId: string }) {
    return this.vehiclesService.uploadImages(files, body.vehicleId);
  }

  @Roles('dealer', 'admin')
  @Post('bulk')
  bulkCreate(@Body() body: { vehicles: CreateVehicleDto[] }, @Request() req: any) {
    return this.vehiclesService.bulkCreate(body.vehicles, req.user?.dealerId);
  }
}
