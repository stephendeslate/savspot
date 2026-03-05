'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';

type AcceptState = 'loading' | 'success' | 'error';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<AcceptState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('No invitation token provided.');
      return;
    }

    const accept = async () => {
      try {
        await apiClient.post('/api/auth/accept-invitation', { token });
        setState('success');
      } catch (err) {
        setState('error');
        if (err instanceof ApiError) {
          if (err.status === 400) {
            setErrorMessage(
              'This invitation link is invalid or has expired.',
            );
          } else if (err.status === 409) {
            setErrorMessage(
              'This invitation has already been accepted.',
            );
          } else {
            setErrorMessage('Something went wrong. Please try again.');
          }
        } else {
          setErrorMessage('Something went wrong. Please try again.');
        }
      }
    };

    void accept();
  }, [token]);

  return (
    <div className="text-center">
      {state === 'loading' && (
        <div className="space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">
            Accepting invitation...
          </h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we process your invitation.
          </p>
        </div>
      )}

      {state === 'success' && (
        <div className="space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
          <h2 className="text-xl font-semibold">Invitation accepted</h2>
          <p className="text-sm text-muted-foreground">
            You have been added to the team. Sign in to access your
            account.
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
          <h2 className="text-xl font-semibold">Invitation failed</h2>
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

export default function AcceptInvitationPage() {
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
      <AcceptInvitationContent />
    </Suspense>
  );
}
