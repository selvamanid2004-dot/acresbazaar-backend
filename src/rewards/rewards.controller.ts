import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { AdminGuard } from '../auth/jwt-auth.guard';

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

  // Admin endpoints
  @UseGuards(AdminGuard)
  @Get()
  async findAll(@Query('status') status?: string, @Query('role') role?: string) {
    return this.rewardsService.findAll(status, role);
  }

  @UseGuards(AdminGuard)
  @Post()
  async create(@Body() body: any) {
    return this.rewardsService.create(body);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.rewardsService.updateStatus(id, body.status);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.rewardsService.delete(id);
  }
}
