import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { AdminGuard } from '../auth/jwt-auth.guard';

@Controller('partners')
export class PartnersController {
  constructor(private partnersService: PartnersService) {}

  @Get()
  async findAll(@Query('status') status?: string) {
    return this.partnersService.findAll(status);
  }

  @Post()
  async create(@Body() body: any) {
    return this.partnersService.create(body);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.partnersService.updateStatus(id, body.status);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.partnersService.delete(id);
  }
}
