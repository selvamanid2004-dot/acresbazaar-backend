import { Controller, Post, Get, Body, Query, Req, Ip } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post('track')
  async track(@Body() dto: CreateActivityDto, @Ip() ip: string) {
    return this.activitiesService.trackActivity(dto, ip);
  }

  @Get('user')
  async getUserActivities(@Query('userId') userId: string, @Query('limit') limit?: number) {
    return this.activitiesService.getUserActivities(userId, limit ? Number(limit) : 50);
  }

  @Get('recent')
  async getRecentActivities(@Query('role') role?: string, @Query('limit') limit?: number) {
    return this.activitiesService.getRecentActivities(role, limit ? Number(limit) : 50);
  }

  @Get('summary')
  async getSummary() {
    return this.activitiesService.getActivitySummary();
  }
}
