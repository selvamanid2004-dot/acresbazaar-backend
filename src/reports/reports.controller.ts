import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AdminGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions/permissions.guard';
import { RequirePermissions } from '../common/permissions/permissions.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  // Public endpoint for submitting property report
  @Post()
  async create(@Body() body: any) {
    return this.reportsService.create(body);
  }

  // Admin endpoints
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('reports')
  @Get()
  async findAll(@Query('status') status?: string) {
    return this.reportsService.findAll(status);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('reports')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('reports')
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.reportsService.updateStatus(id, body.status);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('reports')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.reportsService.delete(id);
  }
}
