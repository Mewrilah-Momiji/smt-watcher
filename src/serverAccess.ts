import { API_BASE } from './core/senderLookup';

export interface PermissionsApi {
  request(permissions: { origins: string[] }): Promise<boolean>;
}

/**
 * Asks Thunderbird for access to the server before the first request. An update that moves the server to a new
 * address does not ask for it by itself, so the access may be missing. Thunderbird answers at once, without a
 * dialog, when access is already granted.
 */
export function requestAccess(permissions: PermissionsApi | undefined, base: string): Promise<boolean> {
  if (!permissions || !URL.canParse(base)) return Promise.resolve(true);
  return permissions.request({ origins: [`${new URL(base).origin}/*`] }).catch(() => false);
}

/** Call it directly from a click, before anything else is awaited, as Thunderbird only asks during user input. */
export function requestServerAccess(): Promise<boolean> {
  if (import.meta.env.MODE !== 'thunderbird') return Promise.resolve(true);
  const permissions = (globalThis as { messenger?: { permissions?: PermissionsApi } }).messenger?.permissions;
  return requestAccess(permissions, API_BASE);
}
