import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { AdminGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions/permissions.guard';
import { RequirePermissions } from '../common/permissions/permissions.decorator';

@Controller('rewards')
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  // Public / Spotter endpoints
  @Post('claim')
  async submitClaim(@Body() body: any) {
    return this.rewardsService.submitClaim(body);
  }

  @Get('my-claim')
  async getMyClaim(@Query('email') email: string) {
    return this.rewardsService.getClaimByUser(email);
  }

  // Dealer rewards summary (points, active claims, breakdown)
  @Get('dealer-summary')
  async getDealerSummary(@Query('email') email: string) {
    return this.rewardsService.getDealerRewardsSummary(email);
  }

  // Spotter rewards summary (points, active claims, breakdown)
  @Get('spotter-summary')
  async getSpotterSummary(@Query('email') email: string) {
    return this.rewardsService.getSpotterRewardsSummary(email);
  }

  // Admin endpoints
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards')
  @Get()
  async findAll(@Query('status') status?: string, @Query('role') role?: string) {
    return this.rewardsService.findAll(status, role);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards')
  @Post()
  async create(@Body() body: any) {
    return this.rewardsService.create(body);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards')
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.rewardsService.updateStatus(id, body.status);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.rewardsService.delete(id);
  }
}
