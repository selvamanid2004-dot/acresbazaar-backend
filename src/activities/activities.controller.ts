import { Controller, Post, Get, Body, Query, Req, Ip, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { AdminGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions/permissions.guard';
import { RequirePermissions } from '../common/permissions/permissions.decorator';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post('track')
  async track(@Body() dto: CreateActivityDto, @Ip() ip: string) {
    return this.activitiesService.trackActivity(dto, ip);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('dashboard.view', 'dashboard')
  @Get('user')
  async getUserActivities(@Query('userId') userId: string, @Query('limit') limit?: number) {
    return this.activitiesService.getUserActivities(userId, limit ? Number(limit) : 50);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('dashboard.view', 'dashboard')
  @Get('recent')
  async getRecentActivities(@Query('role') role?: string, @Query('limit') limit?: number) {
    return this.activitiesService.getRecentActivities(role, limit ? Number(limit) : 50);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('dashboard.view', 'dashboard')
  @Get('summary')
  async getSummary() {
    return this.activitiesService.getActivitySummary();
  }
}
