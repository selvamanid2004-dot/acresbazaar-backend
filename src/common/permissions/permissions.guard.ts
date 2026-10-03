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

    // Super Admin has unrestricted bypass across all modules & actions
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
    const hasPermission = requiredPermissions.some((requiredPerm) => {
      return this.evaluatePermission(userPermissions, requiredPerm);
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Permission Denied: You do not have permission for this action (${requiredPermissions.join(', ')})`,
      );
    }

    return true;
  }

  private evaluatePermission(userPermissions: string[], required: string): boolean {
    // 1. Direct exact match (e.g. 'properties.delete' or 'properties')
    if (userPermissions.includes(required)) return true;

    // 2. If required is an action e.g. "properties.delete"
    if (required.includes('.')) {
      const [moduleName, actionName] = required.split('.');

      // If user has full access to the parent module (e.g. 'properties')
      if (userPermissions.includes(moduleName)) return true;

      // Group/Hierarchical fallbacks
      if (['gold_properties', 'premium_properties', 'snap_properties'].includes(moduleName)) {
        if (userPermissions.includes('properties')) return true;
        if (userPermissions.includes(`properties.${actionName}`)) return true;
      }

      if (['buyers', 'sellers', 'dealers', 'common_people'].includes(moduleName)) {
        if (userPermissions.includes('customers')) return true;
        if (userPermissions.includes(`customers.${actionName}`)) return true;
      }

      if (['contact_details', 'logo_management'].includes(moduleName)) {
        if (userPermissions.includes('website_settings')) return true;
        if (userPermissions.includes(`website_settings.${actionName}`)) return true;
      }

      return false;
    }

    // 3. If required is a module-level permission e.g. "properties"
    // User has access if they have the module itself OR any action inside that module
    const hasAnyActionInModule = userPermissions.some(
      (p) => p === required || p.startsWith(`${required}.`),
    );
    if (hasAnyActionInModule) return true;

    // Hierarchical module fallbacks
    if (required === 'buyers' || required === 'sellers' || required === 'dealers' || required === 'common_people') {
      if (userPermissions.includes('customers') || userPermissions.some((p) => p.startsWith('customers.'))) {
        return true;
      }
    }

    if (required === 'gold_properties' || required === 'premium_properties' || required === 'snap_properties' || required === 'bookings') {
      if (userPermissions.includes('properties') || userPermissions.some((p) => p.startsWith('properties.'))) {
        return true;
      }
    }

    if (required === 'contact_details' || required === 'logo_management') {
      if (userPermissions.includes('website_settings') || userPermissions.some((p) => p.startsWith('website_settings.'))) {
        return true;
      }
    }

    return false;
  }
}
