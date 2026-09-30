import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { AdminGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions/permissions.guard';
import { RequirePermissions } from '../common/permissions/permissions.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  // Public & Admin: List categories
  @Get()
  async findAll(@Query('activeOnly') activeOnly?: string) {
    return this.categoriesService.findAll(activeOnly === 'true');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('categories')
  @Post()
  async create(@Body() body: any) {
    return this.categoriesService.create(body);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('categories')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.categoriesService.update(id, body);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('categories')
  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: string) {
    return this.categoriesService.toggleStatus(id);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('categories')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
