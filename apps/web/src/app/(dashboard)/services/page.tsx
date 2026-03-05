'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, Pencil, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  currency: string;
  isActive: boolean;
}

export default function ServicesPage() {
  const router = useRouter();
  const { tenantId } = useTenant();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    const fetchServices = async () => {
      try {
        const data = await apiClient.get<Service[]>(
          `/api/tenants/${tenantId}/services`,
        );
        setServices(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load services',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchServices();
  }, [tenantId]);

  const handleDeactivate = async (serviceId: string) => {
    if (!tenantId) return;
    try {
      await apiClient.patch(`/api/tenants/${tenantId}/services/${serviceId}`, {
        isActive: false,
      });
      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceId ? { ...s, isActive: false } : s,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to deactivate service',
      );
    }
  };

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
    <div className="space-y-6">
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
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">
                      {service.name}
                    </TableCell>
                    <TableCell>
                      {formatDuration(service.durationMinutes)}
                    </TableCell>
                    <TableCell>
                      {formatPrice(service.basePrice, service.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={service.isActive ? 'default' : 'secondary'}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                            onClick={() => handleDeactivate(service.id)}
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
    </div>
  );
}
