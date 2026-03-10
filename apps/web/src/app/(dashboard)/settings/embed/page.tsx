'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ClipboardCopy } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface TenantData {
  id: string;
  slug: string;
  name: string;
  brandColor: string | null;
}

// ---------- Constants ----------

const DEFAULT_COLOR = '#6366f1';
const DEFAULT_TEXT = 'Book Now';
const BOOKING_BASE_URL = 'https://savspot.co/book';

// ---------- Component ----------

export default function EmbedSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [isLoading, setIsLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Customization state
  const [buttonColor, setButtonColor] = useState(DEFAULT_COLOR);
  const [buttonText, setButtonText] = useState(DEFAULT_TEXT);
  const [copied, setCopied] = useState(false);
  const [embedType, setEmbedType] = useState<'link' | 'iframe'>('link');

  // Fetch tenant data
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
        setTenant(data);
        if (data.brandColor) {
          setButtonColor(data.brandColor);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load tenant data',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTenant();
  }, [tenantId]);

  // Generate embed code
  const generateEmbedCode = useCallback(() => {
    if (!tenant?.slug) return '';

    const bookingUrl = `${BOOKING_BASE_URL}/${tenant.slug}`;

    if (embedType === 'iframe') {
      return `<iframe src="${bookingUrl}" width="100%" height="700" style="border:none; border-radius:8px;" title="Book an appointment"></iframe>`;
    }

    // Link / redirect mode (FR-EMB-4)
    return `<a href="${bookingUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 24px;font-size:15px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#fff;background-color:${buttonColor};border:none;border-radius:8px;text-decoration:none;cursor:pointer;line-height:1;box-shadow:0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px -1px rgba(0,0,0,0.1)">${buttonText}</a>`;
  }, [tenant?.slug, buttonColor, buttonText, embedType]);

  const embedCode = generateEmbedCode();

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = embedCode;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [embedCode]);

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
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tenantId || !tenant) {
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
          <h2 className="text-lg font-semibold">Embed Widget</h2>
          <p className="text-sm text-muted-foreground">
            Add a &quot;Book Now&quot; button to your website
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customize</CardTitle>
          <CardDescription>
            Adjust how the button looks on your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Embed Type</Label>
            <div className="flex gap-2">
              <Button
                variant={embedType === 'link' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEmbedType('link')}
              >
                Link Button
              </Button>
              <Button
                variant={embedType === 'iframe' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEmbedType('iframe')}
              >
                Iframe
              </Button>
            </div>
          </div>

          {embedType === 'link' && (
          <>
          <div className="space-y-2">
            <Label htmlFor="buttonText">Button Text</Label>
            <Input
              id="buttonText"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value || DEFAULT_TEXT)}
              placeholder={DEFAULT_TEXT}
              maxLength={30}
              className="max-w-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="buttonColor">Button Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="buttonColor"
                value={buttonColor}
                onChange={(e) => setButtonColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border border-input p-0.5"
              />
              <Input
                value={buttonColor}
                onChange={(e) => {
                  let value = e.target.value;
                  if (!value.startsWith('#')) {
                    value = '#' + value;
                  }
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                    setButtonColor(value);
                  }
                }}
                placeholder="#6366f1"
                maxLength={7}
                className="max-w-[140px] font-mono"
              />
            </div>
          </div>
          </>
          )}
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>
            This is how the button will appear on your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8">
            {embedType === 'iframe' ? (
              <div className="w-full text-center text-sm text-muted-foreground">
                <div className="rounded-lg border bg-background p-4">
                  Iframe preview: <code>{BOOKING_BASE_URL}/{tenant.slug}</code>
                </div>
              </div>
            ) : (
              <a
                href={`/book/${tenant.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 24px',
                  fontSize: '15px',
                  fontWeight: '600',
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  color: '#ffffff',
                  backgroundColor: buttonColor,
                  border: 'none',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  lineHeight: '1',
                  boxShadow:
                    '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
                }}
              >
                {buttonText}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embed Code</CardTitle>
          <CardDescription>
            Copy and paste this snippet into your website&apos;s HTML where you
            want the button to appear
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm leading-relaxed">
              <code>{embedCode}</code>
            </pre>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardCopy className="h-4 w-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to use</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>Copy the embed code above</li>
            <li>
              Paste it into your website&apos;s HTML where you want the
              &quot;Book Now&quot; button to appear
            </li>
            <li>
              The button will automatically link to your SavSpot booking page
            </li>
            <li>
              Customize the button color and text above, then re-copy the
              updated code
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
