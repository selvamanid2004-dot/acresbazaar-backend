import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { role?: string; isNew?: string; search?: string }) {
    const { role, isNew, search } = query;
    const cleanRole = role ? role.toUpperCase() : undefined;

    // 1. If role is specifically ADMIN or SUPER_ADMIN
    if (cleanRole === 'ADMIN' || cleanRole === 'SUPER_ADMIN') {
      const adminWhere: any = {};
      if (search && search.trim()) {
        const q = search.trim();
        adminWhere.OR = [
          { name: { contains: q } },
          { email: { contains: q } }
        ];
      }
      const admins = await this.prisma.admin.findMany({
        where: adminWhere,
        orderBy: { createdAt: 'desc' }
      });
      const formattedAdmins = admins.map(a => ({
        id: a.id,
        name: a.name || 'Executive Administrator',
        email: a.email,
        mobile: 'Authorized System Contact',
        role: a.role || 'SUPER_ADMIN',
        isActive: true,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        _count: { properties: 0 }
      }));
      return { success: true, count: formattedAdmins.length, customers: formattedAdmins };
    }

    // 2. Query User table
    const where: any = {};

    if (cleanRole && cleanRole !== 'ALL') {
      where.role = cleanRole;
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

    // 3. If querying ALL customers (and not filtering by isNew or specific role), include Admins
    if ((!cleanRole || cleanRole === 'ALL') && isNew !== 'true') {
      const adminWhere: any = {};
      if (search && search.trim()) {
        const q = search.trim();
        adminWhere.OR = [
          { name: { contains: q } },
          { email: { contains: q } }
        ];
      }
      const admins = await this.prisma.admin.findMany({
        where: adminWhere,
        orderBy: { createdAt: 'desc' }
      });
      const formattedAdmins = admins.map(a => ({
        id: a.id,
        name: a.name || 'Executive Administrator',
        email: a.email,
        mobile: 'Authorized System Contact',
        role: a.role || 'SUPER_ADMIN',
        isActive: true,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        _count: { properties: 0 }
      }));
      const combined = [...formattedAdmins, ...customers];
      return { success: true, count: combined.length, customers: combined };
    }

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
    if (customer) {
      return { success: true, customer };
    }

    // Check admin table
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (admin) {
      return {
        success: true,
        customer: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          mobile: 'Authorized System Contact',
          role: admin.role || 'SUPER_ADMIN',
          isActive: true,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
          properties: [],
          _count: { properties: 0 }
        }
      };
    }

    throw new NotFoundException('Account/Customer not found');
  }

  async update(id: string, data: { name?: string; mobile?: string; role?: string; isActive?: boolean }) {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (existingUser) {
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.mobile ? { mobile: data.mobile.trim() } : {}),
          ...(data.role ? { role: data.role.toUpperCase() } : {}),
          ...(typeof data.isActive === 'boolean' ? { isActive: data.isActive } : {})
        }
      });
      return { success: true, message: 'User updated successfully', customer: updated };
    }

    const existingAdmin = await this.prisma.admin.findUnique({ where: { id } });
    if (existingAdmin) {
      const updated = await this.prisma.admin.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.role ? { role: data.role.toUpperCase() } : {})
        }
      });
      return { success: true, message: 'Admin profile updated successfully', customer: updated };
    }

    throw new NotFoundException('User or Administrator not found');
  }

  async toggleStatus(id: string, status?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      const existingAdmin = await this.prisma.admin.findUnique({ where: { id } });
      if (existingAdmin) {
        return { success: true, message: 'Admin accounts remain permanently active', customer: existingAdmin };
      }
      throw new NotFoundException('User not found');
    }
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
      message: `User ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      customer: updated
    };
  }

  async delete(id: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (existingUser) {
      await this.prisma.user.delete({ where: { id } });
      return { success: true, message: 'User deleted successfully' };
    }
    const existingAdmin = await this.prisma.admin.findUnique({ where: { id } });
    if (existingAdmin) {
      const totalAdmins = await this.prisma.admin.count();
      if (totalAdmins <= 1) {
        return { success: false, message: 'Cannot delete the primary Super Administrator account.' };
      }
      await this.prisma.admin.delete({ where: { id } });
      return { success: true, message: 'Administrator account removed successfully' };
    }
    return { success: true, message: 'Record deleted successfully' };
  }
}
