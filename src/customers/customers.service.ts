import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { role?: string; isNew?: string; search?: string }) {
    const { role, isNew, search } = query;
    const where: any = {};

    if (role && role !== 'ALL') {
      where.role = role.toUpperCase();
    }

    if (isNew === 'true') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.createdAt = { gte: sevenDaysAgo };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { mobile: { contains: q } }
      ];
    }

    const customers = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { properties: true }
        }
      }
    });

    return { success: true, count: customers.length, customers };
  }

  async findOne(id: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id },
      include: {
        properties: {
          include: { images: true }
        }
      }
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return { success: true, customer };
  }

  async update(id: string, data: { name?: string; mobile?: string; role?: string; isActive?: boolean }) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.mobile ? { mobile: data.mobile.trim() } : {}),
        ...(data.role ? { role: data.role.toUpperCase() } : {}),
        ...(typeof data.isActive === 'boolean' ? { isActive: data.isActive } : {})
      }
    });
    return { success: true, message: 'Customer updated successfully', customer: updated };
  }

  async toggleStatus(id: string, status?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Customer not found');
    }
    // If explicit status is provided, use it; otherwise auto-toggle
    let newIsActive: boolean;
    if (status !== undefined) {
      newIsActive = status.toUpperCase() === 'ACTIVE';
    } else {
      newIsActive = !existing.isActive;
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: newIsActive }
    });
    return {
      success: true,
      message: `Customer ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      customer: updated
    };
  }

  async delete(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { success: true, message: 'Customer deleted successfully' };
  }
}
