'use client';

import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { Button, Card, CardContent } from '@savspot/ui';

interface UpgradeBannerProps {
  requiredTier?: string;
  feature: string;
  /** When true, shows enterprise license messaging instead of tier upgrade */
  requiresLicense?: boolean;
}

export function UpgradeBanner({ requiredTier, feature, requiresLicense }: UpgradeBannerProps) {
  const message = requiresLicense
    ? `${feature} is an enterprise feature. Get a license key to unlock it.`
    : `Upgrade your subscription to access ${feature.toLowerCase()} and other advanced features.`;

  const heading = requiresLicense
    ? `${feature} requires an Enterprise license`
    : `${feature} requires ${requiredTier}`;

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">{heading}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
        <Link href={requiresLicense ? '/pricing' : '/settings/billing'}>
          <Button className="mt-4" size="sm">
            {requiresLicense ? 'View Plans' : 'Upgrade Plan'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
