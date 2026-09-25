import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AdminGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(AdminGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    return this.dashboardService.getSummaryStats();
  }
}
