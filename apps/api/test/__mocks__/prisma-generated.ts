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
