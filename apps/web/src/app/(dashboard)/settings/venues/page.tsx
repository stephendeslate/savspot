'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Separator } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  active: boolean;
  createdAt: string;
}

interface VenueStaff {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface VenueAnalytics {
  totalBookings: number;
  revenue: number;
  utilization: number;
  period: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ---------- Component ----------

export default function VenuesSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Expanded venue
  const [expandedVenueId, setExpandedVenueId] = useState<string | null>(null);

  // Staff state per venue
  const [venueStaff, setVenueStaff] = useState<Record<string, VenueStaff[]>>({});
  const [staffLoading, setStaffLoading] = useState<Record<string, boolean>>({});

  // Add staff dialog
  const [addStaffDialogOpen, setAddStaffDialogOpen] = useState(false);
  const [addStaffVenueId, setAddStaffVenueId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [addingStaff, setAddingStaff] = useState(false);

  // Analytics dialog
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [analyticsVenueId, setAnalyticsVenueId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<VenueAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Create venue dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [createCountry, setCreateCountry] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Removing staff
  const [removingStaffId, setRemovingStaffId] = useState<string | null>(null);

  // Fetch venues
  const fetchVenues = useCallback(async () => {
    if (!tenantId) return;

    try {
      setError(null);
      const data = await apiClient.get<Venue[]>(
        `/api/tenants/${tenantId}/venues`,
      );
      setVenues(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load venues',
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchVenues();
  }, [tenantId, fetchVenues]);

  // Fetch staff for a venue
  const fetchVenueStaff = useCallback(async (venueId: string) => {
    setStaffLoading((prev) => ({ ...prev, [venueId]: true }));
    try {
      const data = await apiClient.get<VenueStaff[]>(
        `/api/venues/${venueId}/staff`,
      );
      setVenueStaff((prev) => ({
        ...prev,
        [venueId]: Array.isArray(data) ? data : [],
      }));
    } catch {
      // Silently handle staff loading errors
    } finally {
      setStaffLoading((prev) => ({ ...prev, [venueId]: false }));
    }
  }, []);

  // Toggle venue expansion
  const toggleVenue = (venueId: string) => {
    if (expandedVenueId === venueId) {
      setExpandedVenueId(null);
    } else {
      setExpandedVenueId(venueId);
      if (!venueStaff[venueId]) {
        void fetchVenueStaff(venueId);
      }
    }
  };

  // Open add staff dialog
  const openAddStaffDialog = async (venueId: string) => {
    if (!tenantId) return;
    setAddStaffVenueId(venueId);
    setAddStaffDialogOpen(true);
    setTeamLoading(true);

    try {
      const data = await apiClient.get<TeamMember[]>(
        `/api/tenants/${tenantId}/team`,
      );
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch {
      setTeamMembers([]);
    } finally {
      setTeamLoading(false);
    }
  };

  // Add staff to venue
  const handleAddStaff = async (userId: string) => {
    if (!addStaffVenueId) return;
    setAddingStaff(true);

    try {
      await apiClient.post(`/api/venues/${addStaffVenueId}/staff`, { userId });
      setAddStaffDialogOpen(false);
      await fetchVenueStaff(addStaffVenueId);
      setSuccess('Staff member assigned successfully');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to assign staff member',
      );
    } finally {
      setAddingStaff(false);
    }
  };

  // Remove staff from venue
  const handleRemoveStaff = async (venueId: string, userId: string) => {
    setRemovingStaffId(userId);

    try {
      await apiClient.del(`/api/venues/${venueId}/staff/${userId}`);
      await fetchVenueStaff(venueId);
      setSuccess('Staff member removed successfully');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove staff member',
      );
    } finally {
      setRemovingStaffId(null);
    }
  };

  // Open analytics dialog
  const openAnalyticsDialog = async (venueId: string) => {
    setAnalyticsVenueId(venueId);
    setAnalyticsDialogOpen(true);
    setAnalyticsLoading(true);
    setAnalytics(null);

    try {
      const data = await apiClient.get<VenueAnalytics>(
        `/api/venues/${venueId}/analytics`,
      );
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Create venue
  const handleCreateVenue = async () => {
    if (!tenantId) return;
    setCreateError(null);

    const name = createName.trim();
    if (!name) {
      setCreateError('Venue name is required');
      return;
    }

    setCreating(true);

    try {
      await apiClient.post(`/api/tenants/${tenantId}/venues`, {
        name,
        address: createAddress.trim() || null,
        city: createCity.trim() || null,
        country: createCountry.trim() || null,
      });
      setCreateDialogOpen(false);
      setCreateName('');
      setCreateAddress('');
      setCreateCity('');
      setCreateCountry('');
      setSuccess('Venue created successfully');
      await fetchVenues();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create venue',
      );
    } finally {
      setCreating(false);
    }
  };

  // Get available team members (not already assigned to venue)
  const getAvailableMembers = (venueId: string): TeamMember[] => {
    const assignedIds = new Set(
      (venueStaff[venueId] ?? []).map((s) => s.userId),
    );
    return teamMembers.filter((m) => !assignedIds.has(m.id));
  };

  const analyticsVenue = venues.find((v) => v.id === analyticsVenueId);

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
                <Skeleton key={i} className="h-16 w-full" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(ROUTES.SETTINGS)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Venues</h2>
            <p className="text-sm text-muted-foreground">
              Manage your business locations and assigned staff
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Venue
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Venues List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Venues</CardTitle>
          <CardDescription>
            {venues.length === 0
              ? 'No venues yet. Add a venue to manage locations and staff.'
              : `${venues.length} venue${venues.length !== 1 ? 's' : ''} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {venues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Add your first venue to get started
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Venue
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {venues.map((venue) => (
                <div key={venue.id} className="rounded-lg border">
                  {/* Venue Header */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent/50"
                    onClick={() => toggleVenue(venue.id)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{venue.name}</h3>
                        <Badge
                          className={
                            venue.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {venue.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {(venue.city || venue.country) && (
                        <p className="text-sm text-muted-foreground">
                          {[venue.city, venue.country]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void openAnalyticsDialog(venue.id);
                        }}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      {expandedVenueId === venue.id ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Staff Section */}
                  {expandedVenueId === venue.id && (
                    <div className="border-t px-4 pb-4 pt-3">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Assigned Staff
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void openAddStaffDialog(venue.id)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Staff
                        </Button>
                      </div>

                      {staffLoading[venue.id] ? (
                        <div className="space-y-2">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                          ))}
                        </div>
                      ) : (venueStaff[venue.id] ?? []).length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          No staff assigned to this venue yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {(venueStaff[venue.id] ?? []).map((staff) => (
                            <div
                              key={staff.userId}
                              className="flex items-center justify-between rounded-md border p-3"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {staff.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {staff.email} &middot; {staff.role}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={removingStaffId === staff.userId}
                                onClick={() =>
                                  void handleRemoveStaff(
                                    venue.id,
                                    staff.userId,
                                  )
                                }
                              >
                                {removingStaffId === staff.userId ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Venue Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Venue</DialogTitle>
            <DialogDescription>
              Add a new location for your business
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {createError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venue-name">Venue Name</Label>
              <Input
                id="venue-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Downtown Studio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue-address">Address (optional)</Label>
              <Input
                id="venue-address"
                value={createAddress}
                onChange={(e) => setCreateAddress(e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue-city">City (optional)</Label>
                <Input
                  id="venue-city"
                  value={createCity}
                  onChange={(e) => setCreateCity(e.target.value)}
                  placeholder="New York"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-country">Country (optional)</Label>
                <Input
                  id="venue-country"
                  value={createCountry}
                  onChange={(e) => setCreateCountry(e.target.value)}
                  placeholder="US"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateVenue} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Venue'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Staff Dialog */}
      <Dialog open={addStaffDialogOpen} onOpenChange={setAddStaffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff to Venue</DialogTitle>
            <DialogDescription>
              Select a team member to assign to this venue
            </DialogDescription>
          </DialogHeader>

          {teamLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : addStaffVenueId &&
            getAvailableMembers(addStaffVenueId).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              All team members are already assigned to this venue.
            </p>
          ) : (
            <div className="space-y-2">
              {addStaffVenueId &&
                getAvailableMembers(addStaffVenueId).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent/50"
                    disabled={addingStaff}
                    onClick={() => void handleAddStaff(member.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email} &middot; {member.role}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddStaffDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Venue Analytics{analyticsVenue ? ` - ${analyticsVenue.name}` : ''}
            </DialogTitle>
            <DialogDescription>
              Performance metrics for this venue
            </DialogDescription>
          </DialogHeader>

          {analyticsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : analytics ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Period: {analytics.period}
              </p>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold">
                    {analytics.totalBookings}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Bookings
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold">
                    ${analytics.revenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold">
                    {(analytics.utilization * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Utilization</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No analytics data available for this venue.
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAnalyticsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
