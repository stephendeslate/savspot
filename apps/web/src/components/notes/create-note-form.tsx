'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button, Textarea } from '@savspot/ui';

interface CreateNoteFormProps {
  onSubmit: (body: string) => Promise<void>;
}

export function CreateNoteForm({ onSubmit }: CreateNoteFormProps) {
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(body.trim());
      setBody('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
      <Textarea
        placeholder="Add a note..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        disabled={isSubmitting}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!body.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Add Note
        </Button>
      </div>
    </form>
  );
}
