import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    const where = status && status !== 'ALL' ? { status: status.toUpperCase() } : {};
    const reports = await this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, count: reports.length, reports };
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return { success: true, report };
  }

  // Submit report (from Public Website Property Modal or Contact)
  async create(data: {
    propertyId?: string;
    propertyTitle?: string;
    category?: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    reason: string;
    description: string;
  }) {
    if (!data.reason || !data.description) {
      throw new BadRequestException('Reason and description are required');
    }

    const report = await this.prisma.report.create({
      data: {
        propertyId: data.propertyId || null,
        propertyTitle: data.propertyTitle || '',
        category: data.category || '',
        userName: data.userName || 'Anonymous User',
        userEmail: data.userEmail || '',
        userPhone: data.userPhone || '',
        reason: data.reason.trim(),
        description: data.description.trim(),
        status: 'PENDING'
      }
    });

    return { success: true, message: 'Report submitted successfully for admin review', report };
  }

  // Admin: Update Status (RESOLVE, REJECT, PENDING)
  async updateStatus(id: string, status: string) {
    const valid = ['PENDING', 'RESOLVED', 'REJECTED'];
    const clean = status.toUpperCase();
    if (!valid.includes(clean)) {
      throw new BadRequestException(`Status must be one of: ${valid.join(', ')}`);
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: { status: clean }
    });

    return { success: true, message: `Report marked as ${clean}`, report: updated };
  }

  async delete(id: string) {
    await this.prisma.report.delete({ where: { id } });
    return { success: true, message: 'Report deleted successfully' };
  }
}
