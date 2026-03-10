'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';

const CATEGORIES = [
  { value: 'BUG', label: 'Bug Report' },
  { value: 'FEATURE_REQUEST', label: 'Feature Request' },
  { value: 'QUESTION', label: 'Question' },
  { value: 'ACCOUNT_ISSUE', label: 'Account Issue' },
  { value: 'PAYMENT_ISSUE', label: 'Payment Issue' },
  { value: 'OTHER', label: 'Other' },
] as const;

interface TicketFormProps {
  onSuccess?: () => void;
}

export function TicketForm({ onSuccess }: TicketFormProps) {
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid = category.trim() !== '' && subject.trim() !== '' && description.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post('/api/support/tickets', {
        category,
        subject: subject.trim(),
        body: description.trim(),
        ...(screenshotUrl.trim() ? { screenshotUrl: screenshotUrl.trim() } : {}),
      });
      setSuccess(true);
      setCategory('');
      setSubject('');
      setDescription('');
      setScreenshotUrl('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          Your support ticket has been submitted successfully. We will get back to you soon.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSuccess(false)}
        >
          Submit Another Ticket
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="ticket-category">Category</Label>
        <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
          <SelectTrigger id="ticket-category" className="w-full">
            <SelectValue placeholder="Select a category..." />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticket-subject">Subject</Label>
        <Input
          id="ticket-subject"
          placeholder="Brief summary of your issue"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticket-description">Description</Label>
        <Textarea
          id="ticket-description"
          placeholder="Describe your issue in detail..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticket-screenshot">Screenshot URL (optional)</Label>
        <Input
          id="ticket-screenshot"
          placeholder="https://..."
          value={screenshotUrl}
          onChange={(e) => setScreenshotUrl(e.target.value)}
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
            Submitting...
          </>
        ) : (
          'Submit Ticket'
        )}
      </Button>
    </form>
  );
}
