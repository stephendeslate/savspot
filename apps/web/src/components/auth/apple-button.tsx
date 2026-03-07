'use client';

import { API_URL } from '@/lib/constants';

interface AppleButtonProps {
  label?: string;
}

export function AppleButton({
  label = 'Sign in with Apple',
}: AppleButtonProps) {
  const appleAuthUrl = `${API_URL}/api/auth/apple`;

  return (
    <a
      href={appleAuthUrl}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border bg-black px-4 py-2 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
      {label}
    </a>
  );
}
