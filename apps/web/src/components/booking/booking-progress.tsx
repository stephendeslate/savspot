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
      {/* Segmented progress bar */}
      <div className="mb-3 flex gap-1.5" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label={`Step ${currentStepIndex + 1} of ${steps.length}: ${steps[currentStepIndex]?.label ?? ''}`}>
        {steps.map((step, index) => (
          <div
            key={step.type}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-500',
              index < currentStepIndex && 'bg-primary',
              index === currentStepIndex && 'bg-primary/60',
              index > currentStepIndex && 'bg-border',
            )}
          />
        ))}
      </div>

      {/* Mobile: "Step X of Y" text */}
      <p className="mb-3 text-center text-xs text-muted-foreground sm:hidden">
        Step {currentStepIndex + 1} of {steps.length}
        {steps[currentStepIndex]?.label && ` — ${steps[currentStepIndex].label}`}
      </p>

      {/* Desktop: step circles and labels */}
      <ol className="hidden items-center justify-center gap-0 sm:flex">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.type}
              className={cn('flex items-center', !isLast && 'flex-1')}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300',
                    isCompleted &&
                      'border-primary bg-primary text-primary-foreground',
                    isCurrent &&
                      'border-primary bg-background text-primary shadow-[0_0_0_3px_oklch(from_var(--primary)_l_c_h/0.15)]',
                    !isCompleted &&
                      !isCurrent &&
                      'border-muted-foreground/30 bg-background text-muted-foreground/50',
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-1.5 max-w-[80px] text-center text-[11px] leading-tight',
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
                <div className="mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-muted-foreground/20 sm:mx-2">
                  <div
                    className={cn(
                      'h-full rounded-full bg-primary transition-all duration-500',
                      isCompleted ? 'w-full' : isCurrent ? 'w-1/2' : 'w-0',
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
