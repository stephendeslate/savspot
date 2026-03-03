'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BookingStep } from './booking-types';

interface BookingProgressProps {
  steps: BookingStep[];
  currentStepIndex: number;
}

export function BookingProgress({
  steps,
  currentStepIndex,
}: BookingProgressProps) {
  return (
    <nav aria-label="Booking progress" className="mb-8">
      <ol className="flex items-center justify-center gap-0">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.type}
              className={cn('flex items-center', !isLast && 'flex-1')}
            >
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors sm:h-9 sm:w-9',
                    isCompleted &&
                      'border-primary bg-primary text-primary-foreground',
                    isCurrent &&
                      'border-primary bg-background text-primary shadow-sm',
                    !isCompleted &&
                      !isCurrent &&
                      'border-muted-foreground/30 bg-background text-muted-foreground/50',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {/* Label: visible on sm+ screens */}
                <span
                  className={cn(
                    'mt-1.5 hidden max-w-[80px] text-center text-[11px] leading-tight sm:block',
                    isCurrent && 'font-medium text-foreground',
                    isCompleted && 'text-muted-foreground',
                    !isCompleted &&
                      !isCurrent &&
                      'text-muted-foreground/50',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'mx-1 h-0.5 flex-1 sm:mx-2',
                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/20',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
