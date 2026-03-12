'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Label, Separator } from '@savspot/ui';
import { useAuth } from '@/hooks/use-auth';
import { ROUTES } from '@/lib/constants';
import { ApiError } from '@/lib/api-client';
import { GoogleButton } from './google-button';
import { AppleButton } from './apple-button';

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    businessName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      businessName: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setError(null);
      await registerUser({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        businessName: values.businessName || undefined,
      });
      router.push(ROUTES.DASHBOARD);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 409
            ? 'An account with this email already exists'
            : 'Something went wrong. Please try again.',
        );
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <GoogleButton label="Sign up with Google" />
      <AppleButton label="Sign up with Apple" />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              placeholder="John"
              autoComplete="given-name"
              {...register('firstName')}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              autoComplete="family-name"
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

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
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessName">Business name (optional)</Label>
          <Input
            id="businessName"
            placeholder="My Business"
            autoComplete="organization"
            {...register('businessName')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={ROUTES.LOGIN}
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
