'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Copy,
  DollarSign,
  Handshake,
  Link2,
  Loader2,
  Percent,
  Users,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { RequireRole } from '@/components/auth/require-role';

// ---------- Types ----------

interface PartnerProfile {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  commissionRate: number;
  totalEarnings: number;
  pendingPayout: number;
  createdAt: string;
}

interface PartnerReferral {
  id: string;
  referredTenantName: string;
  status: string;
  commission: number;
  createdAt: string;
}

interface PartnerPayout {
  id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED';
  paidAt: string | null;
  createdAt: string;
}

interface ReferralLink {
  url: string;
  code: string;
}

// ---------- Helpers ----------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ACTIVE':
    case 'PAID':
      return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
    case 'PENDING':
      return <Badge className="bg-yellow-100 text-yellow-800">{status}</Badge>;
    case 'SUSPENDED':
    case 'FAILED':
      return <Badge className="bg-red-100 text-red-800">{status}</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
  }
}

// ---------- Component ----------

export default function PartnerProgramPage() {
  return (
    <RequireRole minimum="OWNER">
      <PartnerProgramContent />
    </RequireRole>
  );
}

function PartnerProgramContent() {
  const router = useRouter();

  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
  const [referralLink, setReferralLink] = useState<ReferralLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isNotPartner, setIsNotPartner] = useState(false);

  // Application form
  const [businessType, setBusinessType] = useState('');
  const [website, setWebsite] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Copy button state
  const [copied, setCopied] = useState(false);

  // Fetch partner data
  const fetchPartnerData = useCallback(async () => {
    try {
      setError(null);
      const profileData = await apiClient.get<PartnerProfile>(
        '/api/partners/me',
      );
      setProfile(profileData);
      setIsNotPartner(false);

      const [referralsData, payoutsData, linkData] = await Promise.all([
        apiClient.get<PartnerReferral[]>('/api/partners/me/referrals'),
        apiClient.get<PartnerPayout[]>('/api/partners/me/payouts'),
        apiClient.get<ReferralLink>('/api/partners/me/link'),
      ]);

      setReferrals(Array.isArray(referralsData) ? referralsData : []);
      setPayouts(Array.isArray(payoutsData) ? payoutsData : []);
      setReferralLink(linkData);
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        setIsNotPartner(true);
      } else {
        setIsNotPartner(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPartnerData();
  }, [fetchPartnerData]);

  // Apply as partner
  const handleApply = async () => {
    setApplyError(null);

    if (!businessType) {
      setApplyError('Please select a business type');
      return;
    }

    setApplying(true);

    try {
      await apiClient.post('/api/partners/apply', {
        businessType,
        ...(website.trim() && { website: website.trim() }),
      });
      setSuccess('Application submitted successfully! We will review it shortly.');
      setTimeout(() => setSuccess(null), 6000);
      await fetchPartnerData();
    } catch (err) {
      setApplyError(
        err instanceof Error ? err.message : 'Failed to submit application',
      );
    } finally {
      setApplying(false);
    }
  };

  // Copy referral link
  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select input text
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
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Application Form (not a partner yet) ----------

  if (isNotPartner) {
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
            <h2 className="text-lg font-semibold">Partner Program</h2>
            <p className="text-sm text-muted-foreground">
              Join our referral program and earn commissions
            </p>
          </div>
        </div>

        {success && (
          <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Handshake className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">
                  Become a Partner
                </CardTitle>
                <CardDescription>
                  Refer businesses to SavSpot and earn commissions on their
                  subscriptions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {applyError && (
              <div role="alert" className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {applyError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business-type">Business Type</Label>
                <Select
                  value={businessType}
                  onValueChange={setBusinessType}
                >
                  <SelectTrigger id="business-type" className="w-full">
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGENCY">Agency</SelectItem>
                    <SelectItem value="CONSULTANT">Consultant</SelectItem>
                    <SelectItem value="RESELLER">Reseller</SelectItem>
                    <SelectItem value="INFLUENCER">Influencer</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>

              <Button
                onClick={handleApply}
                disabled={applying}
                className="w-full"
              >
                {applying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Apply to Partner Program'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Partner Dashboard ----------

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
          <h2 className="text-lg font-semibold">Partner Program</h2>
          <p className="text-sm text-muted-foreground">
            Manage your referrals and track earnings
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Status */}
      {profile && profile.status !== 'ACTIVE' && (
        <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-700">
          Your partner account is currently{' '}
          <span className="font-medium">{profile.status}</span>.
          {profile.status === 'PENDING' &&
            ' We are reviewing your application.'}
        </div>
      )}

      {/* Stats Cards */}
      {profile && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${profile.totalEarnings.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Earnings
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${profile.pendingPayout.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pending Payout
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {profile.commissionRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Commission Rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{referrals.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Total Referrals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referral Link */}
      {referralLink && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" />
              Your Referral Link
            </CardTitle>
            <CardDescription>
              Share this link to earn commissions on referred businesses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={referralLink.url}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Referral code: <span className="font-mono">{referralLink.code}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referrals</CardTitle>
          <CardDescription>
            {referrals.length === 0
              ? 'No referrals yet. Share your link to get started.'
              : `${referrals.length} referral${referrals.length !== 1 ? 's' : ''} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Share your referral link to start earning commissions.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referred Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium">
                      {referral.referredTenantName}
                    </TableCell>
                    <TableCell>{getStatusBadge(referral.status)}</TableCell>
                    <TableCell>${referral.commission.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(referral.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payouts</CardTitle>
          <CardDescription>
            {payouts.length === 0
              ? 'No payouts yet.'
              : `${payouts.length} payout${payouts.length !== 1 ? 's' : ''} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Payouts will appear here once you earn commissions.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Created Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">
                      ${payout.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(payout.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(payout.paidAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(payout.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
