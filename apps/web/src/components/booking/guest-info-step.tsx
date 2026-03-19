'use client';

import { useState } from 'react';
import { User, Mail, Phone, ArrowRight } from 'lucide-react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@savspot/ui';
import type { BookingSessionData } from './booking-types';

interface GuestInfoStepProps {
  sessionData: BookingSessionData;
  onContinue: (data: Partial<BookingSessionData>) => Promise<void>;
}

export function GuestInfoStep({ sessionData, onContinue }: GuestInfoStepProps) {
  const [name, setName] = useState(sessionData.guestName ?? '');
  const [email, setEmail] = useState(sessionData.guestEmail ?? '');
  const [phone, setPhone] = useState(sessionData.guestPhone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors['name'] = 'Name is required';
    }

    if (!email.trim()) {
      newErrors['email'] = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors['email'] = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onContinue({
        guestName: name.trim(),
        guestEmail: email.trim().toLowerCase(),
        guestPhone: phone.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Details</CardTitle>
        <CardDescription>
          Please provide your contact information to complete the booking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name field */}
        <div className="space-y-2">
          <Label htmlFor="guest-name">
            Name <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="guest-name"
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors['name']) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              className={`pl-10 ${errors['name'] ? 'border-destructive' : ''}`}
              aria-required="true"
              aria-invalid={!!errors['name']}
              aria-describedby={errors['name'] ? 'guest-name-error' : undefined}
            />
          </div>
          {errors['name'] && (
            <p id="guest-name-error" role="alert" className="text-sm text-destructive">{errors['name']}</p>
          )}
        </div>

        {/* Email field */}
        <div className="space-y-2">
          <Label htmlFor="guest-email">
            Email <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="guest-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors['email']) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              className={`pl-10 ${errors['email'] ? 'border-destructive' : ''}`}
              aria-required="true"
              aria-invalid={!!errors['email']}
              aria-describedby={errors['email'] ? 'guest-email-error' : undefined}
            />
          </div>
          {errors['email'] && (
            <p id="guest-email-error" role="alert" className="text-sm text-destructive">{errors['email']}</p>
          )}
        </div>

        {/* Phone field */}
        <div className="space-y-2">
          <Label htmlFor="guest-phone">Phone (optional)</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="guest-phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          By continuing, you agree to our terms of service and privacy policy.
          We&apos;ll send booking confirmation to your email.
        </p>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: 'var(--brand-color)',
            borderColor: 'var(--brand-color)',
          }}
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Saving...
            </span>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
