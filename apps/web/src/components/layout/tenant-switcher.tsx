'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@savspot/ui';
import { useAuth } from '@/hooks/use-auth';

export function TenantSwitcher() {
  const { user, activeTenantId, setActiveTenant } = useAuth();

  if (!user || user.memberships.length <= 1) {
    return null;
  }

  return (
    <div className="px-3 py-2">
      <Select value={activeTenantId ?? undefined} onValueChange={setActiveTenant}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>
        <SelectContent>
          {user.memberships.map((m) => (
            <SelectItem key={m.tenantId} value={m.tenantId}>
              {m.tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
