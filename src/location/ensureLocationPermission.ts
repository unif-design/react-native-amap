import { getPermissionAccess } from '../host/permissions';
export async function ensureLocationPermission(
  active: () => boolean,
): Promise<boolean> {
  const permissions = getPermissionAccess();
  let [entry] = await permissions.read(['location']);
  if (!active()) return false;
  if (entry?.status === 'requestable') {
    await permissions.request('location');
    if (!active()) return false;
    [entry] = await permissions.read(['location']);
  }
  return entry?.status === 'granted' || entry?.status === 'limited';
}
