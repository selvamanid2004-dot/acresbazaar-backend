import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { AdminGuard } from '../auth/jwt-auth.guard';

@Controller('calendar')
@UseGuards(AdminGuard)
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get()
  async findAll(@Query('year') year?: string, @Query('month') month?: string) {
    return this.calendarService.findAll({
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined
    });
  }

  @Post()
  async create(@Body() body: any) {
    return this.calendarService.create(body);
  }

  @Patch(':id/toggle')
  async toggle(@Param('id') id: string) {
    return this.calendarService.toggleComplete(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.calendarService.delete(id);
  }
}
