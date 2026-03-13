'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, Pencil, Ban } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, Badge, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Skeleton } from '@savspot/ui';
import { ROUTES } from '@/lib/constants';
import { useServices, useDeactivateService } from '@/hooks/use-api';

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  currency: string;
  isActive: boolean;
  pricingModel: string;
  guestConfig: Record<string, unknown> | null;
  depositConfig: Record<string, unknown> | null;
  intakeFormConfig: Record<string, unknown> | null;
}

export default function ServicesPage() {
  const router = useRouter();
  const { data: services = [], isLoading, error: queryError } = useServices() as {
    data: Service[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  const deactivateMutation = useDeactivateService();
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDeactivate = (serviceId: string, serviceName: string) => {
    setDeactivateTarget({ id: serviceId, name: serviceName });
  };

  const confirmDeactivate = () => {
    if (deactivateTarget) {
      deactivateMutation.mutate(deactivateTarget.id);
      setDeactivateTarget(null);
    }
  };

  const error = queryError?.message ?? deactivateMutation.error?.message ?? null;

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(Number(amount));
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
  };

  const pricingModelLabels: Record<string, string> = {
    HOURLY: 'Hourly',
    TIERED: 'Tiered',
    CUSTOM: 'Custom',
  };

  const getComplexityBadges = (service: Service) => {
    const badges: string[] = [];
    if (service.pricingModel !== 'FIXED' && pricingModelLabels[service.pricingModel]) {
      badges.push(pricingModelLabels[service.pricingModel]!);
    }
    if (service.guestConfig !== null) badges.push('Groups');
    if (service.depositConfig !== null) badges.push('Deposit');
    if (service.intakeFormConfig !== null) badges.push('Form');
    return badges;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Services</h2>
          <p className="text-sm text-muted-foreground">
            Manage the services you offer to clients
          </p>
        </div>
        <Button onClick={() => router.push(ROUTES.SERVICES_NEW)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Services</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No services yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create your first service to start accepting bookings from
                clients.
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push(ROUTES.SERVICES_NEW)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create your first service
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="w-[80px] sm:w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{service.name}</div>
                        {getComplexityBadges(service).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {getComplexityBadges(service).map((badge) => (
                              <span
                                key={badge}
                                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {formatDuration(service.durationMinutes)}
                          {!service.isActive && ' · Inactive'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatDuration(service.durationMinutes)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatPrice(service.basePrice, service.currency)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={service.isActive ? 'default' : 'secondary'}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/services/${service.id}`)
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {service.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(service.id, service.name)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate &quot;{deactivateTarget?.name}&quot;? This will hide it from booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
