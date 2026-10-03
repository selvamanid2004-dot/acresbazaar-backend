import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { AdminGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions/permissions.guard';
import { RequirePermissions } from '../common/permissions/permissions.decorator';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto, ResetStaffPasswordDto } from './dto/update-staff.dto';

@Controller('staff')
@UseGuards(AdminGuard, PermissionsGuard)
export class StaffController {
  constructor(private staffService: StaffService) {}

  // 1. Get available module permission schema & grouping
  @Get('modules')
  async getModules() {
    return this.staffService.getModulesList();
  }

  // 2. List all Administrators & Staff
  @Get()
  @RequirePermissions('staff_management.view', 'staff_management')
  async findAll(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.staffService.findAll({ role, search, status });
  }

  // 3. Get single Admin/Staff
  @Get(':id')
  @RequirePermissions('staff_management.view', 'staff_management')
  async findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  // 4. Create new Administrator or Staff
  @Post()
  @RequirePermissions('staff_management.create', 'staff_management')
  async create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto);
  }

  // 5. Update details & permissions
  @Patch(':id')
  @RequirePermissions('staff_management.update', 'staff_management')
  async update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(id, dto);
  }

  // 6. Reset password
  @Patch(':id/password')
  @RequirePermissions('staff_management.reset_password', 'staff_management.update', 'staff_management')
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetStaffPasswordDto,
  ) {
    return this.staffService.resetPassword(id, dto.password);
  }

  // 7. Toggle active / disabled status
  @Patch(':id/toggle-status')
  @RequirePermissions('staff_management.update', 'staff_management')
  async toggleStatus(
    @Param('id') id: string,
    @Body() body?: { status?: boolean },
  ) {
    return this.staffService.toggleStatus(id, body?.status);
  }

  // 8. Delete Administrator / Staff
  @Delete(':id')
  @RequirePermissions('staff_management.delete', 'staff_management')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.staffService.delete(id, req.user?.sub || req.user?.id);
  }
}
