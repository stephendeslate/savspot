'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
}

function Avatar({ className, src, alt, fallback, ...props }: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  const initials = React.useMemo(() => {
    if (fallback) return fallback;
    if (!alt) return '?';
    return alt
      .split(' ')
      .map((word) => word.charAt(0))
      .filter((ch) => ch.length > 0)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [alt, fallback]);

  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
        className,
      )}
      {...props}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt ?? ''}
          className="aspect-square h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-sm font-medium text-muted-foreground">
          {initials}
        </div>
      )}
    </div>
  );
}

export { Avatar };
