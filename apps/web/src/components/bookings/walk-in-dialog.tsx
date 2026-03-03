'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { addMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiClient, ApiError } from '@/lib/api-client';

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
}

interface WalkInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSuccess: () => void;
}

export function WalkInDialog({
  open,
  onOpenChange,
  tenantId,
  onSuccess,
}: WalkInDialogProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(
    format(new Date(), 'HH:mm'),
  );
  const [endTime, setEndTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch services on mount
  useEffect(() => {
    if (!tenantId || !open) return;

    const fetchServices = async () => {
      setServicesLoading(true);
      try {
        const data = await apiClient.get<Service[]>(
          `/api/tenants/${tenantId}/services`,
        );
        setServices(data);
      } catch {
        setError('Failed to load services');
      } finally {
        setServicesLoading(false);
      }
    };

    void fetchServices();
  }, [tenantId, open]);

  // Auto-calculate end time when service or start time changes
  useEffect(() => {
    if (!serviceId || !startTime || !date) return;

    const selectedService = services.find((s) => s.id === serviceId);
    if (!selectedService) return;

    try {
      const dateTimeStr = `${date}T${startTime}`;
      const start = new Date(dateTimeStr);
      const end = addMinutes(start, selectedService.durationMinutes);
      setEndTime(format(end, 'HH:mm'));
    } catch {
      // Invalid date, ignore
    }
  }, [serviceId, startTime, date, services]);

  const resetForm = () => {
    setServiceId('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime(format(new Date(), 'HH:mm'));
    setEndTime('');
    setClientName('');
    setClientEmail('');
    setNotes('');
    setError(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceId) {
      setError('Please select a service');
      return;
    }

    if (!date || !startTime || !endTime) {
      setError('Please fill in date and time');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const startDateTime = new Date(`${date}T${startTime}`).toISOString();
      const endDateTime = new Date(`${date}T${endTime}`).toISOString();

      await apiClient.post(
        `/api/tenants/${tenantId}/bookings/walk-in`,
        {
          serviceId,
          startTime: startDateTime,
          endTime: endDateTime,
          ...(clientName && { clientName }),
          ...(clientEmail && { clientEmail }),
          ...(notes && { notes }),
        },
      );

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          'This time slot conflicts with an existing booking. Please choose a different time.',
        );
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to create walk-in booking',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Walk-in Booking</DialogTitle>
          <DialogDescription>
            Quickly add a booking for a walk-in client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="walk-in-service">Service *</Label>
            <Select
              id="walk-in-service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              disabled={servicesLoading}
            >
              <option value="">
                {servicesLoading ? 'Loading services...' : 'Select a service'}
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.durationMinutes}min)
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="walk-in-date">Date *</Label>
              <Input
                id="walk-in-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walk-in-start">Start Time *</Label>
              <Input
                id="walk-in-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walk-in-end">End Time *</Label>
              <Input
                id="walk-in-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="walk-in-name">Client Name</Label>
              <Input
                id="walk-in-name"
                type="text"
                placeholder="Optional"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walk-in-email">Client Email</Label>
              <Input
                id="walk-in-email"
                type="email"
                placeholder="Optional"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="walk-in-notes">Notes</Label>
            <Textarea
              id="walk-in-notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || servicesLoading}>
              {isSubmitting ? 'Creating...' : 'Create Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
