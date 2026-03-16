'use client';

import { useState, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowRight, Eye, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@savspot/ui';
import { FadeIn, StepTransition } from '@/components/ui/motion';
import { BookingProgress } from './booking-progress';
import { ServiceSelectionStep } from './service-selection-step';
import { DateTimePickerStep } from './date-time-picker-step';
import { GuestCountStep } from './guest-count-step';
import { QuestionnaireStep } from './questionnaire-step';
import { AddonSelectionStep } from './addon-selection-step';
import { PricingSummaryStep } from './pricing-summary-step';
import { PaymentStep } from './payment-step';
import { GuestInfoStep } from './guest-info-step';
import { ConfirmationStep } from './confirmation-step';
import type {
  BookingSession,
  BookingSessionData,
  TenantData,
  IntakeFormConfig,
} from './booking-types';
import { API_URL } from './booking-types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookingWizardProps {
  session: BookingSession;
  tenant: TenantData;
  onSessionUpdate: (session: BookingSession) => void;
  onExit: () => void;
  isPreview?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingWizard({
  session,
  tenant,
  onSessionUpdate,
  onExit,
  isPreview = false,
}: BookingWizardProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStepIndex = session.currentStep;
  const steps = session.resolvedSteps;
  const currentStepType = steps[currentStepIndex]?.type;
  const isFirstStep = currentStepIndex === 0;
  const isConfirmation = currentStepType === 'CONFIRMATION';

  // -------------------------------------------------------------------------
  // Step navigation
  // -------------------------------------------------------------------------

  const updateSession = useCallback(
    async (
      updates: {
        currentStep?: number;
        data?: Partial<BookingSessionData>;
        serviceId?: string;
      },
    ) => {
      setIsTransitioning(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_URL}/api/booking-sessions/${session.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          },
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to update booking session');
        }

        const json = (await res.json()) as { data: BookingSession };
        const updated = json.data;
        updated.data = updated.data ?? {};
        onSessionUpdate(updated);
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
        return null;
      } finally {
        setIsTransitioning(false);
      }
    },
    [session.id, onSessionUpdate],
  );

  const directionRef = useRef<'forward' | 'backward'>('forward');

  const goToNextStep = useCallback(
    async (dataUpdates?: Partial<BookingSessionData>) => {
      directionRef.current = 'forward';
      const nextStep = Math.min(currentStepIndex + 1, steps.length - 1);
      await updateSession({
        currentStep: nextStep,
        ...(dataUpdates ? { data: { ...session.data, ...dataUpdates } } : {}),
      });
    },
    [currentStepIndex, steps.length, updateSession, session.data],
  );

  const goToPrevStep = useCallback(async () => {
    if (isFirstStep) return;
    directionRef.current = 'backward';
    const prevStep = Math.max(currentStepIndex - 1, 0);
    await updateSession({ currentStep: prevStep });
  }, [isFirstStep, currentStepIndex, updateSession]);

  // -------------------------------------------------------------------------
  // Render step content
  // -------------------------------------------------------------------------

  function renderStep() {
    switch (currentStepType) {
      case 'SERVICE_SELECTION':
        return (
          <ServiceSelectionStep
            services={tenant.services}
            currency={tenant.currency}
            sessionId={session.id}
            onSelect={async (serviceData) => {
              await goToNextStep(serviceData);
            }}
          />
        );

      case 'DATE_TIME_PICKER':
        return (
          <DateTimePickerStep
            tenantId={tenant.id}
            timezone={tenant.timezone}
            sessionId={session.id}
            serviceId={session.data.serviceId ?? session.serviceId ?? ''}
            serviceDuration={session.data.serviceDuration ?? session.service?.durationMinutes ?? 60}
            onSlotReserved={async (slotData) => {
              await goToNextStep(slotData);
            }}
          />
        );

      case 'GUEST_COUNT':
        return (
          <GuestCountStep
            guestConfig={session.data.guestConfig ?? null}
            basePrice={session.data.servicePrice ?? 0}
            currency={session.data.serviceCurrency ?? tenant.currency}
            pricingModel={session.data.servicePricingModel ?? 'FIXED'}
            currentCount={session.data.guestCount}
            currentTierCounts={session.data.guestTierCounts}
            onContinue={async (guestData) => {
              await goToNextStep(guestData);
            }}
          />
        );

      case 'QUESTIONNAIRE': {
        const stepConfig = steps[currentStepIndex]?.config;
        const formConfig = stepConfig?.formConfig as IntakeFormConfig | undefined;
        if (!formConfig || !formConfig.fields?.length) {
          return (
            <div className="py-12 text-center text-muted-foreground">
              <p>No questionnaire configured.</p>
              <Button className="mt-4" onClick={() => goToNextStep()}>
                Continue
              </Button>
            </div>
          );
        }
        return (
          <QuestionnaireStep
            formConfig={formConfig}
            initialValues={
              session.data.questionnaireResponses as
                | Record<string, unknown>
                | undefined
            }
            onSubmit={async (responses) => {
              await goToNextStep({ questionnaireResponses: responses });
            }}
            onBack={goToPrevStep}
          />
        );
      }

      case 'ADD_ONS': {
        const selectedServiceId = session.data.serviceId ?? session.serviceId;
        const service = tenant.services.find((s) => s.id === selectedServiceId);
        const addons = service?.addons ?? [];
        return (
          <AddonSelectionStep
            addons={addons}
            selectedAddonIds={
              (session.data.selectedAddonIds as string[]) ?? []
            }
            onSubmit={async (selectedIds) => {
              const selectedAddons = addons.filter((a) =>
                selectedIds.includes(a.id),
              );
              await goToNextStep({
                selectedAddonIds: selectedIds,
                selectedAddons,
              });
            }}
            onBack={goToPrevStep}
            currencyCode={
              session.data.serviceCurrency ?? tenant.currency
            }
          />
        );
      }

      case 'PRICING_SUMMARY':
        return (
          <PricingSummaryStep
            sessionData={session.data}
            currency={session.data.serviceCurrency ?? tenant.currency}
            hasPaymentStep={steps.some((s) => s.type === 'PAYMENT')}
            onContinue={async (pricingData) => {
              await goToNextStep(pricingData);
            }}
          />
        );

      case 'CLIENT_INFO':
        return (
          <GuestInfoStep
            sessionData={session.data}
            onContinue={async (guestData) => {
              await goToNextStep(guestData);
            }}
          />
        );

      case 'PAYMENT':
        return (
          <PaymentStep
            sessionId={session.id}
            sessionData={session.data}
            currency={session.data.serviceCurrency ?? tenant.currency}
            onPaymentComplete={async () => {
              await goToNextStep();
            }}
            isPreview={isPreview}
          />
        );

      case 'CONFIRMATION':
        return (
          <ConfirmationStep
            sessionData={session.data}
            tenantName={tenant.name}
            tenantSlug={tenant.slug}
            timezone={tenant.timezone}
            onBookAnother={onExit}
            isPreview={isPreview}
          />
        );

      case 'VENUE_SELECTION':
        // Placeholder for venue selection (not in Phase 1 scope)
        return (
          <div className="py-12 text-center text-muted-foreground">
            <p>Venue selection is coming soon.</p>
            <Button className="mt-4" onClick={() => goToNextStep()}>
              Skip
            </Button>
          </div>
        );

      default:
        return (
          <div className="py-12 text-center text-muted-foreground">
            <p>Unknown step: {currentStepType}</p>
          </div>
        );
    }
  }

  // -------------------------------------------------------------------------
  // Determine whether to show navigation buttons
  // Some steps handle their own navigation (auto-advance on selection)
  // -------------------------------------------------------------------------

  const showBottomNav =
    currentStepType !== 'SERVICE_SELECTION' &&
    currentStepType !== 'DATE_TIME_PICKER' &&
    currentStepType !== 'GUEST_COUNT' &&
    currentStepType !== 'QUESTIONNAIRE' &&
    currentStepType !== 'ADD_ONS' &&
    currentStepType !== 'PRICING_SUMMARY' &&
    currentStepType !== 'CLIENT_INFO' &&
    currentStepType !== 'PAYMENT' &&
    currentStepType !== 'CONFIRMATION';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div>
      {/* Preview mode banner */}
      {isPreview && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <Eye className="h-4 w-4 shrink-0" />
          PREVIEW MODE — No real bookings, reservations, or payments will be created.
        </div>
      )}

      {/* Progress bar (hide on confirmation) */}
      {!isConfirmation && (
        <BookingProgress
          steps={steps}
          currentStepIndex={currentStepIndex}
        />
      )}

      {/* Error banner */}
      {error && (
        <FadeIn>
          <div role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                  <X className="h-3 w-3 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-medium text-destructive">Something went wrong</p>
                  <p className="mt-0.5 text-xs text-destructive/80">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 rounded-md p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label="Dismiss error"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Step content */}
      <div className="min-h-[300px]">
        <StepTransition
          stepKey={String(steps[currentStepIndex] ?? currentStepIndex)}
          direction={directionRef.current}
        >
          {renderStep()}
        </StepTransition>
      </div>

      {/* Bottom navigation (only for steps that don't self-navigate) */}
      {showBottomNav && (
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={goToPrevStep}
            disabled={isFirstStep || isTransitioning}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => goToNextStep()}
            disabled={isTransitioning}
          >
            {isTransitioning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
