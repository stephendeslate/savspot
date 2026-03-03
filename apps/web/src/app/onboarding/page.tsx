'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Scissors,
  Music,
  Dumbbell,
  Briefcase,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const BUSINESS_TYPES = [
  { value: 'VENUE', label: 'Venue', icon: Building2, description: 'Event spaces, conference rooms, coworking' },
  { value: 'SALON', label: 'Salon', icon: Scissors, description: 'Hair, nails, beauty, spa services' },
  { value: 'STUDIO', label: 'Studio', icon: Music, description: 'Photography, recording, art studios' },
  { value: 'FITNESS', label: 'Fitness', icon: Dumbbell, description: 'Gyms, yoga, personal training' },
  { value: 'PROFESSIONAL', label: 'Professional', icon: Briefcase, description: 'Consulting, coaching, tutoring' },
  { value: 'OTHER', label: 'Other', icon: MoreHorizontal, description: 'Any other service business' },
] as const;

type BusinessType = (typeof BUSINESS_TYPES)[number]['value'];

const STEPS = [
  { number: 1, label: 'Business Type' },
  { number: 2, label: 'Business Profile' },
  { number: 3, label: 'Review & Create' },
];

const profileSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  description: z.string().optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  country: z.string().min(2, 'Country is required'),
  currency: z.string().min(3, 'Currency is required').max(3, 'Currency must be 3 characters'),
  contactEmail: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { loadUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      description: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      country: '',
      currency: 'USD',
      contactEmail: '',
      contactPhone: '',
    },
  });

  const handleNext = () => {
    if (currentStep === 1 && !selectedType) return;
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleProfileNext = handleSubmit(() => {
    handleNext();
  });

  const handleCreate = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const profile = getValues();

      // Create the tenant
      const tenant = await apiClient.post<{ id: string }>('/api/tenants', {
        name: profile.name,
        description: profile.description || undefined,
        timezone: profile.timezone,
        country: profile.country,
        currency: profile.currency,
        contactEmail: profile.contactEmail || undefined,
        contactPhone: profile.contactPhone || undefined,
        category: selectedType,
      });

      // Apply business preset
      await apiClient.post(`/api/tenants/${tenant.id}/apply-preset`, {
        category: selectedType,
      });

      // Reload user to get the new tenantId
      await loadUser();

      // Redirect to dashboard
      router.push(ROUTES.DASHBOARD);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step) => (
          <div key={step.number} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                currentStep === step.number
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > step.number
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {currentStep > step.number ? (
                <Check className="h-4 w-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                'hidden text-sm sm:inline',
                currentStep === step.number
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
            {step.number < STEPS.length && (
              <div className="mx-2 h-px w-8 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Business Type */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              What type of business do you run?
            </CardTitle>
            <CardDescription>
              Select the category that best describes your business. This helps
              us set up the right defaults for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BUSINESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={cn(
                    'flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center transition-colors hover:bg-accent/50',
                    selectedType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted/50',
                  )}
                >
                  <type.icon className={cn(
                    'h-8 w-8',
                    selectedType === type.value
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  )} />
                  <div>
                    <p className="font-medium">{type.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleNext}
                disabled={!selectedType}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Business Profile */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Business Profile</CardTitle>
            <CardDescription>
              Tell us about your business. You can always change these later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileNext} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Bella's Beauty Studio"
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone *</Label>
                  <Select id="timezone" {...register('timezone')}>
                    <option value="">Select timezone</option>
                    <option value="America/New_York">Eastern Time (US)</option>
                    <option value="America/Chicago">Central Time (US)</option>
                    <option value="America/Denver">Mountain Time (US)</option>
                    <option value="America/Los_Angeles">Pacific Time (US)</option>
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
                  <Label htmlFor="country">Country *</Label>
                  <Select id="country" {...register('country')}>
                    <option value="">Select country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                    <option value="IN">India</option>
                    <option value="BR">Brazil</option>
                    <option value="MX">Mexico</option>
                  </Select>
                  {errors.country && (
                    <p className="text-sm text-destructive">
                      {errors.country.message}
                    </p>
                  )}
                </div>
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

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit">
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Create */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Review & Create</CardTitle>
            <CardDescription>
              Confirm your details and create your business.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Business Type Review */}
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                  Business Type
                </h4>
                <div className="flex items-center gap-3">
                  {selectedType && (() => {
                    const typeInfo = BUSINESS_TYPES.find(
                      (t) => t.value === selectedType,
                    );
                    if (!typeInfo) return null;
                    return (
                      <>
                        <typeInfo.icon className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{typeInfo.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {typeInfo.description}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Business Profile Review */}
              <div className="rounded-lg border p-4">
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                  Business Profile
                </h4>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Name</dt>
                    <dd className="font-medium">{getValues('name')}</dd>
                  </div>
                  {getValues('description') && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm text-muted-foreground">
                        Description
                      </dt>
                      <dd className="text-sm">{getValues('description')}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-muted-foreground">Timezone</dt>
                    <dd className="text-sm">{getValues('timezone')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Country</dt>
                    <dd className="text-sm">{getValues('country')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Currency</dt>
                    <dd className="text-sm">{getValues('currency')}</dd>
                  </div>
                  {getValues('contactEmail') && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Email</dt>
                      <dd className="text-sm">{getValues('contactEmail')}</dd>
                    </div>
                  )}
                  {getValues('contactPhone') && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Phone</dt>
                      <dd className="text-sm">{getValues('contactPhone')}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Business'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
