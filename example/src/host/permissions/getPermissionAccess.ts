import { createPermissionAccess } from './createPermissionAccess';
import type { PermissionAccess } from './types';
let access: PermissionAccess | undefined;
export function getPermissionAccess(): PermissionAccess {
  access ??= createPermissionAccess();
  return access;
}
