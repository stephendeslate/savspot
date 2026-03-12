'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Input, Label } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { API_ROUTES, ROUTES } from '@/lib/constants';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      await apiClient.post(API_ROUTES.FORGOT_PASSWORD, values);
    } catch {
      // Always show success to prevent email enumeration
    }
    setSubmitted(true);
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold">Reset your password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {submitted
            ? 'Check your email for a reset link'
            : 'Enter your email and we will send you a reset link'}
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            If an account exists with that email address, you will receive a
            password reset link shortly.
          </p>
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>

          <div className="text-center">
            <Link
              href={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
