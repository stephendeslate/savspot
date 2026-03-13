'use client';

import { ShieldAlert } from 'lucide-react';

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Access Denied</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        You do not have permission to view this page. Contact your account owner
        to request access.
      </p>
    </div>
  );
}
