import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ADMIN_MODULE_PERMISSIONS } from '../common/permissions/permissions.constant';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  // 1. Get available module permission list
  getModulesList() {
    return {
      success: true,
      modules: ADMIN_MODULE_PERMISSIONS,
    };
  }

  // 2. Find all admin and staff accounts
  async findAll(params?: { role?: string; search?: string; status?: string }) {
    const where: any = {};

    if (params?.role && params.role !== 'ALL') {
      where.role = params.role.toUpperCase();
    }

    if (params?.status && params.status !== 'ALL') {
      where.isActive = params.status === 'ACTIVE';
    }

    if (params?.search) {
      const q = params.search.trim().toLowerCase();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
      ];
    }

    const admins = await this.prisma.admin.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const formatted = admins.map((admin) => {
      let parsedPermissions: string[] = [];
      if (admin.permissions) {
        try {
          parsedPermissions = JSON.parse(admin.permissions);
        } catch {
          parsedPermissions = [];
        }
      }
      return {
        ...admin,
        permissions: parsedPermissions,
        isActive: Boolean(admin.isActive),
      };
    });

    return {
      success: true,
      total: formatted.length,
      staff: formatted,
    };
  }

  // 3. Find one admin/staff
  async findOne(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Administrator or staff user not found');
    }

    let parsedPermissions: string[] = [];
    if (admin.permissions) {
      try {
        parsedPermissions = JSON.parse(admin.permissions);
      } catch {
        parsedPermissions = [];
      }
    }

    return {
      success: true,
      staff: {
        ...admin,
        permissions: parsedPermissions,
        isActive: Boolean(admin.isActive),
      },
    };
  }

  // 4. Create Administrator or Staff account
  async create(dto: CreateStaffDto) {
    const rawEmail = (dto.email || dto.username || '').toLowerCase().trim();
    if (!rawEmail) {
      throw new BadRequestException('Username / Email is required');
    }

    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Full name is required');
    }

    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const existing = await this.prisma.admin.findUnique({
      where: { email: rawEmail },
    });

    if (existing) {
      throw new BadRequestException('An administrator with this email/username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const role = (dto.role || 'STAFF').toUpperCase();
    const permissionsJson = dto.permissions && Array.isArray(dto.permissions)
      ? JSON.stringify(dto.permissions)
      : JSON.stringify([]);

    const created = await this.prisma.admin.create({
      data: {
        email: rawEmail,
        name: dto.name.trim(),
        passwordHash,
        role,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        permissions: permissionsJson,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = created.permissions ? JSON.parse(created.permissions) : [];
    } catch {
      parsedPermissions = [];
    }

    return {
      success: true,
      message: `${role === 'ADMIN' ? 'Administrator' : role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff'} account created successfully`,
      staff: {
        ...created,
        permissions: parsedPermissions,
        isActive: Boolean(created.isActive),
      },
    };
  }

  // 5. Update Administrator or Staff account
  async update(id: string, dto: UpdateStaffDto) {
    const existing = await this.prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    const updateData: any = {};

    if (dto.name) {
      updateData.name = dto.name.trim();
    }

    if (dto.email) {
      const cleanEmail = dto.email.toLowerCase().trim();
      if (cleanEmail !== existing.email) {
        const dup = await this.prisma.admin.findUnique({ where: { email: cleanEmail } });
        if (dup) throw new BadRequestException('Email/username is already in use by another account');
        updateData.email = cleanEmail;
      }
    }

    if (dto.role) {
      updateData.role = dto.role.toUpperCase();
    }

    if (dto.permissions !== undefined && Array.isArray(dto.permissions)) {
      updateData.permissions = JSON.stringify(dto.permissions);
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = updated.permissions ? JSON.parse(updated.permissions) : [];
    } catch {
      parsedPermissions = [];
    }

    return {
      success: true,
      message: 'Account details and permissions updated successfully',
      staff: {
        ...updated,
        permissions: parsedPermissions,
        isActive: Boolean(updated.isActive),
      },
    };
  }

  // 6. Reset Staff / Admin Password
  async resetPassword(id: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    const existing = await this.prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.admin.update({
      where: { id },
      data: { passwordHash },
    });

    return {
      success: true,
      message: `Password for ${existing.name} (${existing.email}) updated successfully`,
    };
  }

  // 7. Toggle Active Status
  async toggleStatus(id: string, newStatus?: boolean) {
    const existing = await this.prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    const targetStatus = newStatus !== undefined ? newStatus : !existing.isActive;

    // Prevent deactivating if it's the only active Super Admin
    if (!targetStatus && existing.role === 'SUPER_ADMIN') {
      const totalActiveSuperAdmins = await this.prisma.admin.count({
        where: { role: 'SUPER_ADMIN', isActive: true },
      });
      if (totalActiveSuperAdmins <= 1) {
        throw new ForbiddenException('Cannot deactivate the only active Super Admin account');
      }
    }

    const updated = await this.prisma.admin.update({
      where: { id },
      data: { isActive: targetStatus },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        permissions: true,
      },
    });

    return {
      success: true,
      message: `Account has been ${targetStatus ? 'activated' : 'deactivated'}`,
      staff: {
        ...updated,
        isActive: Boolean(updated.isActive),
      },
    };
  }

  // 8. Delete Administrator / Staff
  async delete(id: string, currentAdminId?: string) {
    if (currentAdminId && id === currentAdminId) {
      throw new ForbiddenException('You cannot delete your own account while logged in');
    }

    const existing = await this.prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    if (existing.role === 'SUPER_ADMIN') {
      const totalSuperAdmins = await this.prisma.admin.count({
        where: { role: 'SUPER_ADMIN' },
      });
      if (totalSuperAdmins <= 1) {
        throw new ForbiddenException('Cannot delete the primary Super Admin account');
      }
    }

    await this.prisma.admin.delete({ where: { id } });

    return {
      success: true,
      message: `Account ${existing.name} (${existing.email}) deleted successfully`,
    };
  }
}
