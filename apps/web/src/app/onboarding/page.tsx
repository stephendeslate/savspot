'use client';

import { useState, useEffect, useCallback } from 'react';
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
  RotateCcw,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const ONBOARDING_STORAGE_KEY = 'savspot_onboarding_progress';

interface SavedProgress {
  step: number;
  selectedType: BusinessType | null;
  formData: Partial<ProfileFormValues>;
}

function loadSavedProgress(): SavedProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedProgress;
  } catch {
    return null;
  }
}

function clearSavedProgress() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

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
    reset,
    control,
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

  // Restore saved progress on mount
  useEffect(() => {
    const saved = loadSavedProgress();
    if (saved) {
      setCurrentStep(saved.step);
      if (saved.selectedType) setSelectedType(saved.selectedType);
      if (saved.formData) {
        reset({
          name: '',
          description: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          country: '',
          currency: 'USD',
          contactEmail: '',
          contactPhone: '',
          ...saved.formData,
        });
      }
    }
  }, [reset]);

  // Persist progress on step/type changes
  const saveProgress = useCallback(() => {
    try {
      const progress: SavedProgress = {
        step: currentStep,
        selectedType,
        formData: getValues(),
      };
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // localStorage may be unavailable — silently ignore
    }
  }, [currentStep, selectedType, getValues]);

  useEffect(() => {
    saveProgress();
  }, [saveProgress]);

  const handleStartOver = () => {
    clearSavedProgress();
    setCurrentStep(1);
    setSelectedType(null);
    setError(null);
    reset({
      name: '',
      description: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      country: '',
      currency: 'USD',
      contactEmail: '',
      contactPhone: '',
    });
  };

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

      // Clear saved onboarding progress
      clearSavedProgress();

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
      {/* Start Over button */}
      {currentStep > 1 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleStartOver}
            className="text-muted-foreground"
          >
            <RotateCcw className="mr-2 h-3 w-3" />
            Start Over
          </Button>
        </div>
      )}

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
                  <Controller
                    control={control}
                    name="timezone"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="timezone" className="w-full">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time (US)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (US)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (US)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (US)</SelectItem>
                          <SelectItem value="America/Anchorage">Alaska Time (US)</SelectItem>
                          <SelectItem value="Pacific/Honolulu">Hawaii Time (US)</SelectItem>
                          <SelectItem value="Europe/London">GMT (London)</SelectItem>
                          <SelectItem value="Europe/Paris">CET (Paris)</SelectItem>
                          <SelectItem value="Europe/Berlin">CET (Berlin)</SelectItem>
                          <SelectItem value="Asia/Tokyo">JST (Tokyo)</SelectItem>
                          <SelectItem value="Asia/Shanghai">CST (Shanghai)</SelectItem>
                          <SelectItem value="Asia/Kolkata">IST (Kolkata)</SelectItem>
                          <SelectItem value="Australia/Sydney">AEST (Sydney)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.timezone && (
                    <p className="text-sm text-destructive">
                      {errors.timezone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="country" className="w-full">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="JP">Japan</SelectItem>
                          <SelectItem value="IN">India</SelectItem>
                          <SelectItem value="BR">Brazil</SelectItem>
                          <SelectItem value="MX">Mexico</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.country && (
                    <p className="text-sm text-destructive">
                      {errors.country.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="currency" className="w-full">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                        <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                        <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                        <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
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
