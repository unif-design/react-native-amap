import { getAmapHost } from './index';
export function getPermissionAccess() {
  return getAmapHost().getPermissionAccess();
}
