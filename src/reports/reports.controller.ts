import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AdminGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  // Public endpoint for submitting property report
  @Post()
  async create(@Body() body: any) {
    return this.reportsService.create(body);
  }

  // Admin endpoints
  @UseGuards(AdminGuard)
  @Get()
  async findAll(@Query('status') status?: string) {
    return this.reportsService.findAll(status);
  }

  @UseGuards(AdminGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.reportsService.updateStatus(id, body.status);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.reportsService.delete(id);
  }
}
