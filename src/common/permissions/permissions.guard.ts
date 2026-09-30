import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Must have authenticated admin user context
    if (!user || user.type !== 'admin') {
      throw new UnauthorizedException('Administrator authorization required');
    }

    // Lookup fresh admin record from database to verify active status & current permissions
    const adminId = user.sub || user.id;
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin user not found');
    }

    if (admin.isActive === false) {
      throw new UnauthorizedException('This administrator account has been deactivated');
    }

    // Attach fresh profile info to request
    request.user.role = admin.role;
    request.user.isActive = admin.isActive;

    // Super Admin has unrestricted bypass across all modules
    if (admin.role === 'SUPER_ADMIN') {
      return true;
    }

    // If endpoint has no specific permission annotation, allow any authenticated active admin
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Parse user permissions
    let userPermissions: string[] = [];
    if (admin.permissions) {
      try {
        userPermissions = JSON.parse(admin.permissions);
      } catch {
        userPermissions = [];
      }
    }

    request.user.permissions = userPermissions;

    // Check if user has ANY of the required permissions for this route
    const hasPermission = requiredPermissions.some((perm) => {
      if (userPermissions.includes(perm)) return true;
      // Hierarchical fallbacks:
      if (perm === 'buyers' && userPermissions.includes('customers')) return true;
      if (perm === 'sellers' && userPermissions.includes('customers')) return true;
      if (perm === 'dealers' && userPermissions.includes('customers')) return true;
      if (perm === 'common_people' && userPermissions.includes('customers')) return true;
      if (perm === 'gold_properties' && userPermissions.includes('properties')) return true;
      if (perm === 'premium_properties' && userPermissions.includes('properties')) return true;
      if (perm === 'snap_properties' && userPermissions.includes('properties')) return true;
      if (perm === 'bookings' && userPermissions.includes('properties')) return true;
      if (perm === 'contact_details' && userPermissions.includes('website_settings')) return true;
      if (perm === 'logo_management' && userPermissions.includes('website_settings')) return true;
      return false;
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access Denied: You do not have permission to access this module (${requiredPermissions.join(', ')})`,
      );
    }

    return true;
  }
}
