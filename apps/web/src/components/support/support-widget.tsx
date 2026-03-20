'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Separator } from '@savspot/ui';
import { ROUTES } from '@/lib/constants';
import { TicketForm } from './ticket-form';

export function SupportWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
        aria-label="Open support"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>
              Describe your issue and we will get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <Link
            href={ROUTES.HELP}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
          >
            <BookOpen className="h-4 w-4 text-primary" />
            Browse Help Center
          </Link>
          <Separator />
          <TicketForm onSuccess={() => {
            // Keep dialog open so user sees the success message
          }} />
        </DialogContent>
      </Dialog>
    </>
  );
}
