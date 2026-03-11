export interface PermissionSet {
  bookings: { view: boolean; create: boolean; edit: boolean; cancel: boolean };
  clients: { view: boolean; edit: boolean };
  services: { manage: boolean };
  payments: { view: boolean; process: boolean; refund: boolean };
  team: { manage: boolean };
  settings: { manage: boolean };
  reports: { view: boolean };
}

export type PermissionResource = keyof PermissionSet;
export type PermissionAction<R extends PermissionResource> = keyof PermissionSet[R];

export const FULL_PERMISSIONS: PermissionSet = {
  bookings: { view: true, create: true, edit: true, cancel: true },
  clients: { view: true, edit: true },
  services: { manage: true },
  payments: { view: true, process: true, refund: true },
  team: { manage: true },
  settings: { manage: true },
  reports: { view: true },
};

export const STAFF_DEFAULT_PERMISSIONS: PermissionSet = {
  bookings: { view: true, create: true, edit: true, cancel: false },
  clients: { view: true, edit: false },
  services: { manage: false },
  payments: { view: true, process: false, refund: false },
  team: { manage: false },
  settings: { manage: false },
  reports: { view: false },
};

export const ROLE_DEFAULTS: Record<string, PermissionSet> = {
  OWNER: FULL_PERMISSIONS,
  ADMIN: FULL_PERMISSIONS,
  STAFF: STAFF_DEFAULT_PERMISSIONS,
};
