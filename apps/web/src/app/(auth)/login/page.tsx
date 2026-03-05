import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign In - SavSpot',
  description: 'Sign in to your SavSpot account',
};

export default function LoginPage() {
  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your account
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
