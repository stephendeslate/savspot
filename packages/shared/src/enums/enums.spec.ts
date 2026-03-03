import { describe, it, expect } from 'vitest';
import {
  // Tenant
  BusinessCategory,
  PaymentProviderType,
  SubscriptionTier,
  TenantStatus,
  // User
  PlatformRole,
  TenantRole,
  InvitationStatus,
  // Booking
  BookingStatus,
  BookingSource,
  BookingSessionStatus,
  CheckInStatus,
  CancellationReason,
  DateReservationStatus,
  StateTransitionTrigger,
  // Payment
  PaymentStatus,
  PaymentType,
  InvoiceStatus,
  DisputeReason,
  DisputeStatus,
  // Service
  PricingModel,
  PricingUnit,
  ConfirmationMode,
  // Communication
  CommunicationChannel,
  CommunicationStatus,
  NotificationCategory,
  NotificationPriority,
  // Workflow
  WorkflowTriggerEvent,
  WorkflowActionType,
  ReminderType,
  ReminderStatus,
  // Contract
  ContractStatus,
  SignatureType,
  SignerRole,
  // Quote
  QuoteStatus,
  // Support
  TicketCategory,
  TicketSeverity,
  TicketStatus,
  FeedbackType,
  FeedbackStatus,
  // Import
  SourcePlatform,
  ImportType,
  ImportJobStatus,
  ImportRecordStatus,
  // Security
  AuditAction,
  ActorType,
  DataRequestType,
  DataRequestStatus,
  CalendarProvider,
  SyncDirection,
  CalendarConnectionStatus,
  CalendarEventDirection,
  MessageThreadStatus,
} from './index.js';

// ---------------------------------------------------------------------------
// Helper: Validates that a Zod enum schema parses valid values and rejects
// invalid ones. Each enum is a z.enum([...]) — they have .options for the list
// of allowed values, .parse() that throws on invalid, .safeParse() for result.
// ---------------------------------------------------------------------------

