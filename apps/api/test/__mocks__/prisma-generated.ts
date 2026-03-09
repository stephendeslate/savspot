/**
 * Mock for ../../../../prisma/generated/prisma
 *
 * Provides the Prisma namespace, enums, and PrismaClient stub so that
 * unit tests can run without `pnpm db:generate`.
 */

// Prisma namespace used in services for JSON types and input types
export const Prisma = {
  JsonNull: 'DbNull' as const,
  DbNull: 'DbNull' as const,
  InputJsonValue: undefined as unknown,
  // Needed for where-input type references
  ModelName: {} as Record<string, string>,
};

// Enums referenced directly in service code
export enum TenantRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export enum NoteEntityType {
  BOOKING = 'BOOKING',
  CLIENT = 'CLIENT',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export enum ActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  API_KEY = 'API_KEY',
}

export enum FeedbackType {
  BUG = 'BUG',
  FEATURE = 'FEATURE',
  GENERAL = 'GENERAL',
}

export enum TicketStatus {
  NEW = 'NEW',
  AI_INVESTIGATING = 'AI_INVESTIGATING',
  AI_RESOLVED = 'AI_RESOLVED',
  NEEDS_MANUAL_REVIEW = 'NEEDS_MANUAL_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum AIResolutionType {
  FAQ_MATCH = 'FAQ_MATCH',
  CONFIGURATION_GUIDANCE = 'CONFIGURATION_GUIDANCE',
  KNOWN_WORKAROUND = 'KNOWN_WORKAROUND',
  CODE_FIX_PREPARED = 'CODE_FIX_PREPARED',
}

export enum ResolvedBy {
  AI = 'AI',
  DEVELOPER = 'DEVELOPER',
}

export enum TicketCategory {
  BUG = 'BUG',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  QUESTION = 'QUESTION',
  ACCOUNT_ISSUE = 'ACCOUNT_ISSUE',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  OTHER = 'OTHER',
}

export enum TicketSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum BookingSource {
  DIRECT = 'DIRECT',
  DIRECTORY = 'DIRECTORY',
  API = 'API',
  WIDGET = 'WIDGET',
  REFERRAL = 'REFERRAL',
  WALK_IN = 'WALK_IN',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum DataRequestType {
  EXPORT = 'EXPORT',
  DELETION = 'DELETION',
  TENANT_EXPORT = 'TENANT_EXPORT',
}

export enum DataRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ConsentPurpose {
  DATA_PROCESSING = 'DATA_PROCESSING',
  MARKETING = 'MARKETING',
  ANALYTICS = 'ANALYTICS',
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING',
  FOLLOW_UP_EMAILS = 'FOLLOW_UP_EMAILS',
}

export enum WorkflowTriggerEvent {
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_COMPLETED = 'BOOKING_COMPLETED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
}

// PrismaClient stub
export class PrismaClient {
  $connect() {
    return Promise.resolve();
  }
  $disconnect() {
    return Promise.resolve();
  }
}
