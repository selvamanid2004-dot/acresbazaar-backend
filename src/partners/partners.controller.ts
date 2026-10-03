import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { AdminGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions/permissions.guard';
import { RequirePermissions } from '../common/permissions/permissions.decorator';

@Controller('partners')
export class PartnersController {
  constructor(private partnersService: PartnersService) {}

  @Get()
  async findAll(@Query('status') status?: string) {
    return this.partnersService.findAll(status);
  }

  @Post()
  async create(@Body() body: any) {
    return this.partnersService.create(body);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('verified_partners.approve', 'verified_partners.reject', 'verified_partners.update', 'verified_partners')
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.partnersService.updateStatus(id, body.status);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('verified_partners.delete', 'verified_partners.update', 'verified_partners')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.partnersService.delete(id);
  }
}
