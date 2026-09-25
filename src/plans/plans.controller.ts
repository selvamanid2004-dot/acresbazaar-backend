import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { AdminGuard } from '../auth/jwt-auth.guard';

@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  // Public & Admin: Get all plans
  @Get()
  async findAll() {
    return this.plansService.findAll();
  }

  // Get specific plan
  @Get(':planId')
  async findOne(@Param('planId') planId: string) {
    return this.plansService.findByPlanId(planId.toLowerCase());
  }

  // Admin: Edit Gold or Platinum plan
  @UseGuards(AdminGuard)
  @Patch(':planId')
  async update(@Param('planId') planId: string, @Body() body: any) {
    return this.plansService.update(planId.toLowerCase(), body);
  }
}
