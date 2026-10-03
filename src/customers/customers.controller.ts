import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { AdminGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions/permissions.guard';
import { RequirePermissions } from '../common/permissions/permissions.decorator';

@Controller('customers')
@UseGuards(AdminGuard, PermissionsGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @RequirePermissions('buyers.view', 'sellers.view', 'dealers.view', 'common_people.view', 'buyers', 'sellers', 'dealers', 'common_people', 'customers')
  async findAll(
    @Query('role') role?: string,
    @Query('isNew') isNew?: string,
    @Query('search') search?: string
  ) {
    return this.customersService.findAll({ role, isNew, search });
  }

  @Get(':id')
  @RequirePermissions('buyers.view', 'sellers.view', 'dealers.view', 'common_people.view', 'buyers', 'sellers', 'dealers', 'common_people', 'customers')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('buyers.update', 'sellers.update', 'dealers.update', 'common_people.update', 'buyers', 'sellers', 'dealers', 'common_people', 'customers')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; mobile?: string; role?: string; isActive?: boolean }
  ) {
    return this.customersService.update(id, body);
  }

  @Patch(':id/toggle-status')
  @RequirePermissions('buyers.activate', 'sellers.activate', 'dealers.activate', 'common_people.activate', 'buyers.update', 'sellers.update', 'dealers.update', 'common_people.update', 'customers')
  async toggleStatus(@Param('id') id: string, @Body() body?: { status?: string }) {
    return this.customersService.toggleStatus(id, body?.status);
  }

  @Delete(':id')
  @RequirePermissions('buyers.delete', 'sellers.delete', 'dealers.delete', 'common_people.delete', 'customers')
  async delete(@Param('id') id: string) {
    return this.customersService.delete(id);
  }
}
