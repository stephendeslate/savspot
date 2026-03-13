'use client';

import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { Button, Card, CardContent } from '@savspot/ui';

interface UpgradeBannerProps {
  requiredTier: string;
  feature: string;
}

export function UpgradeBanner({ requiredTier, feature }: UpgradeBannerProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">
          {feature} requires {requiredTier}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Upgrade your subscription to access {feature.toLowerCase()} and other
          premium features.
        </p>
        <Link href="/settings/billing">
          <Button className="mt-4" size="sm">
            Upgrade Plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
