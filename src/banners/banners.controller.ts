import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards
} from '@nestjs/common';
import { BannersService, CreateBannerDto, UpdateBannerDto } from './banners.service';
import { AdminGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions/permissions.guard';
import { RequirePermissions } from '../common/permissions/permissions.decorator';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  // Public: Get active banners for public website hero slider
  @Get('public')
  async getPublicBanners() {
    return this.bannersService.getPublicBanners();
  }

  // Admin: Get all banners
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('website_settings.view', 'website_settings', 'admin.view')
  @Get()
  async getAllBanners() {
    return this.bannersService.getAllBanners();
  }

  // Admin: Get single banner
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('website_settings.view', 'website_settings', 'admin.view')
  @Get(':id')
  async getBannerById(@Param('id') id: string) {
    return this.bannersService.getBannerById(id);
  }

  // Admin: Create new banner
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('website_settings.create', 'website_settings.update', 'website_settings')
  @Post()
  async createBanner(@Body() dto: CreateBannerDto) {
    return this.bannersService.createBanner(dto);
  }

  // Admin: Update banner
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('website_settings.update', 'website_settings')
  @Put(':id')
  async updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.updateBanner(id, dto);
  }

  // Admin: Delete banner
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('website_settings.delete', 'website_settings.update', 'website_settings')
  @Delete(':id')
  async deleteBanner(@Param('id') id: string) {
    return this.bannersService.deleteBanner(id);
  }

  // Admin: Toggle active/inactive
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('website_settings.update', 'website_settings')
  @Patch(':id/status')
  async toggleStatus(@Param('id') id: string, @Body('status') status?: string) {
    return this.bannersService.toggleStatus(id, status);
  }

  // Admin: Bulk reorder
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('website_settings.update', 'website_settings')
  @Patch('reorder')
  async reorderBanners(@Body('orderList') orderList: { id: string; sortOrder: number }[]) {
    return this.bannersService.reorderBanners(orderList || []);
  }
}
