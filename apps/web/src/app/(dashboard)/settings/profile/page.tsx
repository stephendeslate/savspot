'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';

interface TenantData {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  timezone: string;
  currency: string;
}

const profileSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  description: z.string().optional(),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  contactEmail: z
    .string()
    .email('Please enter a valid email')
    .optional()
    .or(z.literal('')),
  contactPhone: z.string().optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(3).max(3),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function BusinessProfilePage() {
  const { tenantId } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    const fetchTenant = async () => {
      try {
        const data = await apiClient.get<TenantData>(
          `/api/tenants/${tenantId}`,
        );
        reset({
          name: data.name,
          description: data.description ?? '',
          logoUrl: data.logoUrl ?? '',
          contactEmail: data.contactEmail ?? '',
          contactPhone: data.contactPhone ?? '',
          timezone: data.timezone,
          currency: data.currency,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load business profile',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTenant();
  }, [tenantId, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!tenantId) return;
    setError(null);
    setSuccess(false);

    try {
      await apiClient.patch(`/api/tenants/${tenantId}`, {
        name: values.name,
        description: values.description || undefined,
        logoUrl: values.logoUrl || undefined,
        contactEmail: values.contactEmail || undefined,
        contactPhone: values.contactPhone || undefined,
        timezone: values.timezone,
        currency: values.currency,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update profile. Please try again.',
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-medium">No business found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Please complete onboarding to set up your business profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Business Profile</h2>
        <p className="text-sm text-muted-foreground">
          Update your business information and branding
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
          Profile updated successfully.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Information</CardTitle>
            <CardDescription>
              These details are shown to your clients on your booking page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                placeholder="Your business name"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell clients about your business..."
                rows={3}
                {...register('description')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                type="url"
                placeholder="https://example.com/logo.png"
                {...register('logoUrl')}
              />
              {errors.logoUrl && (
                <p className="text-sm text-destructive">
                  {errors.logoUrl.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="contact@yourbusiness.com"
                  {...register('contactEmail')}
                />
                {errors.contactEmail && (
                  <p className="text-sm text-destructive">
                    {errors.contactEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  {...register('contactPhone')}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone *</Label>
                <Select id="timezone" {...register('timezone')}>
                  <option value="">Select timezone</option>
                  <option value="America/New_York">Eastern Time (US)</option>
                  <option value="America/Chicago">Central Time (US)</option>
                  <option value="America/Denver">Mountain Time (US)</option>
                  <option value="America/Los_Angeles">
                    Pacific Time (US)
                  </option>
                  <option value="America/Anchorage">Alaska Time (US)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (US)</option>
                  <option value="Europe/London">GMT (London)</option>
                  <option value="Europe/Paris">CET (Paris)</option>
                  <option value="Europe/Berlin">CET (Berlin)</option>
                  <option value="Asia/Tokyo">JST (Tokyo)</option>
                  <option value="Asia/Shanghai">CST (Shanghai)</option>
                  <option value="Asia/Kolkata">IST (Kolkata)</option>
                  <option value="Australia/Sydney">AEST (Sydney)</option>
                </Select>
                {errors.timezone && (
                  <p className="text-sm text-destructive">
                    {errors.timezone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select id="currency" {...register('currency')}>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="BRL">BRL - Brazilian Real</option>
                  <option value="MXN">MXN - Mexican Peso</option>
                </Select>
                {errors.currency && (
                  <p className="text-sm text-destructive">
                    {errors.currency.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
