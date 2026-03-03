'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { API_ROUTES, ROUTES } from '@/lib/constants';

type VerifyState = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerifyState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        await apiClient.post(API_ROUTES.VERIFY_EMAIL, { token });
        setState('success');
      } catch (err) {
        setState('error');
        if (err instanceof ApiError) {
          setErrorMessage(
            err.status === 400
              ? 'This verification link is invalid or has expired.'
              : 'Something went wrong. Please try again.',
          );
        } else {
          setErrorMessage('Something went wrong. Please try again.');
        }
      }
    };

    void verify();
  }, [token]);

  return (
    <div className="text-center">
      {state === 'loading' && (
        <div className="space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Verifying your email...</h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we verify your email address.
          </p>
        </div>
      )}

      {state === 'success' && (
        <div className="space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
          <h2 className="text-xl font-semibold">Email verified</h2>
          <p className="text-sm text-muted-foreground">
            Your email has been successfully verified. You can now sign in.
          </p>
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-4">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Verification failed</h2>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to sign in
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">Loading...</h2>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
