import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { AdminGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions/permissions.guard';
import { RequirePermissions } from '../common/permissions/permissions.decorator';

@Controller('customers')
@UseGuards(AdminGuard, PermissionsGuard)
@RequirePermissions('buyers', 'sellers', 'dealers', 'common_people', 'customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  async findAll(
    @Query('role') role?: string,
    @Query('isNew') isNew?: string,
    @Query('search') search?: string
  ) {
    return this.customersService.findAll({ role, isNew, search });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; mobile?: string; role?: string; isActive?: boolean }
  ) {
    return this.customersService.update(id, body);
  }

  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: string, @Body() body?: { status?: string }) {
    return this.customersService.toggleStatus(id, body?.status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.customersService.delete(id);
  }
}
