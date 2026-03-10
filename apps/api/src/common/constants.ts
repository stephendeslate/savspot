export const WALK_IN_EMAIL_DOMAIN = 'savspot.co';

export function getWalkInEmail(tenantId: string): string {
  return `walkin+${tenantId}@${WALK_IN_EMAIL_DOMAIN}`;
}
