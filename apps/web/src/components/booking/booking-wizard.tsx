'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingWizard({
  session,
  tenant,
  onSessionUpdate,
  onExit,
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
        onSessionUpdate(json.data);
        return json.data;
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

  const goToNextStep = useCallback(
    async (dataUpdates?: Partial<BookingSessionData>) => {
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
            serviceId={session.data.serviceId ?? ''}
            serviceDuration={session.data.serviceDuration ?? 60}
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
        const selectedServiceId = session.data.serviceId;
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
      {/* Progress bar (hide on confirmation) */}
      {!isConfirmation && (
        <BookingProgress
          steps={steps}
          currentStepIndex={currentStepIndex}
        />
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[300px]">{renderStep()}</div>

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
