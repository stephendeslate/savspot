'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/**
 * Hook that syncs a set of filter values with URL search params.
 * Returns current params from URL and a setter to update them.
 */
export function useUrlState<T extends Record<string, string>>(
  defaults: T,
): [T, (updates: Partial<T>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = {} as T;
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    current[key] = (searchParams.get(key as string) ?? defaults[key]) as T[keyof T];
  }

  const setParams = useCallback(
    (updates: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '' || value === defaults[key as keyof T]) {
          params.delete(key);
        } else {
          params.set(key, value as string);
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, pathname, searchParams, defaults],
  );

  return [current, setParams];
}
