import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    // Accept VERIFIED as alias for APPROVED in filter
    let dbStatus = status && status !== 'ALL' ? status.toUpperCase() : null;
    if (dbStatus === 'VERIFIED') dbStatus = 'APPROVED';
    const where = dbStatus ? { status: dbStatus } : {};
    const partners = await this.prisma.verifiedPartner.findMany({
      where,
      orderBy: { registeredAt: 'desc' }
    });
    // Return APPROVED as VERIFIED in the response so the admin panel shows the correct badge
    return { success: true, count: partners.length, partners: partners.map(p => ({ ...p, status: p.status === 'APPROVED' ? 'VERIFIED' : p.status })) };
  }

  async create(data: {
    name: string;
    type: string;
    company?: string;
    mobile: string;
    email: string;
  }) {
    if (!data.name || !data.mobile || !data.email) {
      throw new BadRequestException('Name, mobile, and email are required');
    }

    const partner = await this.prisma.verifiedPartner.create({
      data: {
        name: data.name.trim(),
        type: data.type ? data.type.trim() : 'Broker',
        company: data.company ? data.company.trim() : '',
        mobile: data.mobile.trim(),
        email: data.email.toLowerCase().trim(),
        status: 'PENDING'
      }
    });

    return { success: true, message: 'Partner registration submitted for verification', partner };
  }

  async updateStatus(id: string, status: string) {
    // Accept 'VERIFIED' as alias for 'APPROVED' (admin panel UI sends 'VERIFIED')
    const clean = status.toUpperCase() === 'VERIFIED' ? 'APPROVED' : status.toUpperCase();
    const valid = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!valid.includes(clean)) {
      throw new BadRequestException(`Status must be one of: PENDING, VERIFIED, APPROVED, REJECTED`);
    }

    const updated = await this.prisma.verifiedPartner.update({
      where: { id },
      data: { status: clean }
    });

    // Return status as VERIFIED when APPROVED so admin panel displays correctly
    return { success: true, message: `Partner status updated to ${clean}`, partner: { ...updated, status: updated.status === 'APPROVED' ? 'VERIFIED' : updated.status } };
  }

  async delete(id: string) {
    await this.prisma.verifiedPartner.delete({ where: { id } });
    return { success: true, message: 'Partner deleted successfully' };
  }
}
