import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummaryStats() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Total Properties
    const totalProperties = await this.prisma.property.count();

    // 2. New Properties (status = PENDING or created in last 7 days)
    const newProperties = await this.prisma.property.count({
      where: {
        OR: [
          { status: 'PENDING' },
          { createdAt: { gte: sevenDaysAgo } }
        ]
      }
    });

    // 3. Total Customers (Users)
    const totalCustomers = await this.prisma.user.count();

    // 4. New Customers (created in last 7 days)
    const newCustomers = await this.prisma.user.count({
      where: {
        createdAt: { gte: sevenDaysAgo }
      }
    });

    // 5. Posted Properties (status = APPROVED / live)
    const postedProperties = await this.prisma.property.count({
      where: {
        status: 'APPROVED'
      }
    });

    // Recent 3 Chats
    const recentChats = await this.prisma.chat.findMany({
      take: 3,
      orderBy: { lastMessageAt: 'desc' }
    });

    // Calendar events
    const calendarEvents = await this.prisma.calendarEvent.findMany({
      orderBy: { eventDate: 'asc' },
      take: 20
    });

    return {
      success: true,
      stats: {
        totalProperties,
        newProperties,
        totalCustomers,
        newCustomers,
        postedProperties
      },
      recentChats,
      calendarEvents
    };
  }
}
