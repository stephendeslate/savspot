'use client';

import { useState } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';

const FEEDBACK_TYPES = [
  { value: 'FEATURE_REQUEST', label: 'Feature Request' },
  { value: 'UX_FRICTION', label: 'UX Friction' },
  { value: 'COMPARISON_NOTE', label: 'Comparison Note' },
  { value: 'GENERAL', label: 'General' },
] as const;

export function FeedbackWidget() {
  const { tenantId } = useTenant();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid = type.trim() !== '' && body.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !tenantId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const contextPage = typeof window !== 'undefined' ? window.location.pathname : undefined;

      await apiClient.post(`/api/tenants/${tenantId}/feedback`, {
        type,
        body: body.trim(),
        ...(contextPage ? { contextPage } : {}),
      });

      setSuccess(true);
      setType('');
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Reset state when closing
      setSuccess(false);
      setError(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-20 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all',
          'bg-amber-500 text-white hover:bg-amber-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
        aria-label="Send feedback"
      >
        <Lightbulb className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
            <DialogDescription>
              Help us improve SavSpot. Share bugs, feature requests, or general feedback.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="space-y-4 text-center">
              <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
                Thank you for your feedback! We appreciate your input.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuccess(false)}
              >
                Send More Feedback
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {error && (
                <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="feedback-type">Type</Label>
                <Select value={type} onValueChange={setType} disabled={isSubmitting}>
                  <SelectTrigger id="feedback-type" className="w-full">
                    <SelectValue placeholder="Select a type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_TYPES.map((ft) => (
                      <SelectItem key={ft.value} value={ft.value}>
                        {ft.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-body">Your Feedback</Label>
                <Textarea
                  id="feedback-body"
                  placeholder="Tell us what you think..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  disabled={isSubmitting}
                />
              </div>

              <Button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Feedback'
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