function testZodEnum(name: string, schema: { options: readonly string[]; safeParse: (v: unknown) => { success: boolean } }) {
  describe(name, () => {
    it('should have at least one option', () => {
      expect(schema.options.length).toBeGreaterThan(0);
    });

    it('should parse all its own options successfully', () => {
      for (const value of schema.options) {
        const result = schema.safeParse(value);
        expect(result.success, `Expected "${value}" to be valid for ${name}`).toBe(true);
      }
    });

    it('should reject an invalid value', () => {
      const result = schema.safeParse('DEFINITELY_NOT_A_VALID_VALUE_12345');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = schema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = schema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should reject numbers', () => {
      const result = schema.safeParse(42);
      expect(result.success).toBe(false);
    });

    it('should be case-sensitive (lowercase variant rejected)', () => {
      const firstOption = schema.options[0]!;
      const lowered = firstOption.toLowerCase();
      // Only test if lowering actually changes the string (avoids false positive)
      if (lowered !== firstOption) {
        const result = schema.safeParse(lowered);
        expect(result.success).toBe(false);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Tenant enums
// ---------------------------------------------------------------------------
describe('Tenant Enums', () => {
  testZodEnum('BusinessCategory', BusinessCategory);

  it('BusinessCategory should include all 6 spec categories', () => {
    expect(BusinessCategory.options).toEqual(
      expect.arrayContaining(['VENUE', 'SALON', 'STUDIO', 'FITNESS', 'PROFESSIONAL', 'OTHER']),
    );
    expect(BusinessCategory.options).toHaveLength(6);
  });

  testZodEnum('PaymentProviderType', PaymentProviderType);
  testZodEnum('SubscriptionTier', SubscriptionTier);

  it('SubscriptionTier should have FREE as an option', () => {
    expect(SubscriptionTier.options).toContain('FREE');
  });

  testZodEnum('TenantStatus', TenantStatus);

  it('TenantStatus should have ACTIVE and SUSPENDED', () => {
    expect(TenantStatus.options).toContain('ACTIVE');
    expect(TenantStatus.options).toContain('SUSPENDED');
  });
});

// ---------------------------------------------------------------------------
// User enums
// ---------------------------------------------------------------------------
describe('User Enums', () => {
  testZodEnum('PlatformRole', PlatformRole);

  it('PlatformRole should distinguish platform admin from regular user', () => {
    expect(PlatformRole.options).toContain('PLATFORM_ADMIN');
    expect(PlatformRole.options).toContain('USER');
    expect(PlatformRole.options).toHaveLength(2);
  });

  testZodEnum('TenantRole', TenantRole);

  it('TenantRole should have OWNER, ADMIN, STAFF', () => {
    expect(TenantRole.options).toEqual(expect.arrayContaining(['OWNER', 'ADMIN', 'STAFF']));
    expect(TenantRole.options).toHaveLength(3);
  });

  testZodEnum('InvitationStatus', InvitationStatus);
});

// ---------------------------------------------------------------------------
// Booking enums
// ---------------------------------------------------------------------------
describe('Booking Enums', () => {
  testZodEnum('BookingStatus', BookingStatus);

  it('BookingStatus should include complete lifecycle states', () => {
    expect(BookingStatus.options).toEqual(
      expect.arrayContaining([
        'PENDING',
        'CONFIRMED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW',
      ]),
    );
  });

  testZodEnum('BookingSource', BookingSource);

  it('BookingSource should include WALK_IN for admin quick-add', () => {
    expect(BookingSource.options).toContain('WALK_IN');
  });

  testZodEnum('BookingSessionStatus', BookingSessionStatus);
  testZodEnum('CheckInStatus', CheckInStatus);
  testZodEnum('CancellationReason', CancellationReason);
  testZodEnum('DateReservationStatus', DateReservationStatus);
  testZodEnum('StateTransitionTrigger', StateTransitionTrigger);
});

// ---------------------------------------------------------------------------
// Payment enums
// ---------------------------------------------------------------------------
describe('Payment Enums', () => {
  testZodEnum('PaymentStatus', PaymentStatus);

  it('PaymentStatus should track full payment lifecycle including disputes', () => {
    expect(PaymentStatus.options).toEqual(
      expect.arrayContaining(['CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'DISPUTED', 'REFUNDED']),
    );
  });

  testZodEnum('PaymentType', PaymentType);

  it('PaymentType should include DEPOSIT for partial payments', () => {
    expect(PaymentType.options).toContain('DEPOSIT');
    expect(PaymentType.options).toContain('FULL_PAYMENT');
  });

  testZodEnum('InvoiceStatus', InvoiceStatus);
  testZodEnum('DisputeReason', DisputeReason);
  testZodEnum('DisputeStatus', DisputeStatus);
});

// ---------------------------------------------------------------------------
// Service enums
// ---------------------------------------------------------------------------
describe('Service Enums', () => {
  testZodEnum('PricingModel', PricingModel);

  it('PricingModel should support all spec pricing modes', () => {
    expect(PricingModel.options).toEqual(
      expect.arrayContaining(['FIXED', 'HOURLY', 'TIERED', 'CUSTOM']),
    );
  });

  testZodEnum('PricingUnit', PricingUnit);
  testZodEnum('ConfirmationMode', ConfirmationMode);

  it('ConfirmationMode should have AUTO_CONFIRM and MANUAL_APPROVAL', () => {
    expect(ConfirmationMode.options).toContain('AUTO_CONFIRM');
    expect(ConfirmationMode.options).toContain('MANUAL_APPROVAL');
  });
});

// ---------------------------------------------------------------------------
// Communication enums
// ---------------------------------------------------------------------------
describe('Communication Enums', () => {
  testZodEnum('CommunicationChannel', CommunicationChannel);

  it('CommunicationChannel should include EMAIL, SMS, IN_APP', () => {
    expect(CommunicationChannel.options).toEqual(
      expect.arrayContaining(['EMAIL', 'SMS', 'IN_APP']),
    );
  });

  testZodEnum('CommunicationStatus', CommunicationStatus);

  it('CommunicationStatus should track delivery lifecycle', () => {
    expect(CommunicationStatus.options).toEqual(
      expect.arrayContaining(['QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED']),
    );
  });

  testZodEnum('NotificationCategory', NotificationCategory);
  testZodEnum('NotificationPriority', NotificationPriority);
});

// ---------------------------------------------------------------------------
// Workflow enums
// ---------------------------------------------------------------------------
describe('Workflow Enums', () => {
  testZodEnum('WorkflowTriggerEvent', WorkflowTriggerEvent);

  it('WorkflowTriggerEvent should include booking lifecycle triggers', () => {
    expect(WorkflowTriggerEvent.options).toEqual(
      expect.arrayContaining([
        'BOOKING_CREATED',
        'BOOKING_CONFIRMED',
        'BOOKING_CANCELLED',
        'BOOKING_COMPLETED',
      ]),
    );
  });

  testZodEnum('WorkflowActionType', WorkflowActionType);
  testZodEnum('ReminderType', ReminderType);
  testZodEnum('ReminderStatus', ReminderStatus);
});

// ---------------------------------------------------------------------------
// Contract enums
// ---------------------------------------------------------------------------
describe('Contract Enums', () => {
  testZodEnum('ContractStatus', ContractStatus);

  it('ContractStatus should support complete signing lifecycle', () => {
    expect(ContractStatus.options).toEqual(
      expect.arrayContaining(['DRAFT', 'SENT', 'SIGNED', 'EXPIRED', 'VOID']),
    );
  });

  testZodEnum('SignatureType', SignatureType);
  testZodEnum('SignerRole', SignerRole);
});

// ---------------------------------------------------------------------------
// Quote enums
// ---------------------------------------------------------------------------
describe('Quote Enums', () => {
  testZodEnum('QuoteStatus', QuoteStatus);

  it('QuoteStatus should include acceptance and rejection', () => {
    expect(QuoteStatus.options).toEqual(
      expect.arrayContaining(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
    );
  });
});

// ---------------------------------------------------------------------------
// Support enums
// ---------------------------------------------------------------------------
describe('Support Enums', () => {
  testZodEnum('TicketCategory', TicketCategory);
  testZodEnum('TicketSeverity', TicketSeverity);
  testZodEnum('TicketStatus', TicketStatus);

  it('TicketStatus should include AI triage states', () => {
    expect(TicketStatus.options).toContain('AI_INVESTIGATING');
    expect(TicketStatus.options).toContain('AI_RESOLVED');
    expect(TicketStatus.options).toContain('NEEDS_MANUAL_REVIEW');
  });

  testZodEnum('FeedbackType', FeedbackType);
  testZodEnum('FeedbackStatus', FeedbackStatus);
});

// ---------------------------------------------------------------------------
// Import enums
// ---------------------------------------------------------------------------
describe('Import Enums', () => {
  testZodEnum('SourcePlatform', SourcePlatform);

  it('SourcePlatform should include competitor platforms for data import', () => {
    expect(SourcePlatform.options).toEqual(
      expect.arrayContaining(['BOOKSY', 'FRESHA', 'SQUARE', 'VAGARO', 'MINDBODY']),
    );
  });

  testZodEnum('ImportType', ImportType);
  testZodEnum('ImportJobStatus', ImportJobStatus);
  testZodEnum('ImportRecordStatus', ImportRecordStatus);
});

// ---------------------------------------------------------------------------
// Security enums
// ---------------------------------------------------------------------------
describe('Security Enums', () => {
  testZodEnum('AuditAction', AuditAction);

  it('AuditAction should include CRUD and auth operations', () => {
    expect(AuditAction.options).toEqual(
      expect.arrayContaining(['CREATE', 'UPDATE', 'DELETE', 'READ', 'LOGIN', 'LOGOUT']),
    );
  });

  testZodEnum('ActorType', ActorType);
  testZodEnum('DataRequestType', DataRequestType);
  testZodEnum('DataRequestStatus', DataRequestStatus);
  testZodEnum('CalendarProvider', CalendarProvider);
  testZodEnum('SyncDirection', SyncDirection);
  testZodEnum('CalendarConnectionStatus', CalendarConnectionStatus);
  testZodEnum('CalendarEventDirection', CalendarEventDirection);
  testZodEnum('MessageThreadStatus', MessageThreadStatus);
});
