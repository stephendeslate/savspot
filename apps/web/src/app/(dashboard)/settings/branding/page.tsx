'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HexColorPicker } from 'react-colorful';
import {
  ArrowLeft,
  ExternalLink,
  ImagePlus,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea, Separator, Skeleton } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';
import { RequireRole } from '@/components/rbac/require-role';

// ---------- Types ----------

interface TenantBranding {
  id: string;
  slug: string;
  name: string;
  brandColor: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  description: string | null;
  category: string | null;
  categoryLabel: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  VENUE: 'Venue / Event Space',
  SALON: 'Salon / Barbershop',
  STUDIO: 'Studio',
  FITNESS: 'Fitness / Wellness',
  PROFESSIONAL: 'Professional Services',
  OTHER: 'Other',
};

interface PresignedUrlResponse {
  url: string;
  key: string;
  publicUrl: string;
}

// ---------- Schema ----------

const brandingSchema = z.object({
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional()
    .or(z.literal('')),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  categoryLabel: z.string().max(50, 'Category label must be 50 characters or less').optional().or(z.literal('')),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

// ---------- Helpers ----------

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

// ---------- Component ----------

export default function BrandingSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tenant, setTenant] = useState<TenantBranding | null>(null);

  // Brand color state (controlled outside form for color picker sync)
  const [brandColor, setBrandColor] = useState('#6366f1');

  // Image upload state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
  });

  // Fetch tenant data
  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    const fetchTenant = async () => {
      try {
        const data = await apiClient.get<TenantBranding>(
          `/api/tenants/${tenantId}`,
        );
        setTenant(data);
        setBrandColor(data.brandColor || '#6366f1');
        setLogoUrl(data.logoUrl);
        setCoverPhotoUrl(data.coverPhotoUrl);
        reset({
          brandColor: data.brandColor || '',
          description: data.description || '',
          categoryLabel: data.categoryLabel || '',
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load branding settings',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTenant();
  }, [tenantId, reset]);

  // Sync color picker with form
  const handleColorChange = useCallback(
    (color: string) => {
      setBrandColor(color);
      setValue('brandColor', color, { shouldValidate: true });
    },
    [setValue],
  );

  const handleHexInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      if (!value.startsWith('#')) {
        value = '#' + value;
      }
      setBrandColor(value);
      if (isValidHex(value)) {
        setValue('brandColor', value, { shouldValidate: true });
      }
    },
    [setValue],
  );

  // File upload handler
  const uploadFile = useCallback(
    async (
      file: File,
      type: 'logo' | 'cover',
    ): Promise<string | null> => {
      if (!tenantId) return null;

      const setUploading = type === 'logo' ? setUploadingLogo : setUploadingCover;
      setUploading(true);
      setError(null);

      try {
        // Get presigned URL
        const presigned = await apiClient.post<PresignedUrlResponse>(
          '/api/upload/presigned-url',
          {
            filename: file.name,
            contentType: file.type,
            purpose: type === 'logo' ? 'tenant-logo' : 'tenant-cover',
          },
        );

        // Upload to presigned URL
        await fetch(presigned.url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        return presigned.publicUrl;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : `Failed to upload ${type}`,
        );
        return null;
      } finally {
        setUploading(false);
      }
    },
    [tenantId],
  );

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const url = await uploadFile(file, 'logo');
      if (url) {
        setLogoUrl(url);
      }
      // Reset input
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    },
    [uploadFile],
  );

  const handleCoverUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const url = await uploadFile(file, 'cover');
      if (url) {
        setCoverPhotoUrl(url);
      }
      // Reset input
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    },
    [uploadFile],
  );

  // Save all branding changes
  const onSubmit = async (values: BrandingFormValues) => {
    if (!tenantId) return;
    setError(null);
    setSuccess(false);

    try {
      await apiClient.patch(`/api/tenants/${tenantId}`, {
        brandColor: values.brandColor || null,
        logoUrl: logoUrl || null,
        coverPhotoUrl: coverPhotoUrl || null,
        description: values.description || null,
        categoryLabel: values.categoryLabel || null,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save branding changes',
      );
    }
  };

  // ---------- Loading ----------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
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
          Please complete onboarding to set up your business.
        </p>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <RequireRole minimum="ADMIN">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(ROUTES.SETTINGS)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Branding</h2>
          <p className="text-sm text-muted-foreground">
            Customize your booking page appearance
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
          Branding updated successfully.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Brand Color */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Brand Color</CardTitle>
            <CardDescription>
              Choose a primary color for your booking page buttons and accents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="shrink-0">
                <HexColorPicker
                  color={brandColor}
                  onChange={handleColorChange}
                  style={{ width: 200, height: 200 }}
                />
              </div>

              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brandColor">Hex Code</Label>
                  <Input
                    id="brandColor"
                    value={brandColor}
                    onChange={handleHexInputChange}
                    placeholder="#6366f1"
                    maxLength={7}
                    className="max-w-[200px] font-mono"
                  />
                  {errors.brandColor && (
                    <p className="text-sm text-destructive">
                      {errors.brandColor.message}
                    </p>
                  )}
                </div>

                {/* Color preview */}
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-md border"
                      style={{ backgroundColor: brandColor }}
                    />
                    <Button
                      type="button"
                      className="pointer-events-none"
                      style={{
                        backgroundColor: isValidHex(brandColor) ? brandColor : '#6366f1',
                        borderColor: isValidHex(brandColor) ? brandColor : '#6366f1',
                        color: '#ffffff',
                      }}
                    >
                      Book Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden input for form registration */}
            <input type="hidden" {...register('brandColor')} />
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Logo</CardTitle>
            <CardDescription>
              Upload your business logo displayed on the booking page header
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* Logo preview */}
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                {logoUrl ? (
                  <>
                    <Image
                      src={logoUrl}
                      alt="Business logo"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, at least 200x200px. PNG or JPG.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cover Photo */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Cover Photo</CardTitle>
            <CardDescription>
              A banner image displayed at the top of your booking page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Cover preview */}
              <div className="relative h-40 w-full overflow-hidden rounded-lg border bg-muted">
                {coverPhotoUrl ? (
                  <>
                    <Image
                      src={coverPhotoUrl}
                      alt="Cover photo"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => setCoverPhotoUrl(null)}
                      className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2">
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      No cover photo uploaded
                    </p>
                  </div>
                )}
              </div>

              <div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                >
                  {uploadingCover ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Cover Photo
                    </>
                  )}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Recommended: 1200x400px or wider. PNG or JPG.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Page Description */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Booking Page Description</CardTitle>
            <CardDescription>
              A custom message shown to clients on your public booking page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Textarea
                id="description"
                placeholder="Tell your clients about your business, specialties, or what to expect..."
                rows={4}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum 500 characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Category Label */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Business Category Label</CardTitle>
            <CardDescription>
              Customize how your business type appears on your booking page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="categoryLabel">Display Label</Label>
              <Input
                id="categoryLabel"
                placeholder={
                  tenant?.category
                    ? CATEGORY_LABELS[tenant.category] ?? tenant.category
                    : 'e.g. Barbershop'
                }
                maxLength={50}
                {...register('categoryLabel')}
              />
              {errors.categoryLabel && (
                <p className="text-sm text-destructive">
                  {errors.categoryLabel.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {tenant?.category
                  ? `Default: ${CATEGORY_LABELS[tenant.category] ?? tenant.category}. Leave blank to use the default.`
                  : 'Override the default category label shown on your booking page.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          {tenant?.slug && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                window.open(`/book/${tenant.slug}`, '_blank')
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview Booking Page
            </Button>
          )}

          <Button type="submit" disabled={isSubmitting || uploadingLogo || uploadingCover}>
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
      </form>
    </div>
    </RequireRole>
  );
}
