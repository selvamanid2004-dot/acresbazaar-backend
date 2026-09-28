import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private prisma: PrismaService) {}

  async trackActivity(dto: CreateActivityDto, ipAddress?: string) {
    try {
      const activity = await this.prisma.userActivity.create({
        data: {
          userId: dto.userId || null,
          userRole: dto.userRole || 'BUYER',
          actionType: dto.actionType,
          entityId: dto.entityId || null,
          details: dto.details ? (typeof dto.details === 'string' ? dto.details : JSON.stringify(dto.details)) : null,
          ipAddress: ipAddress || null,
        },
      });
      return { success: true, data: activity };
    } catch (error) {
      this.logger.error(`Error tracking activity: ${error.message}`);
      return { success: false, message: 'Failed to record activity' };
    }
  }

  async getUserActivities(userId: string, limit = 50) {
    const activities = await this.prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { success: true, data: activities };
  }

  async getRecentActivities(role?: string, limit = 50) {
    const whereClause = role ? { userRole: role } : {};
    const activities = await this.prisma.userActivity.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { success: true, data: activities };
  }

  async getActivitySummary() {
    const total = await this.prisma.userActivity.count();
    const views = await this.prisma.userActivity.count({ where: { actionType: 'VIEW_PROPERTY' } });
    const searches = await this.prisma.userActivity.count({ where: { actionType: 'SEARCH' } });
    const inquiries = await this.prisma.userActivity.count({ where: { actionType: 'CONTACT_SELLER' } });
    const wishlists = await this.prisma.userActivity.count({ where: { actionType: 'SAVE_WISHLIST' } });

    return {
      success: true,
      data: {
        total,
        views,
        searches,
        inquiries,
        wishlists,
      },
    };
  }
}
