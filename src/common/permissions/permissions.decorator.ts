import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from './permissions.constant';

export const PERMISSIONS_KEY = 'required_permissions';
export const RequirePermissions = (...permissions: (PermissionCode | string)[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
