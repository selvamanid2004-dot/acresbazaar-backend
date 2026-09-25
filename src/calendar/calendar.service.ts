import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { year?: number; month?: number }) {
    const where: any = {};
    if (query?.year && query?.month) {
      const startOfMonth = new Date(query.year, query.month - 1, 1);
      const endOfMonth = new Date(query.year, query.month, 0, 23, 59, 59);
      where.eventDate = {
        gte: startOfMonth,
        lte: endOfMonth
      };
    }

    const events = await this.prisma.calendarEvent.findMany({
      where,
      orderBy: { eventDate: 'asc' }
    });
    return { success: true, count: events.length, events };
  }

  async create(data: { title: string; description?: string; eventDate: string | Date; eventType?: string }) {
    if (!data.title || !data.eventDate) {
      throw new BadRequestException('Event title and eventDate are required');
    }

    const event = await this.prisma.calendarEvent.create({
      data: {
        title: data.title.trim(),
        description: data.description || '',
        eventDate: new Date(data.eventDate),
        eventType: data.eventType || 'REMINDER',
        isCompleted: false
      }
    });

    return { success: true, message: 'Calendar event created', event };
  }

  async toggleComplete(id: string) {
    const existing = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: { isCompleted: !existing.isCompleted }
    });
    return { success: true, event: updated };
  }

  async delete(id: string) {
    await this.prisma.calendarEvent.delete({ where: { id } });
    return { success: true, message: 'Event deleted successfully' };
  }
}
